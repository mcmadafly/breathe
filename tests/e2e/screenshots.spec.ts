import { test, expect } from '@playwright/test';

const routes = ['/', '/sign-in', '/upgrade', '/mit-license', '/breathe'] as const;

for (const path of routes) {
  test(`screenshot: ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'load' });
    await expect(page).toHaveTitle(/breathe/i);
    await page.screenshot({
      path: `test-results/screens/${path === '/' ? 'home' : path.slice(1)}.png`,
      fullPage: true,
    });
  });
}
