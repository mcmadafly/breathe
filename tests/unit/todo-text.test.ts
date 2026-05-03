import { describe, expect, it } from 'vitest';

import { TODO_BODY_MAX_LENGTH, TODO_TITLE_MAX_LENGTH } from '@/lib/todo-limits';
import { mergeTodoContent, splitTodoContent } from '@/lib/todo-text';

describe('splitTodoContent', () => {
  it('trims and returns empty for whitespace-only', () => {
    expect(splitTodoContent('   ')).toEqual({ title: '', body: '' });
  });

  it('keeps short text in title only', () => {
    const t = 'a'.repeat(TODO_TITLE_MAX_LENGTH);
    expect(splitTodoContent(`  ${t}  `)).toEqual({ title: t, body: '' });
  });

  it('splits overflow into body at title limit', () => {
    const raw = 'a'.repeat(TODO_TITLE_MAX_LENGTH + 5);
    const { title, body } = splitTodoContent(raw);
    expect(title).toHaveLength(TODO_TITLE_MAX_LENGTH);
    expect(body).toBe('aaaaa');
  });

  it('caps body at TODO_BODY_MAX_LENGTH', () => {
    const raw = 'x'.repeat(TODO_TITLE_MAX_LENGTH) + 'y'.repeat(TODO_BODY_MAX_LENGTH + 10);
    const { body } = splitTodoContent(raw);
    expect(body).toHaveLength(TODO_BODY_MAX_LENGTH);
  });
});

describe('mergeTodoContent', () => {
  it('returns title when body empty', () => {
    expect(mergeTodoContent('hi', '')).toBe('hi');
    expect(mergeTodoContent('hi', null as unknown as string)).toBe('hi');
  });

  it('concatenates title and body', () => {
    expect(mergeTodoContent('ab', 'cd')).toBe('abcd');
  });
});
