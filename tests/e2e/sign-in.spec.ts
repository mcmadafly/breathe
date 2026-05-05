import { expect, test } from '@playwright/test';

test.describe('/sign-in', () => {
  test('page is not blank (SSR shell + main content)', async ({ page }) => {
    await page.goto('/sign-in', { waitUntil: 'load' });

    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    const main = page.locator('main');
    await expect(main).toBeVisible();

    const mainHtml = await main.innerHTML();
    expect(mainHtml.length).toBeGreaterThan(80);

    const pathname = new URL(page.url()).pathname.replace(/\/$/, '') || '/';

    if (pathname === '/sign-in') {
      await expect(page).toHaveTitle(/sign in/i);
      await expect(page.locator('[data-clerk-id^="clerk-sign-in"]')).toBeAttached();
    } else {
      await expect(page).toHaveURL(/\/$/);
      await expect(page).toHaveTitle(/breathe/i);
    }
  });
});
