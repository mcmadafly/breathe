#!/usr/bin/env node
/**
 * Upload Worker secrets from `cf-worker.secrets.env` (not committed).
 *
 *   npm run cf:secret:sync
 *   npm run build && npm run cf:secret:bulk
 *
 * Uses **`wrangler versions secret bulk`** (not `secret bulk`) so uploads work when the latest
 * Worker version is not yet the deployed one (Cloudflare API error **10214**).
 *
 * @see https://developers.cloudflare.com/workers/wrangler/commands/#versions-secret-bulk
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'cf-worker.secrets.env');
const wranglerJson = path.join(root, 'dist', 'server', 'wrangler.json');

if (!existsSync(wranglerJson)) {
  console.error('cf-worker-secret-bulk: run `npm run build` first (need dist/server/wrangler.json).');
  process.exit(1);
}
if (!existsSync(file)) {
  console.error(
    [
      'cf-worker-secret-bulk: missing cf-worker.secrets.env in repo root (gitignored).',
      '',
      'Create it with KEY=value lines (or run `npm run cf:secret:sync`):',
      '  PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_…',
      '  CLERK_SECRET_KEY=sk_live_…',
      '',
      'Optional (billing): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PRO_MONTHLY, STRIPE_PRICE_PRO_LIFETIME',
      '',
      'Then: npm run cf:secret:bulk',
    ].join('\n'),
  );
  process.exit(1);
}

const r = spawnSync(
  'npx',
  ['wrangler', 'versions', 'secret', 'bulk', file, '--config', 'dist/server/wrangler.json'],
  { cwd: root, stdio: 'inherit' },
);
if (r.status === 0) {
  console.log(
    '\ncf-worker-secret-bulk: secrets attached to a new Worker version. If production still looks wrong, run `npm run deploy` (or promote that version in the dashboard).',
  );
}
process.exit(r.status === null ? 1 : r.status);
