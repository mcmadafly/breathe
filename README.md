# Breathe

A minimal todo app with room to breathe—lists, tasks, and a calm UI. **Breathe. Build. Repeat.**

Live site: **[spirare.io](https://spirare.io/)**. Cloudflare **Worker** script name in `wrangler.jsonc` defaults to **`breathe`**. (`npm run deploy:pages` uses a separate Pages **project** name via `CLOUDFLARE_PAGES_PROJECT` only if you use that optional path.)

- **Site / product:** [Taecho](https://taecho.co) — source and issues live on [GitHub](https://github.com/mcmadafly/breathe). For a wider intro to Taecho (what we build, how we think about tools like Breathe), see **[taecho.io](https://taecho.io/)**.
- **License:** [MIT](LICENSE) (copyright Taecho; see file for full text). In the running app, **`/mit-license`** shows the same license for easy reading.

## What’s in the box

- **Todos:** Multiple lists, drag-and-drop ordering, notes on tasks, done state, limits and upgrade path for Pro (Stripe).
- **Auth:** [Clerk](https://clerk.com/) (sign-in / sign-up), optional cookie-backed anonymous session where routes allow it.
- **Data:** [Turso](https://turso.tech/) (libSQL) + [Drizzle ORM](https://orm.drizzle.team/); migrations under `drizzle/`.
- **App shell:** [Astro](https://astro.build/) (server output) + React islands, [Tailwind CSS](https://tailwindcss.com/) v4, shadcn-style UI, theme toggle, toasts.
- **Deploy:** [Cloudflare Workers](https://developers.cloudflare.com/workers/) via the Astro adapter (`wrangler deploy`, KV **SESSION** binding). **`npm run deploy`** builds and deploys the Worker (name **`breathe`** by default in `wrangler.jsonc`). Optional **`npm run deploy:pages`** targets a separate Cloudflare **Pages** project if you need that layout.
- **PWA:** Web app manifest and service worker for installable, offline-friendly static assets.

Dev-only conveniences: `SKIP_AUTH` for local/E2E without Clerk keys; `E2E_DEV` gates compile-time E2E helpers (e.g. internal probe routes).

## Requirements

- **Node** ≥ 22.12 (see `package.json` → `engines`).
- **Env:** Clerk keys, `TURSO_DATABASE_URL` (and related), Stripe keys for billing—see `.env.example` and Cloudflare/`wrangler` secrets for production.

## Commands

| Command | Action |
| :------ | :----- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server (default [localhost:4321](http://localhost:4321)) |
| `npm run build` | Production build to `./dist/` |
| `npm run preview` | Preview the build locally |
| `npm run deploy` | `astro build` + **`wrangler deploy`** (Worker; default script name **`breathe`**) |
| `npm run deploy:worker` | Same as `npm run deploy` |
| `npm run deploy:pages` | Optional: Pages bundle + `wrangler pages deploy` (set `CLOUDFLARE_PAGES_PROJECT` if not **`breathe`**) |
| `npm run cf:whoami` | Verify Wrangler auth and **Account ID** (compare to GitHub `CLOUDFLARE_ACCOUNT_ID`) |
| `npm run cf:secret:list` | List **deployed** secrets on Worker **`breathe`** |
| `npm run cf:secret:bulk` | **`wrangler versions secret bulk`** of **`cf-worker.secrets.env`** (after `npm run build`; avoids error **10214**) |
| `npm run cf:pages:list` | List Pages projects in the authenticated account |
| `npm run db:push` | Apply Drizzle schema to the configured database |
| `npm test` | Vitest (unit + component as configured) |
| `npm run test:e2e` | Rebuilds for E2E env, runs Playwright (preview + screenshots) |

## Worker secrets (production)

Deploying the **Worker** with `npm run deploy` only uploads code and assets. **Secrets and variables** on the Worker are separate. If `npm run cf:secret:list` is empty, the app will fail at runtime (e.g. missing Turso URL or Clerk keys).

1. Create **`cf-worker.secrets.env`** (gitignored), e.g. **`cp .env cf-worker.secrets.env`** — trim to production keys only (see `.env.example`).
2. **`npm run build && npm run cf:secret:bulk`** (uses **`wrangler versions secret bulk`**) so Cloudflare does not error **10214** when the latest bundle is not yet 100% deployed.
3. If production still doesn’t see the new secrets, run **`npm run deploy`** (or promote the new version in the dashboard).  
   Alternatively: **`npm run deploy`** first, then **`npx wrangler secret bulk`** if you prefer the classic API.
4. **`npx wrangler secret put NAME`** one-by-one, or plain **Variables** in the dashboard.

CI does **not** push secrets to the Worker; set them once per account (or manage via infrastructure as code).

## Deploy troubleshooting

**Custom domain returns 500** while **`*.workers.dev`** (or a preview URL) works**, or the console shows **“Unsafe attempt to load URL https://spirare.io/…”**:

1. **Cloudflare Worker — variables and secrets**  
   In **Workers & Pages → Workers → your script (e.g. breathe) → Settings**, set **Variables** and **Secrets** for production. Missing **`TURSO_DATABASE_URL`** or auth keys often surfaces as a **500** at startup. Use **`wrangler secret put`** for sensitive values.

2. **Clerk — Domains**  
   In [Clerk Dashboard → configure → Domains](https://dashboard.clerk.com/), add **`spirare.io`** (and `www` if you use it). Without it, Clerk’s embedded UI / redirects can break and the browser may report unsafe cross-origin navigation. Use the same **publishable key** you bake into the build for production.

3. **Cloudflare — Custom domain / routes**  
   Confirm **spirare.io** (or your host) is attached to the **Worker** (Triggers → Custom Domains / Routes) with DNS proxied as expected.

## Contributing / docs

Issues and PRs welcome on the [repository](https://github.com/mcmadafly/breathe). Astro’s own docs live at [docs.astro.build](https://docs.astro.build).
