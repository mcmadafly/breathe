import { TODO_BODY_MAX_LENGTH, TODO_TITLE_MAX_LENGTH } from '@/lib/todo-limits';

/** Split user text into list line (title) vs overflow (body). */
export function splitTodoContent(raw: string): { title: string; body: string } {
  const t = raw.trim();
  if (t.length === 0) {
    return { title: '', body: '' };
  }
  if (t.length <= TODO_TITLE_MAX_LENGTH) {
    return { title: t, body: '' };
  }
  const title = t.slice(0, TODO_TITLE_MAX_LENGTH);
  let body = t.slice(TODO_TITLE_MAX_LENGTH);
  if (body.length > TODO_BODY_MAX_LENGTH) {
    body = body.slice(0, TODO_BODY_MAX_LENGTH);
  }
  return { title, body };
}

export function mergeTodoContent(title: string, body: string): string {
  const b = body ?? '';
  if (!b) return title;
  return title + b;
}
