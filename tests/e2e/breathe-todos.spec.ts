import { expect, test } from '@playwright/test';

function submitComposerForm(page: Page) {
  return page.locator('form').filter({ has: page.locator('#new-todo') }).evaluate((f) => {
    (f as HTMLFormElement).requestSubmit();
  });
}

test.describe('/breathe todo tasks', () => {
  test('add task then toggle done shows strikethrough', async ({ page }) => {
    test.setTimeout(90_000);
    const label = `pw-todo-${Date.now()}`;
    await page.goto('/breathe', { waitUntil: 'load' });
    const field = page.getByRole('textbox', { name: 'New item' });
    await expect(field).toBeVisible({ timeout: 20_000 });
    await field.click();
    await field.pressSequentially(label, { delay: 15 });
    await expect(field).toHaveValue(label, { timeout: 10_000 });
    await submitComposerForm(page);

    await expect(page.getByText(label, { exact: true })).toBeVisible({ timeout: 15_000 });

    const row = page.locator('li', { hasText: label });
    await row.getByRole('checkbox', { name: 'Mark done' }).click();
    await expect(row.locator('p')).toHaveClass(/line-through/);
  });
});
