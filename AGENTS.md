# AGENTS.md

## Cursor Cloud specific instructions

### Running the dev server

The Astro dev server uses the **Cloudflare Workers adapter** (`@astrojs/cloudflare`), which runs in a workerd/Miniflare environment. This has two key implications:

1. **Local SQLite (`file:` URLs) is not supported** — the `@libsql/client` web variant (used in workerd) only supports `http:`, `https:`, `libsql:`, `ws:`, `wss:` URLs. You must run a local **libsql-server** (`sqld`) to serve the database over HTTP.

2. **`SKIP_AUTH=true` bypasses Clerk** — set in `.env` to skip OAuth entirely and use a fixed dev user. Also set `FORCE_PRO=true` to unlock all Pro features without Stripe keys.

### Local database setup (sqld)

Install `sqld` (libsql-server) if not already available:
```sh
curl -sSfL "https://github.com/tursodatabase/libsql/releases/download/libsql-server-v0.24.32/libsql-server-x86_64-unknown-linux-gnu.tar.xz" -o /tmp/libsql-server.tar.xz
tar -xf /tmp/libsql-server.tar.xz -C /tmp/
sudo cp /tmp/libsql-server-x86_64-unknown-linux-gnu/sqld /usr/local/bin/sqld
```

Start it before the dev server:
```sh
sqld --db-path ./local.db --http-listen-addr 127.0.0.1:8090 &
```

Set `.env` to point at it:
```
TURSO_DATABASE_URL=http://127.0.0.1:8090
```

Push the schema: `npm run db:push`

### Key commands

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Push DB schema | `npm run db:push` |
| Dev server | `npm run dev` (serves on `localhost:4321`) |
| Unit + component tests | `npm test` (Vitest) |
| E2E tests | `npm run test:e2e` (Playwright — only run when explicitly asked, per `.cursor/rules/e2e-ask-first.mdc`) |

### Gotchas

- **sqld must be running** before `npm run dev` or the app will 500 on every request (libsql client can't connect).
- **`npm run db:push`** must be run after creating a fresh `local.db` (or after schema changes) so that tables exist.
- The dev server listens on `0.0.0.0:4321` by default (`server.host: true` in `astro.config.mjs`).
- `package-lock.json` changes from `npm install` are expected and should be committed if they occur.
