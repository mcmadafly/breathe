/**
 * Resolved instead of `@tursodatabase/sync` when `SCRIBBBLES_CF_SSR_BUILD=1` (see `astro.config.mjs`).
 * Native Turso Sync cannot run on Cloudflare Workers.
 */
export async function connect(): Promise<never> {
  throw new Error(
    'Turso Sync is unavailable in Cloudflare SSR bundles. Use a remote `libsql://` URL, or run `astro dev` / a Node server with TURSO_USE_SYNC.',
  );
}
