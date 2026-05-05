/// <reference types="astro/client" />
/// <reference types="@clerk/astro/env" />

declare namespace App {
  interface Locals {
    session: import('@/lib/auth/session').AppSession | null;
    isPro: boolean;
    /** `monthly` | `lifetime` (paid) | `complimentary` (free unlock); null if not Pro. */
    proPlan: string | null;
    /** Stripe Customer id when checkout created a customer; used for Billing Portal. */
    stripeCustomerId: string | null;
    /** Monthly subscription id when applicable; syncs from Checkout / subscription webhooks. */
    stripeSubscriptionId: string | null;
    /** True when using cookie-backed anonymous user (`anon_*` id), before Clerk sign-in. */
    isAnonymous: boolean;
  }
}

interface ImportMetaEnv {
  readonly TURSO_DATABASE_URL: string;
  readonly TURSO_AUTH_TOKEN?: string;
  readonly PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  readonly CLERK_SECRET_KEY: string;
  /** Set at Astro build/dev from `E2E_DEV` via Vite `define` (e2e probe routes). */
  readonly SCRIBBBLES_E2E: boolean;
  /** When "true", skips Clerk and uses a fixed local user for /breathe and todos. */
  readonly SKIP_AUTH?: string;
  /** When "true", treats current session as Pro (for local testing). */
  readonly FORCE_PRO?: string;
  /** Stripe secret key (server only). */
  readonly STRIPE_SECRET_KEY?: string;
  /** Stripe webhook signing secret for `/api/stripe/webhook`. */
  readonly STRIPE_WEBHOOK_SECRET?: string;
  /** Stripe Price IDs for Checkout (Dashboard → Products → Prices). */
  readonly STRIPE_PRICE_PRO_MONTHLY?: string;
  readonly STRIPE_PRICE_PRO_LIFETIME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
