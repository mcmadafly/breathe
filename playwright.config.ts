import { defineConfig, devices } from '@playwright/test';

import { playwrightE2eTursoUrl } from './tests/e2e/e2e-db';

/** Dedicated port so local `reuseExistingServer` never attaches to another app on :4321. */
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4378);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

const e2eDb = process.env.PLAYWRIGHT_TURSO_URL ?? playwrightE2eTursoUrl();

export default defineConfig({
  globalSetup: './tests/e2e/global-setup.ts',
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command:
      `SKIP_AUTH=true TURSO_DATABASE_URL="${e2eDb}" npm run dev -- --host 127.0.0.1 --port ` +
      String(port),
    url: baseURL,
    /** Prefer a fresh server with `e2eDb`; set PLAYWRIGHT_REUSE_SERVER=1 to attach to an existing :4378 dev server. */
    reuseExistingServer: !!process.env.PLAYWRIGHT_REUSE_SERVER,
    timeout: 120_000,
  },
});
