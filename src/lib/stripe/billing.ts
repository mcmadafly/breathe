export type CheckoutPlan = 'monthly' | 'lifetime';

/**
 * Stripe Checkout `line_items[].price` must be a Price object id (`price_…` from the Dashboard),
 * never a decimal dollar amount. See https://docs.stripe.com/products-prices/manage-prices
 */
export function isStripePriceId(value: unknown): value is string {
  return typeof value === 'string' && /^price_[a-zA-Z0-9]+$/.test(value.trim());
}

/** Explains common mistakes (dollar amounts, cent-like codes) when env is not a `price_` id. */
export function stripePriceMisconfiguredHint(raw: unknown, planKey?: 'monthly' | 'lifetime'): string {
  if (typeof raw !== 'string') {
    return 'Set STRIPE_PRICE_PRO_MONTHLY and STRIPE_PRICE_PRO_LIFETIME to Price IDs from the Stripe Dashboard (each starts with price_).';
  }
  const t = raw.trim();
  if (!t) {
    return 'STRIPE_PRICE_* is empty. Copy each Price ID from Dashboard → Products → Pricing.';
  }

  const which =
    planKey === 'monthly'
      ? 'STRIPE_PRICE_PRO_MONTHLY'
      : planKey === 'lifetime'
        ? 'STRIPE_PRICE_PRO_LIFETIME'
        : 'STRIPE_PRICE_*';

  if (/^[0-9.]+$/.test(t)) {
    return `${which} is set to a number (${t}). Stripe needs the Price object id (e.g. price_1abc…), not $1.99, cents, or 0199-style codes. Create prices under Products in https://dashboard.stripe.com/products and paste each price_ id.`;
  }

  if (/^prod_[a-zA-Z0-9]+$/.test(t)) {
    return `${which} is a Product id (${t}), not a Price id. Open that product in the Dashboard → Pricing section and copy the Price ID (starts with price_), not the Product ID (prod_).`;
  }

  return `${which} must look like price_xxxxxxxx (Dashboard → Products → Pricing → copy Price ID). https://docs.stripe.com/products-prices/manage-prices`;
}

export function isStripeBillingConfigured(): boolean {
  const monthly = import.meta.env.STRIPE_PRICE_PRO_MONTHLY;
  const lifetime = import.meta.env.STRIPE_PRICE_PRO_LIFETIME;
  return Boolean(
    import.meta.env.STRIPE_SECRET_KEY && isStripePriceId(monthly) && isStripePriceId(lifetime),
  );
}

export function priceIdForPlan(plan: CheckoutPlan): string | undefined {
  switch (plan) {
    case 'monthly':
      return import.meta.env.STRIPE_PRICE_PRO_MONTHLY;
    case 'lifetime':
      return import.meta.env.STRIPE_PRICE_PRO_LIFETIME;
    default:
      return undefined;
  }
}
