# Breathe

A minimal todo app with room to breathe—lists, tasks, and a calm UI. **Breathe. Build. Repeat.**

Live site: **[spirare.io](https://spirare.io/)**. Cloudflare **Pages / Worker** project name defaults to **`breathe`** (override with `CLOUDFLARE_PAGES_PROJECT` if needed).

- **Site / product:** [Taecho](https://taecho.co) — source and issues live on [GitHub](https://github.com/mcmadafly/breathe). For a wider intro to Taecho (what we build, how we think about tools like Breathe), see **[taecho.io](https://taecho.io/)**.
- **License:** [MIT](LICENSE) (copyright Taecho; see file for full text). In the running app, **`/mit-license`** shows the same license for easy reading.

## What’s in the box

- **Todos:** Multiple lists, drag-and-drop ordering, notes on tasks, done state, limits and upgrade path for Pro (Stripe).
- **Auth:** [Clerk](https://clerk.com/) (sign-in / sign-up), optional cookie-backed anonymous session where routes allow it.
- **Data:** [Turso](https://turso.tech/) (libSQL) + [Drizzle ORM](https://orm.drizzle.team/); migrations under `drizzle/`.
- **App shell:** [Astro](https://astro.build/) (server output) + React islands, [Tailwind CSS](https://tailwindcss.com/) v4, shadcn-style UI, theme toggle, toasts.
- **Deploy:** [Cloudflare](https://developers.cloudflare.com/workers/) adapter (`wrangler`), KV-backed sessions binding, optional Pages bundle scripts in `package.json`. **Day-to-day:** `npm run deploy` (`wrangler pages deploy` to **`breathe`** by default). Do not run `pages project create` when the project already exists (error **8000002**). CI still runs `create` first and continues if the project is already there. Set **`CLOUDFLARE_PAGES_PROJECT`** if your dashboard name differs.
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
| `npm run deploy` | Build Pages bundle, then deploy (default Pages project **`breathe`**; set `CLOUDFLARE_PAGES_PROJECT` if yours differs) |
| `npm run deploy:worker` | Worker deploy (`astro build` + `wrangler deploy`) |
| `npm run cf:whoami` | Verify Wrangler auth and **Account ID** (compare to GitHub `CLOUDFLARE_ACCOUNT_ID`) |
| `npm run cf:pages:list` | List Pages projects in the authenticated account |
| `npm run db:push` | Apply Drizzle schema to the configured database |
| `npm test` | Vitest (unit + component as configured) |
| `npm run test:e2e` | Rebuilds for E2E env, runs Playwright (preview + screenshots) |

## Deploy troubleshooting

**`*.pages.dev` works but the custom domain (e.g. spirare.io) returns 500**, or the console shows **“Unsafe attempt to load URL https://spirare.io/…”**:

1. **Cloudflare Pages — Production vs Preview variables**  
   **Custom domains** use the **Production** environment. Branch preview URLs use **Preview**. In **Workers & Pages → your project → Settings → Environment variables**, copy every required var (especially **`TURSO_DATABASE_URL`**, **`TURSO_AUTH_TOKEN`**, **`CLERK_SECRET_KEY`**, **`PUBLIC_CLERK_PUBLISHABLE_KEY`**, Stripe, etc.) into **Production**, not only Preview. Missing `TURSO_DATABASE_URL` crashes the worker at startup (`Missing TURSO_DATABASE_URL` → 500).

2. **Clerk — Domains**  
   In [Clerk Dashboard → configure → Domains](https://dashboard.clerk.com/), add **`spirare.io`** (and `www` if you use it). Without it, Clerk’s embedded UI / redirects can break and the browser may report unsafe cross-origin navigation. Use the same **publishable key** you bake into the build for production.

3. **Cloudflare — Custom domain**  
   Confirm **spirare.io** is listed under the **breathe** Pages project → **Custom domains**, attached to the **production** branch, with DNS proxied correctly.

## Contributing / docs

Issues and PRs welcome on the [repository](https://github.com/mcmadafly/breathe). Astro’s own docs live at [docs.astro.build](https://docs.astro.build).
