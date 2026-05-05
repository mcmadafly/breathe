import type { APIRoute } from 'astro';

import { isAnonymousUserId } from '@/lib/auth/anonymous-session';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { getStripe } from '@/lib/stripe/client';
import { eq } from 'drizzle-orm';

/** Stripe Customer Search query: https://docs.stripe.com/search#query-fields-for-customers */
function customerSearchQueryForEmail(email: string): string {
  const e = email.trim().replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `email:"${e}"`;
}

export const POST: APIRoute = async ({ locals, url }) => {
  const userId = locals.session?.user?.id;
  if (!userId || isAnonymousUserId(userId)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!import.meta.env.STRIPE_SECRET_KEY?.trim()) {
    return new Response(JSON.stringify({ error: 'Billing is not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let row:
    | {
        stripeCustomerId: string | null;
        email: string | null;
      }
    | undefined;
  try {
    row = await db
      .select({
        stripeCustomerId: users.stripeCustomerId,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, userId))
      .get();
  } catch (err) {
    console.warn('[portal] user billing columns unavailable', err);
    return new Response(
      JSON.stringify({
        error:
          'Billing data is temporarily unavailable — the database may need the latest migration. Try again after deploy, or contact support.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  let stripeCustomerId = row?.stripeCustomerId?.trim() || null;
  const sessionEmail = locals.session?.user?.email?.trim();
  const dbEmail = row?.email?.trim();
  const email = sessionEmail || dbEmail;

  if (!stripeCustomerId && email) {
    const stripe = getStripe();
    try {
      const found = await stripe.customers.search({
        query: customerSearchQueryForEmail(email),
        limit: 3,
      });

      if (found.data.length === 0) {
        return new Response(
          JSON.stringify({
            error:
              'No Stripe customer found for this sign-in email. Use the same account you used at checkout, or complete checkout from Upgrade.',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      if (found.data.length > 1) {
        return new Response(
          JSON.stringify({
            error: 'More than one Stripe profile matches this email. Contact support so we can link the right one.',
          }),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      stripeCustomerId = found.data[0]!.id;

      const subsActive = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'active',
        limit: 5,
      });
      const subsTrialing = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'trialing',
        limit: 5,
      });
      const subId = subsActive.data[0]?.id ?? subsTrialing.data[0]?.id ?? null;

      try {
        await db
          .update(users)
          .set({
            stripeCustomerId,
            ...(subId
              ? { stripeSubscriptionId: subId, proPlan: 'monthly', isPro: true }
              : {}),
          })
          .where(eq(users.id, userId));
      } catch (err) {
        console.warn('[portal] persist linked customer (full) failed; saving customer id only', err);
        try {
          await db.update(users).set({ stripeCustomerId }).where(eq(users.id, userId));
        } catch (err2) {
          console.error('[portal] persist linked customer failed', err2);
          return new Response(JSON.stringify({ error: 'Could not save billing link — try again.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    } catch (err) {
      console.error('[portal] Stripe customer search/link failed', err);
      return new Response(JSON.stringify({ error: 'Could not look up your Stripe profile — try again shortly.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (!stripeCustomerId) {
    return new Response(
      JSON.stringify({
        error:
          'No Stripe billing profile on file and no email to look it up. Add an email to your account or use Upgrade to check out.',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const origin = url.origin;
  const stripe = getStripe();

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/upgrade`,
    });

    if (!portalSession.url) {
      return new Response(JSON.stringify({ error: 'No portal URL' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ url: portalSession.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[portal] billingPortal.sessions.create failed', err);
    return new Response(JSON.stringify({ error: 'Could not open Stripe billing — try again.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
