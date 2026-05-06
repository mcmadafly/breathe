import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const tursoUrl = process.env.TURSO_DATABASE_URL ?? 'file:local.db';
const tursoToken = process.env.TURSO_AUTH_TOKEN?.trim();

if (tursoUrl.startsWith('libsql://') && !tursoToken) {
  console.warn(
    '[drizzle] Hosted libsql:// URL but TURSO_AUTH_TOKEN is empty — Turso returns HTTP 400. ' +
      'Paste a DB token from the Turso dashboard into .env (same folder you run npm from).',
  );
}

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: tursoUrl,
    authToken: tursoToken || undefined,
  },
});
