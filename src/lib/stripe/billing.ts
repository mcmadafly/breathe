export type CheckoutPlan = 'monthly' | 'lifetime';

export function isStripeBillingConfigured(): boolean {
  return Boolean(
    import.meta.env.STRIPE_SECRET_KEY &&
    import.meta.env.STRIPE_PRICE_PRO_MONTHLY &&
    import.meta.env.STRIPE_PRICE_PRO_LIFETIME,
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
