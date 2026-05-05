import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { getStripe } from '@/lib/stripe/client';

function checkoutCustomerId(session: Stripe.Checkout.Session): string | null {
  const c = session.customer;
  if (typeof c === 'string') return c;
  if (!c || typeof c !== 'object') return null;
  if ('deleted' in c && (c as Stripe.DeletedCustomer).deleted) return null;
  return (c as Stripe.Customer).id ?? null;
}

function checkoutSubscriptionId(session: Stripe.Checkout.Session): string | null {
  const s = session.subscription;
  if (typeof s === 'string') return s;
  if (!s || typeof s !== 'object') return null;
  return (s as Stripe.Subscription).id ?? null;
}

async function applySubscriptionActive(sub: Stripe.Subscription) {
  const userId = sub.metadata?.userId;
  if (!userId) return;
  const status = sub.status;
  if (status !== 'active' && status !== 'trialing') return;
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null;
  try {
    await db
      .update(users)
      .set({
        isPro: true,
        proPlan: 'monthly',
        stripeSubscriptionId: sub.id,
        ...(customerId ? { stripeCustomerId: customerId } : {}),
      })
      .where(eq(users.id, userId));
  } catch (err) {
    console.warn('[stripe webhook] subscription sync failed; applying is_pro only (run DB migration)', err);
    await db.update(users).set({ isPro: true }).where(eq(users.id, userId));
  }
}

export const POST: APIRoute = async ({ request }) => {
  const whSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;
  if (!whSecret) {
    return new Response('Webhook secret not configured', { status: 500 });
  }

  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return new Response('Missing stripe-signature', { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, whSecret);
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId ?? session.client_reference_id ?? undefined;
        const plan = session.metadata?.plan;
        if (!userId || typeof plan !== 'string') break;
        if (plan !== 'monthly' && plan !== 'lifetime') break;

        const customerId = checkoutCustomerId(session);
        const subscriptionId = plan === 'monthly' ? checkoutSubscriptionId(session) : null;
        try {
          await db
            .update(users)
            .set({
              isPro: true,
              proPlan: plan,
              stripeSubscriptionId: subscriptionId,
              ...(customerId ? { stripeCustomerId: customerId } : {}),
            })
            .where(eq(users.id, userId));
        } catch (err) {
          console.warn('[stripe webhook] full Pro update failed; applying is_pro only (run DB migration)', err);
          await db.update(users).set({ isPro: true }).where(eq(users.id, userId));
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        await applySubscriptionActive(event.data.object as Stripe.Subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (userId) {
          try {
            await db
              .update(users)
              .set({
                isPro: false,
                proPlan: null,
                stripeCustomerId: null,
                stripeSubscriptionId: null,
              })
              .where(eq(users.id, userId));
          } catch (err) {
            console.warn('[stripe webhook] full downgrade failed; clearing is_pro only', err);
            await db.update(users).set({ isPro: false }).where(eq(users.id, userId));
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('[stripe webhook]', err);
    return new Response('Webhook handler failed', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
