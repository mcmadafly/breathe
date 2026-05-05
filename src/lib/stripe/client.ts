import Stripe from 'stripe';

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  const key = import.meta.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  if (key.startsWith('pk_')) {
    throw new Error(
      'STRIPE_SECRET_KEY is a publishable key (pk_…). Use your Stripe secret key (sk_test_… or sk_live_…) from https://dashboard.stripe.com/apikeys — never put the secret key in client code or PUBLIC_* vars.',
    );
  }
  if (!stripe) {
    stripe = new Stripe(key);
  }
  return stripe;
}
