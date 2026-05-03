import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

import * as schema from './schema';

const url = import.meta.env.TURSO_DATABASE_URL;
const authToken = import.meta.env.TURSO_AUTH_TOKEN;

if (!url) {
  throw new Error('Missing TURSO_DATABASE_URL');
}

const client = createClient({
  url,
  authToken: authToken || undefined,
});

export const db = drizzle(client, { schema });

/** Direct client for parameterized SQL when Drizzle schema is ahead of the live DB. */
export const libsqlClient = client;
