import { expect, test } from '@playwright/test';

const e2eSignOutCountKey = 'e2e_sign_out_n';

test.describe('sign out', () => {
  test('single click invokes Clerk.signOut (patched after Clerk loads)', async ({ page }) => {
    await page.goto('/e2e/sign-out-probe', { waitUntil: 'load' });
    const btn = page.getByRole('button', { name: /e2e sign out/i });
    await expect(btn).toBeVisible({ timeout: 20_000 });

    // `clerk.browser.js` overwrites `window.Clerk` with a data descriptor, so init-script
    // accessors cannot wrap assignment. Patch the live instance after `load()` finishes.
    await page.waitForFunction(
      () =>
        Boolean(
          typeof window.Clerk === 'object' &&
            window.Clerk &&
            (window.Clerk as { loaded?: boolean }).loaded === true &&
            typeof (window.Clerk as { signOut?: unknown }).signOut === 'function',
        ),
      { timeout: 30_000 },
    );

    await page.evaluate((key) => {
      const clerk = window.Clerk as {
        signOut: (o?: { redirectUrl?: string }) => Promise<void>;
      };
      clerk.signOut = async function e2ePatchedSignOut(opts?: { redirectUrl?: string }) {
        sessionStorage.setItem(key, String(Number(sessionStorage.getItem(key) ?? '0') + 1));
        window.location.href = opts?.redirectUrl ?? '/';
      };
    }, e2eSignOutCountKey);

    await btn.click();
    await expect
      .poll(() => page.evaluate((k) => sessionStorage.getItem(k), e2eSignOutCountKey), {
        timeout: 12_000,
      })
      .toBe('1');
    await expect(page).toHaveURL(/\/mit-license(\?.*)?$/);
  });
});
