import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { TodoBoard } from '@/components/todo-board';

import { getTestLists, resetActionMocks } from './mocks/astro-actions';

afterEach(() => {
  cleanup();
  resetActionMocks();
});

function renderBoard() {
  resetActionMocks();
  return render(<TodoBoard initialTodos={[]} initialLists={getTestLists()} isPro={false} />);
}

describe('TodoBoard', () => {
  it('adds a task that appears in the list', async () => {
    const user = userEvent.setup();
    renderBoard();

    const field = screen.getByRole('textbox', { name: 'New item' });
    await user.click(field);
    const label = `rtl-todo-${Date.now()}`;
    await user.type(field, label);

    const add = screen.getByRole('button', { name: 'Add task' });
    expect(add).toBeEnabled();
    await user.click(add);

    expect(await screen.findByText(label, { exact: true })).toBeInTheDocument();
  });

  it('marks done and applies line-through on the title', async () => {
    const user = userEvent.setup();
    renderBoard();

    const field = screen.getByRole('textbox', { name: 'New item' });
    await user.click(field);
    const label = `rtl-done-${Date.now()}`;
    await user.type(field, label);
    await user.click(screen.getByRole('button', { name: 'Add task' }));
    const title = await screen.findByText(label, { exact: true });
    const row = title.closest('li');
    expect(row).toBeTruthy();
    const cb = within(row as HTMLElement).getByRole('checkbox', { name: 'Mark done' });
    await user.click(cb);

    expect(title).toHaveClass('line-through');
  });

  it('hides category navigation when anonymous', () => {
    render(<TodoBoard initialTodos={[]} initialLists={getTestLists()} isPro={false} isAnonymous />);
    expect(screen.queryByRole('tablist', { name: 'Categories' })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Categories' })).not.toBeInTheDocument();
  });

  it('hides list navigation for signed-in free tier (lists are Pro-only)', () => {
    render(<TodoBoard initialTodos={[]} initialLists={getTestLists()} isPro={false} />);
    expect(screen.queryByRole('tablist', { name: 'Categories' })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Categories' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Categories' })).not.toBeInTheDocument();
    expect(screen.queryByText(/show lists/i)).not.toBeInTheDocument();
  });
});
