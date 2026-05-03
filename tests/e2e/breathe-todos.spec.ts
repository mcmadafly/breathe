import { expect, test, type Page } from '@playwright/test';

/** Sets the composer title; `onInput` on the textarea keeps React state in sync with programmatic input. */
async function setTodoComposerTitle(page: Page, value: string) {
  const ta = page.locator('main').locator('#new-todo');
  await ta.evaluate((el, v) => {
    const t = el as HTMLTextAreaElement;
    const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    set?.call(t, v);
    t.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: v }));
  }, value);
}

test.describe.configure({ mode: 'serial' });

test.describe('/breathe todo tasks', () => {
  test('add task appears in list', async ({ page }) => {
    const label = `pw-todo-${Date.now()}`;
    await page.goto('/breathe', { waitUntil: 'load' });
    const field = page.getByRole('textbox', { name: 'New item' });
    await expect(field).toBeVisible({ timeout: 20_000 });
    await field.click();
    await setTodoComposerTitle(page, label);
    const addBtn = page.getByRole('button', { name: 'Add task' });
    await expect(addBtn).toBeEnabled({ timeout: 20_000 });
    await addBtn.click();

    await expect(page.getByText(label, { exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test('toggle done shows strikethrough styling class', async ({ page }) => {
    const label = `pw-done-${Date.now()}`;
    await page.goto('/breathe', { waitUntil: 'load' });
    const field = page.getByRole('textbox', { name: 'New item' });
    await expect(field).toBeVisible({ timeout: 20_000 });
    await field.click();
    await setTodoComposerTitle(page, label);
    const addBtn = page.getByRole('button', { name: 'Add task' });
    await expect(addBtn).toBeEnabled({ timeout: 20_000 });
    await addBtn.click();
    await expect(page.getByText(label, { exact: true })).toBeVisible({ timeout: 15_000 });

    const row = page.locator('li', { hasText: label });
    await row.getByRole('checkbox', { name: 'Mark done' }).click();
    await expect(row.locator('p')).toHaveClass(/line-through/);
  });
});
