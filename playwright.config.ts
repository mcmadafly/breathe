import { defineConfig, devices } from '@playwright/test';

import { playwrightE2eTursoUrl } from './tests/e2e/e2e-db';

/** Dedicated port so `reuseExistingServer` never attaches to another app on :4321. */
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4378);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

const e2eDb = playwrightE2eTursoUrl();

export default defineConfig({
  outputDir: 'test-results/playwright',
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  /** Preview + Chromium is heavy; override with `PW_WORKERS`. */
  workers: process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx astro preview --host 127.0.0.1 --port ${String(port)}`,
    env: {
      ...process.env,
      ASTRO_TELEMETRY_DISABLED: '1',
      E2E_DEV: 'true',
      SKIP_AUTH: 'true',
      FORCE_PRO: 'true',
      TURSO_DATABASE_URL: e2eDb,
    },
    url: baseURL,
    reuseExistingServer: !!process.env.PLAYWRIGHT_REUSE_SERVER,
    timeout: 120_000,
  },
});
