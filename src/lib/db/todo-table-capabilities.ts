import { sql } from 'drizzle-orm';

import { db, libsqlClient } from '@/lib/db';
import { mapSqliteTodoRow, pragmaNameCell, type TodoSqliteRow } from '@/lib/db/todo-row-mapper';
import { mergeTodoContent } from '@/lib/todo-text';

export type { TodoSqliteRow };

/** SQLite column names on `todos`, lowercase as returned by PRAGMA. */
const TODO_OPTIONAL_SQL_COLS = ['category', 'list_id', 'body', 'position'] as const;

/** Minimum columns required for the app to function. */
const TODO_REQUIRED_SQL_COLS = ['id', 'user_id', 'title', 'done', 'created_at', 'updated_at'] as const;

let cachedColumns: ReadonlySet<string> | null = null;

export function clearTodoTableColumnsCache(): void {
  cachedColumns = null;
}

export async function getTodoTableColumns(): Promise<ReadonlySet<string>> {
  if (cachedColumns) return cachedColumns;
  const pragmaRows = await db.all<Record<string, unknown>>(sql`PRAGMA table_info(todos)`);
  const names = new Set(
    pragmaRows
      .map((r) => pragmaNameCell(r))
      .filter((n) => n.length > 0),
  );
  if (names.size === 0) {
    throw new Error('Database error: `todos` table is missing or has no columns.');
  }
  for (const c of TODO_REQUIRED_SQL_COLS) {
    if (!names.has(c)) {
      throw new Error(`Database incompatible: todos.${c} is required. Run migrations (npm run db:push).`);
    }
  }
  cachedColumns = names;
  return cachedColumns;
}

export function todosSupportsListJoin(cols: ReadonlySet<string>): boolean {
  return cols.has('list_id');
}

export function todosSupportsPosition(cols: ReadonlySet<string>): boolean {
  return cols.has('position');
}

export function todosSupportsBody(cols: ReadonlySet<string>): boolean {
  return cols.has('body');
}

function selectColsForTable(cols: ReadonlySet<string>): string {
  const parts = [...TODO_REQUIRED_SQL_COLS];
  for (const c of TODO_OPTIONAL_SQL_COLS) {
    if (cols.has(c)) parts.push(c);
  }
  return parts.map((c) => `todos.${c}`).join(', ');
}

export async function listTodosForUser(userId: string): Promise<TodoSqliteRow[]> {
  const cols = await getTodoTableColumns();
  const list = selectColsForTable(cols);
  const orderWithPosition = cols.has('position')
    ? 'todo_lists.position ASC, todo_lists.created_at ASC, todos.position ASC, todos.created_at ASC'
    : 'todo_lists.position ASC, todo_lists.created_at ASC, todos.created_at ASC';
  const orderNoJoin = cols.has('position')
    ? 'todos.position ASC, todos.created_at ASC'
    : 'todos.created_at ASC';

  if (todosSupportsListJoin(cols)) {
    const rows = await db.all<Record<string, unknown>>(sql`
      SELECT ${sql.raw(list)}
      FROM todos
      INNER JOIN todo_lists ON todos.list_id = todo_lists.id
      WHERE todos.user_id = ${userId}
      ORDER BY ${sql.raw(orderWithPosition)}
    `);
    return rows.map(mapSqliteTodoRow);
  }

  const rows = await db.all<Record<string, unknown>>(sql`
    SELECT ${sql.raw(list)}
    FROM todos
    WHERE todos.user_id = ${userId}
    ORDER BY ${sql.raw(orderNoJoin)}
  `);
  return rows.map(mapSqliteTodoRow);
}

export async function fetchOwnedTodoRow(userId: string, todoId: string): Promise<TodoSqliteRow | undefined> {
  const cols = await getTodoTableColumns();
  const list = selectColsForTable(cols);
  const row = await db.get<Record<string, unknown>>(sql`
    SELECT ${sql.raw(list)}
    FROM todos
    WHERE todos.id = ${todoId} AND todos.user_id = ${userId}
    LIMIT 1
  `);
  if (!row) return undefined;
  return mapSqliteTodoRow(row);
}

export async function insertTodoDynamic(input: {
  id: string;
  userId: string;
  title: string;
  body: string;
  listId: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}): Promise<void> {
  const cols = await getTodoTableColumns();
  const columns: string[] = [];
  const args: unknown[] = [];

  const push = (name: string, value: unknown) => {
    if (!cols.has(name)) return;
    columns.push(name);
    args.push(value);
  };

  push('id', input.id);
  push('user_id', input.userId);

  if (todosSupportsBody(cols)) {
    push('title', input.title);
    push('body', input.body);
  } else {
    push('title', mergeTodoContent(input.title, input.body));
  }

  push('done', 0);
  push('created_at', input.createdAt.getTime());
  push('updated_at', input.updatedAt.getTime());
  if (cols.has('category')) push('category', 'work');
  if (todosSupportsListJoin(cols)) push('list_id', input.listId);
  if (todosSupportsPosition(cols)) push('position', input.position);

  if (columns.length === 0) throw new Error('insertTodoDynamic: no columns');

  const placeholders = columns.map(() => '?').join(', ');
  await libsqlClient.execute({
    sql: `INSERT INTO todos (${columns.join(', ')}) VALUES (${placeholders})`,
    args,
  });
}

export async function updateTodoContentDynamic(input: {
  id: string;
  userId: string;
  title: string;
  body: string;
  updatedAt: Date;
}): Promise<void> {
  const cols = await getTodoTableColumns();
  const sets: string[] = [];
  const args: unknown[] = [];

  if (todosSupportsBody(cols)) {
    if (cols.has('title')) {
      sets.push('title = ?');
      args.push(input.title);
    }
    if (cols.has('body')) {
      sets.push('body = ?');
      args.push(input.body);
    }
  } else if (cols.has('title')) {
    sets.push('title = ?');
    args.push(mergeTodoContent(input.title, input.body));
  }

  if (cols.has('updated_at')) {
    sets.push('updated_at = ?');
    args.push(input.updatedAt.getTime());
  }

  if (sets.length === 0) return;

  args.push(input.id, input.userId);
  await libsqlClient.execute({
    sql: `UPDATE todos SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`,
    args,
  });
}

export async function updateTodoToggleDynamic(input: {
  id: string;
  userId: string;
  done: boolean;
  updatedAt: Date;
}): Promise<void> {
  const cols = await getTodoTableColumns();
  const sets: string[] = [];
  const args: unknown[] = [];

  if (cols.has('done')) {
    sets.push('done = ?');
    args.push(input.done ? 1 : 0);
  }
  if (cols.has('updated_at')) {
    sets.push('updated_at = ?');
    args.push(input.updatedAt.getTime());
  }

  if (sets.length === 0) return;

  args.push(input.id, input.userId);
  await libsqlClient.execute({
    sql: `UPDATE todos SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`,
    args,
  });
}

export async function updateTodoPositionsRaw(orderedIds: string[], updatedAt: Date): Promise<void> {
  let i = 0;
  for (const id of orderedIds) {
    await libsqlClient.execute({
      sql: 'UPDATE todos SET position = ?, updated_at = ? WHERE id = ?',
      args: [i, updatedAt.getTime(), id],
    });
    i += 1;
  }
}
