import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { getStripe } from '@/lib/stripe/client';

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
        if (plan === 'monthly' || plan === 'lifetime') {
          await db.update(users).set({ isPro: true }).where(eq(users.id, userId));
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (userId) {
          await db.update(users).set({ isPro: false }).where(eq(users.id, userId));
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
