import { expect, test } from '@playwright/test';

test.describe('/upgrade', () => {
  test('page is not blank (pro banner or upgrade plans)', async ({ page }) => {
    await page.goto('/upgrade', { waitUntil: 'load' });
    await expect(page).toHaveURL(/\/upgrade(\?.*)?$/);
    await expect(page).toHaveTitle(/upgrade/i);

    await expect(page.locator('header.site-header-root')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('footer')).toBeVisible();

    const main = page.locator('main');
    await expect(main).toBeVisible();

    await expect(main.getByText(/Upgrade Breathe|Breathe Pro|Your subscription/)).toBeVisible({ timeout: 15_000 });

    const mainText = (await main.innerText()).trim();
    expect(mainText.length).toBeGreaterThan(60);
  });
});
