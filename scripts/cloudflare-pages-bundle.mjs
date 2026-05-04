#!/usr/bin/env node
/**
 * After `astro build`, merge `dist/client` + `dist/server` into a Cloudflare **Pages**
 * bundle: static assets at the root and SSR worker at `_worker.js/` (Advanced Pages Functions).
 * The server entry is renamed to `_worker.js/index.js` (Wrangler does not resolve `index.mjs`).
 *
 * @see https://developers.cloudflare.com/pages/functions/advanced-mode/
 */
import { cp, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientDir = path.join(root, 'dist', 'client');
const serverDir = path.join(root, 'dist', 'server');
const outDir = path.join(root, 'dist', 'cf-pages');

if (!existsSync(clientDir) || !existsSync(serverDir)) {
  console.error('cloudflare-pages-bundle: run `astro build` first (missing dist/client or dist/server).');
  process.exit(1);
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

await cp(clientDir, outDir, { recursive: true });

const workerOut = path.join(outDir, '_worker.js');
await mkdir(workerOut, { recursive: true });

await cp(serverDir, workerOut, {
  recursive: true,
  filter: (src) => {
    const b = path.basename(src);
    return b !== 'wrangler.json' && b !== '.dev.vars';
  },
});

await rename(path.join(workerOut, 'entry.mjs'), path.join(workerOut, 'index.js'));

/** Pages-only Wrangler file. Root `wrangler.jsonc` merges into `dist/server/wrangler.json` (Worker-shaped); Pages deploy must not use that file or `nodejs_compat` and KV are ignored and imports like `node:events` fail. KV `SESSION` must exist on the Pages project (dashboard); do not put namespace IDs in git. */
const pagesWranglerPath = path.join(outDir, 'wrangler.json');
await writeFile(
  pagesWranglerPath,
  `${JSON.stringify(
    {
      $schema: '../../node_modules/wrangler/config-schema.json',
      name: 'spirare',
      pages_build_output_dir: '.',
      compatibility_date: '2025-05-01',
      compatibility_flags: ['nodejs_compat'],
    },
    null,
    2,
  )}\n`,
);

console.log('cloudflare-pages-bundle: wrote dist/cf-pages (cd dist/cf-pages && wrangler pages deploy .)');
