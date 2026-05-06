#!/usr/bin/env node
/**
 * Upload Worker secrets from a local .env-style file (not committed).
 *
 *   cp .env cf-worker.secrets.env   # then trim to only keys you want on the Worker
 *   npm run build && npm run cf:secret:bulk
 *
 * @see https://developers.cloudflare.com/workers/configuration/secrets/
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
      'Create it with KEY=value lines, e.g. copy from production .env or old Pages env:',
      '  TURSO_DATABASE_URL=libsql://…',
      '  TURSO_AUTH_TOKEN=…',
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
  ['wrangler', 'secret', 'bulk', file, '--config', 'dist/server/wrangler.json'],
  { cwd: root, stdio: 'inherit' },
);
process.exit(r.status === null ? 1 : r.status);
