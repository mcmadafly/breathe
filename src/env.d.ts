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
  /**
   * Node / VPS only: use `@tursodatabase/sync` (local replica + LibSQL sync) when `true`/`1`/`yes`,
   * `TURSO_DATABASE_URL` is `libsql:…`, and `TURSO_SYNC_PATH` is set. Omit on Cloudflare Workers/Pages.
   */
  readonly TURSO_USE_SYNC?: string;
  /** Filesystem path for local synced SQLite files (`file:` prefix optional). Requires `libsql:` URL + token. */
  readonly TURSO_SYNC_PATH?: string;
  readonly PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  readonly CLERK_SECRET_KEY: string;
  /** Set at Astro build/dev from `E2E_DEV` via Vite `define` (e2e probe routes). */
  readonly SCRIBBBLES_E2E: boolean;
  /** `true` or `'true'` when `astro build` runs with `SCRIBBBLES_CF_SSR_BUILD=1` (see `package.json` scripts). */
  readonly SCRIBBBLES_CF_SSR: boolean | 'true' | 'false';
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
