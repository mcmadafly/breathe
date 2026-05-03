import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { playwrightE2eSqliteSidecars, playwrightE2eTursoUrl } from './e2e-db';

export default async function globalSetup() {
  const url = playwrightE2eTursoUrl();

  for (const f of playwrightE2eSqliteSidecars()) {
    try {
      fs.unlinkSync(f);
    } catch {
      /* missing */
    }
  }

  if (url.startsWith('file:')) {
    fs.mkdirSync(path.dirname(fileURLToPath(url)), { recursive: true });
  }

  const r = spawnSync('npx', ['drizzle-kit', 'push', '--force'], {
    cwd: process.cwd(),
    env: { ...process.env, TURSO_DATABASE_URL: url },
    stdio: 'inherit',
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    throw new Error(`drizzle-kit push exited with code ${r.status ?? 'unknown'}`);
  }
}
