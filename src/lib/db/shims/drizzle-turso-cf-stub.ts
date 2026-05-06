/**
 * Resolved instead of `drizzle-orm/tursodatabase/database` when `SCRIBBBLES_CF_SSR_BUILD=1`.
 * The real driver pulls `@tursodatabase/database` (native / node:fs).
 */
export function drizzle(): never {
  throw new Error(
    'drizzle-orm/tursodatabase/database is stubbed in Cloudflare SSR builds. Use drizzle-orm/libsql for remote Turso.',
  );
}
