import type { APIRoute } from 'astro';
import { z } from 'zod';

import { isAnonymousUserId } from '@/lib/auth/anonymous-session';
import { isStripePriceId, priceIdForPlan, stripePriceMisconfiguredHint } from '@/lib/stripe/billing';
import { getStripe } from '@/lib/stripe/client';

const bodySchema = z.object({
  plan: z.enum(['monthly', 'lifetime']),
});

export const POST: APIRoute = async ({ request, locals, url }) => {
  const userId = locals.session?.user?.id;
  if (!userId || isAnonymousUserId(userId)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid plan' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const plan = parsed.data.plan;

  if (!import.meta.env.STRIPE_SECRET_KEY?.trim()) {
    return new Response(JSON.stringify({ error: 'Billing is not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rawPrice = priceIdForPlan(plan);
  const priceId = rawPrice?.trim();
  if (!isStripePriceId(priceId)) {
    return new Response(JSON.stringify({ error: stripePriceMisconfiguredHint(rawPrice, plan) }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const origin = url.origin;
  const stripe = getStripe();

  const mode = plan === 'monthly' ? 'subscription' : 'payment';

  const session = await stripe.checkout.sessions.create({
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/upgrade?checkout=success`,
    cancel_url: `${origin}/upgrade?checkout=cancel`,
    client_reference_id: userId,
    metadata: {
      userId,
      plan,
    },
    ...(mode === 'subscription'
      ? {
          subscription_data: {
            metadata: { userId },
          },
        }
      : {}),
  });

  if (!session.url) {
    return new Response(JSON.stringify({ error: 'No checkout URL' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
