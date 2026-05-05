/**
 * Ops: align users.pro_plan + Stripe ids with reality (e.g. paid monthly but DB only had is_pro).
 *
 *   node scripts/set-pro-billing-by-email.mjs you@example.com monthly cus_xxx sub_xxx
 *   node scripts/set-pro-billing-by-email.mjs you@example.com lifetime cus_xxx
 *   node scripts/set-pro-billing-by-email.mjs you@example.com complimentary
 *
 * Stripe IDs: Dashboard → Customers → your customer → copy Customer ID (`cus_...`).
 * For monthly, Subscriptions → copy Subscription ID (`sub_...`) (optional but recommended for UI).
 */
import 'dotenv/config';
import { createClient } from '@libsql/client';

const email = (process.argv[2] ?? '').trim().toLowerCase();
const plan = (process.argv[3] ?? '').trim().toLowerCase();
const stripeCustomerId = (process.argv[4] ?? '').trim() || null;
const stripeSubscriptionId = (process.argv[5] ?? '').trim() || null;

const PLANS = new Set(['monthly', 'lifetime', 'complimentary']);

if (!email || !email.includes('@')) {
  console.error('Usage: node scripts/set-pro-billing-by-email.mjs <email> <monthly|lifetime|complimentary> [cus_xxx] [sub_xxx]');
  process.exit(1);
}
if (!PLANS.has(plan)) {
  console.error('pro_plan must be monthly, lifetime, or complimentary');
  process.exit(1);
}
if (plan === 'monthly' && !stripeCustomerId) {
  console.error('monthly requires Stripe Customer ID (cus_...) so the billing portal / cancel flow works.');
  process.exit(1);
}
if (plan === 'lifetime' && !stripeCustomerId) {
  console.error('lifetime requires Stripe Customer ID (cus_...) for invoices / portal.');
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

function fullSql() {
  if (plan === 'complimentary') {
    return {
      sql: `UPDATE users SET is_pro = 1, pro_plan = 'complimentary', stripe_customer_id = NULL, stripe_subscription_id = NULL WHERE lower(email) = ?`,
      args: [email],
    };
  }
  if (plan === 'lifetime') {
    return {
      sql: `UPDATE users SET is_pro = 1, pro_plan = 'lifetime', stripe_customer_id = ?, stripe_subscription_id = NULL WHERE lower(email) = ?`,
      args: [stripeCustomerId, email],
    };
  }
  return {
    sql: `UPDATE users SET is_pro = 1, pro_plan = 'monthly', stripe_customer_id = ?, stripe_subscription_id = ? WHERE lower(email) = ?`,
    args: [stripeCustomerId, stripeSubscriptionId, email],
  };
}

function mediumSql() {
  if (plan === 'complimentary') {
    return {
      sql: `UPDATE users SET is_pro = 1, pro_plan = 'complimentary', stripe_customer_id = NULL WHERE lower(email) = ?`,
      args: [email],
    };
  }
  if (plan === 'lifetime') {
    return {
      sql: `UPDATE users SET is_pro = 1, pro_plan = 'lifetime', stripe_customer_id = ? WHERE lower(email) = ?`,
      args: [stripeCustomerId, email],
    };
  }
  return {
    sql: `UPDATE users SET is_pro = 1, pro_plan = 'monthly', stripe_customer_id = ? WHERE lower(email) = ?`,
    args: [stripeCustomerId, email],
  };
}

try {
  try {
    const q = fullSql();
    await client.execute({ sql: q.sql, args: q.args });
  } catch (e) {
    console.warn('[set-pro-billing] full columns failed:', e?.message ?? e);
    try {
      const q = mediumSql();
      await client.execute({ sql: q.sql, args: q.args });
      if (plan === 'monthly' && stripeSubscriptionId) {
        console.warn('[set-pro-billing] subscription id not stored (column may be missing); run db:push / migration 0006.');
      }
    } catch (e2) {
      console.warn('[set-pro-billing] medium columns failed:', e2?.message ?? e2);
      await client.execute({
        sql: `UPDATE users SET is_pro = 1 WHERE lower(email) = ?`,
        args: [email],
      });
      console.warn('[set-pro-billing] only is_pro updated — add pro_plan / stripe columns (migrations).');
    }
  }

  let check;
  try {
    check = await client.execute({
      sql: `SELECT id, email, is_pro, pro_plan, stripe_customer_id, stripe_subscription_id FROM users WHERE lower(email) = ?`,
      args: [email],
    });
  } catch {
    try {
      check = await client.execute({
        sql: `SELECT id, email, is_pro, pro_plan, stripe_customer_id FROM users WHERE lower(email) = ?`,
        args: [email],
      });
    } catch {
      check = await client.execute({
        sql: `SELECT id, email, is_pro FROM users WHERE lower(email) = ?`,
        args: [email],
      });
    }
  }

  const row = check.rows[0];
  if (!row) {
    console.error(`No user row found for email: ${email}`);
    process.exit(2);
  }
  if (!Number(row.is_pro)) {
    console.error('Update did not set is_pro.', row);
    process.exit(3);
  }

  console.log(`OK — ${email} billing set to ${plan}.`, row);
} finally {
  client.close();
}
