import { defineConfig, devices } from '@playwright/test';

/** Dedicated port so local `reuseExistingServer` never attaches to another app on :4321. */
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4378);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
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
      `SKIP_AUTH=true TURSO_DATABASE_URL="${process.env.TURSO_DATABASE_URL ?? 'file:./local.db'}" npm run dev -- --host 127.0.0.1 --port ` +
      String(port),
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
