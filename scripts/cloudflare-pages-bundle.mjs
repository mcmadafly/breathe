#!/usr/bin/env node
/**
 * **Optional** Cloudflare **Pages** bundle (not the default deploy path — use `npm run deploy` = Worker).
 *
 * After `astro build`, merge `dist/client` + `dist/server` into a **Pages** upload folder: static assets at the root and SSR worker at `_worker.js/` (Advanced Pages Functions).
 * The server entry is renamed to `_worker.js/index.js` (Wrangler does not resolve `index.mjs`).
 *
 * **No `wrangler.json` in this folder:** A valid Pages config with `pages_build_output_dir` causes
 * `wrangler pages deploy` to attach a config hash and worker metadata that can replace production
 * bindings (dashboard + `wrangler pages secret` plain vars/secrets) with an empty set. Runtime
 * compatibility flags, KV, and env should come from the **existing** Pages project settings
 * (Workers & Pages → project → Settings); `nodejs_compat` must already be enabled there.
 *
 * @see https://developers.cloudflare.com/pages/functions/advanced-mode/
 */
import { cp, mkdir, rename, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** Must match the Cloudflare Pages project name (dashboard). Override via CLOUDFLARE_PAGES_PROJECT (CI: repo variable). */
const pagesProjectName = (process.env.CLOUDFLARE_PAGES_PROJECT ?? '').trim() || 'breathe';
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

console.log(
  `cloudflare-pages-bundle: wrote dist/cf-pages (wrangler pages deploy . --project-name=${pagesProjectName}; no wrangler.json — preserves dashboard env)`,
);
