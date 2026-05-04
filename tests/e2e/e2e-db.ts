import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Keep this URL identical in `prepare-e2e.mjs` (`drizzle-kit push` + `npm run build` env) and
 * `playwright.config.ts` (webServer `TURSO_DATABASE_URL`). Override with
 * `PLAYWRIGHT_TURSO_URL` for a non-default local/remote URL.
 */
export const playwrightE2eSqlitePath = path.join(process.cwd(), 'test-results', 'e2e.sqlite');

export function playwrightE2eTursoUrl(): string {
  return process.env.PLAYWRIGHT_TURSO_URL ?? pathToFileURL(playwrightE2eSqlitePath).href;
}

/** SQLite sidecar paths to delete before applying migrations (file DB only). */
export function playwrightE2eSqliteSidecars(): string[] {
  const url = playwrightE2eTursoUrl();
  if (!url.startsWith('file:')) return [];
  const p = fileURLToPath(url);
  return [p, `${p}-wal`, `${p}-shm`];
}
