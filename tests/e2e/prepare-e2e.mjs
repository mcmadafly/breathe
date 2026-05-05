/**
 * Run before `playwright test` (see `package.json` script). Separate process avoids OOM when
 * the Playwright runner and `astro build` would otherwise peak memory together.
 *
 * Frees the preview port, wipes the E2E SQLite file + WAL/SHM, `drizzle-kit push --force`,
 * then `npm run build`. URL must match `playwrightE2eTursoUrl()` in `e2e-db.ts`.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const cwd = process.cwd();

function playwrightE2eTursoUrl() {
  return (
    process.env.PLAYWRIGHT_TURSO_URL ?? pathToFileURL(path.join(cwd, 'test-results', 'e2e.sqlite')).href
  );
}

function sqliteSidecars(url) {
  if (!url.startsWith('file:')) return [];
  const p = fileURLToPath(url);
  return [p, `${p}-wal`, `${p}-shm`];
}

function killListenersOnPort(port) {
  try {
    if (process.platform === 'darwin' || process.platform === 'linux') {
      execSync(`lsof -ti :${String(port)} | xargs kill -9 2>/dev/null || true`, {
        stdio: 'ignore',
      });
    }
  } catch {
    /* ignore */
  }
}

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4378);
killListenersOnPort(port);

const url = playwrightE2eTursoUrl();
for (const f of sqliteSidecars(url)) {
  try {
    fs.unlinkSync(f);
  } catch {
    /* missing */
  }
}
if (url.startsWith('file:')) {
  fs.mkdirSync(path.dirname(fileURLToPath(url)), { recursive: true });
}

const e2eEnv = {
  ...process.env,
  TURSO_DATABASE_URL: url,
  E2E_DEV: 'true',
  SKIP_AUTH: 'true',
  /** Unblocks composer when the E2E DB already has ≥ free-tier todos (stale file or parallel runs). */
  FORCE_PRO: 'true',
  ASTRO_TELEMETRY_DISABLED: '1',
};

execSync('npx drizzle-kit push --force', {
  cwd,
  stdio: 'inherit',
  env: e2eEnv,
});

execSync('npm run build', {
  cwd,
  stdio: 'inherit',
  env: e2eEnv,
});
