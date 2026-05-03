import { execSync } from 'node:child_process';
import fs from 'node:fs';

import { playwrightE2eSqlitePath, playwrightE2eTursoUrl } from './e2e-db';

export default async function globalSetup() {
  for (const f of [
    playwrightE2eSqlitePath,
    `${playwrightE2eSqlitePath}-wal`,
    `${playwrightE2eSqlitePath}-shm`,
  ]) {
    try {
      fs.unlinkSync(f);
    } catch {
      /* missing */
    }
  }
  execSync('npx drizzle-kit push --force', {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: { ...process.env, TURSO_DATABASE_URL: playwrightE2eTursoUrl() },
  });
}
