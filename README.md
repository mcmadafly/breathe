# Breathe

A minimal todo app with room to breathe—lists, tasks, and a calm UI. **Breathe. Build. Repeat.**

- **Site / product:** [Taecho](https://taecho.co) — source and issues live on [GitHub](https://github.com/mcmadafly/breathe).
- **License:** [MIT](LICENSE) (copyright Taecho; see file for full text). In the running app, **`/mit-license`** shows the same license for easy reading.

## What’s in the box

- **Todos:** Multiple lists, drag-and-drop ordering, notes on tasks, done state, limits and upgrade path for Pro (Stripe).
- **Auth:** [Clerk](https://clerk.com/) (sign-in / sign-up), optional cookie-backed anonymous session where routes allow it.
- **Data:** [Turso](https://turso.tech/) (libSQL) + [Drizzle ORM](https://orm.drizzle.team/); migrations under `drizzle/`.
- **App shell:** [Astro](https://astro.build/) (server output) + React islands, [Tailwind CSS](https://tailwindcss.com/) v4, shadcn-style UI, theme toggle, toasts.
- **Deploy:** [Cloudflare](https://developers.cloudflare.com/workers/) adapter (`wrangler`), KV-backed sessions binding, optional Pages bundle scripts in `package.json`.
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
| `npm run deploy` / `deploy:worker` | Cloudflare Pages / Worker deploy (see scripts) |
| `npm run db:push` | Apply Drizzle schema to the configured database |
| `npm test` | Vitest (unit + component as configured) |
| `npm run test:e2e` | Rebuilds for E2E env, runs Playwright (preview + screenshots) |

## Contributing / docs

Issues and PRs welcome on the [repository](https://github.com/mcmadafly/breathe). Astro’s own docs live at [docs.astro.build](https://docs.astro.build).
