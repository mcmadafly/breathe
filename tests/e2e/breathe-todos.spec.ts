import { test, expect } from '@playwright/test';

test.describe('/breathe todo tasks', () => {
  test('add task appears in list', async ({ page }) => {
    const label = `pw-todo-${Date.now()}`;
    await page.goto('/breathe', { waitUntil: 'load' });
    const field = page.getByPlaceholder('Add a task');
    await expect(field).toBeVisible({ timeout: 20_000 });
    await field.click();
    await field.fill(label);
    await page.getByRole('button', { name: 'Add task' }).click();

    await expect(page.getByText(label, { exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test('toggle done shows strikethrough styling class', async ({ page }) => {
    const label = `pw-done-${Date.now()}`;
    await page.goto('/breathe', { waitUntil: 'load' });
    const field = page.getByPlaceholder('Add a task');
    await expect(field).toBeVisible({ timeout: 20_000 });
    await field.click();
    await field.fill(label);
    await page.getByRole('button', { name: 'Add task' }).click();
    await expect(page.getByText(label, { exact: true })).toBeVisible({ timeout: 15_000 });

    const row = page.locator('li', { hasText: label });
    await row.getByRole('checkbox', { name: 'Mark done' }).click();
    await expect(row.locator('p')).toHaveClass(/line-through/);
  });
});
