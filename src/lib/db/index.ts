import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { getEnv } from 'astro/env/runtime';

import * as schema from './schema';

/** Cloudflare Workers expose vars on the handler `env`; Astro maps that via `getEnv`, not `process.env`. */
const url =
  (getEnv('TURSO_DATABASE_URL') as string | undefined) ?? import.meta.env.TURSO_DATABASE_URL;
const authTokenRaw =
  (getEnv('TURSO_AUTH_TOKEN') as string | undefined) ?? import.meta.env.TURSO_AUTH_TOKEN;
/** Remote Turso requires a token; local `file:` SQLite must not use a hosted JWT (queries fail). */
const authToken =
  url.startsWith('file:') || url.startsWith(':memory:') ? undefined : authTokenRaw || undefined;

if (!url) {
  throw new Error('Missing TURSO_DATABASE_URL');
}

const client = createClient({
  url,
  authToken,
});

export const db = drizzle(client, { schema });

/** Direct client for parameterized SQL when Drizzle schema is ahead of the live DB. */
export const libsqlClient = client;
