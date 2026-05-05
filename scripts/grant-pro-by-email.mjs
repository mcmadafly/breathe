/**
 * One-off / ops: set Pro + complimentary plan for a user by email.
 * Uses TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN for remote) from .env.
 *
 *   node scripts/grant-pro-by-email.mjs you@example.com
 */
import 'dotenv/config';
import { createClient } from '@libsql/client';

const email = (process.argv[2] ?? '').trim().toLowerCase();
if (!email || !email.includes('@')) {
  console.error('Usage: node scripts/grant-pro-by-email.mjs <email>');
  process.exit(1);
}

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error('Missing TURSO_DATABASE_URL');
  process.exit(1);
}

const authToken =
  url.startsWith('file:') || url.startsWith(':memory:') ? undefined : process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

try {
  try {
    await client.execute({
      sql: `UPDATE users SET is_pro = 1, pro_plan = 'complimentary', stripe_customer_id = NULL, stripe_subscription_id = NULL WHERE lower(email) = ?`,
      args: [email],
    });
  } catch (e) {
    console.warn('[grant-pro] full billing columns missing, trying without subscription id:', e?.message ?? e);
    try {
      await client.execute({
        sql: `UPDATE users SET is_pro = 1, pro_plan = 'complimentary', stripe_customer_id = NULL WHERE lower(email) = ?`,
        args: [email],
      });
    } catch (e2) {
      console.warn('[grant-pro] billing columns missing, updating is_pro only:', e2?.message ?? e2);
      await client.execute({
        sql: `UPDATE users SET is_pro = 1 WHERE lower(email) = ?`,
        args: [email],
      });
    }
  }

  const check = await client.execute({
    sql: `SELECT id, email, is_pro FROM users WHERE lower(email) = ?`,
    args: [email],
  });
  const row = check.rows[0];
  if (!row) {
    console.error(`No user row found for email: ${email}`);
    process.exit(2);
  }
  if (!Number(row.is_pro)) {
    console.error('Update did not set is_pro; check schema / permissions.', row);
    process.exit(3);
  }

  console.log(`OK — ${email} is Pro (complimentary).`, row);
} finally {
  client.close();
}
