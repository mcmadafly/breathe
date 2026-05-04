import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

import * as schema from './schema';

const url = process.env.TURSO_DATABASE_URL ?? import.meta.env.TURSO_DATABASE_URL;
const authTokenRaw = process.env.TURSO_AUTH_TOKEN ?? import.meta.env.TURSO_AUTH_TOKEN;
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
