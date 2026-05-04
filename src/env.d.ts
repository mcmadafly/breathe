/// <reference types="astro/client" />
/// <reference types="@clerk/astro/env" />

declare namespace App {
  interface Locals {
    session: import('@/lib/auth/session').AppSession | null;
    isPro: boolean;
  }
}

interface ImportMetaEnv {
  readonly TURSO_DATABASE_URL: string;
  readonly TURSO_AUTH_TOKEN?: string;
  readonly PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  readonly CLERK_SECRET_KEY: string;
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
