import { asc, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { getTodoTableColumns } from '@/lib/db/todo-table-capabilities';
import { todoLists, todos } from '@/lib/db/schema';

export async function listTodoListsForUser(userId: string) {
  return db
    .select()
    .from(todoLists)
    .where(eq(todoLists.userId, userId))
    .orderBy(asc(todoLists.position), asc(todoLists.createdAt))
    .all();
}

/** Ensure default lists exist and migrate legacy `category` → `list_id`. */
export async function ensureTodoListsAndMigrate(userId: string) {
  let lists = await listTodoListsForUser(userId);
  const now = new Date();

  if (lists.length === 0) {
    const workId = crypto.randomUUID();
    const personalId = crypto.randomUUID();
    const homeId = crypto.randomUUID();
    await db.insert(todoLists).values([
      { id: workId, userId, name: 'Work', position: 0, createdAt: now, updatedAt: now },
      { id: personalId, userId, name: 'Personal', position: 1, createdAt: now, updatedAt: now },
      { id: homeId, userId, name: 'Home', position: 2, createdAt: now, updatedAt: now },
    ]);
    lists = await listTodoListsForUser(userId);
  }

  const byLowerName: Record<string, string> = {};
  for (const l of lists) {
    byLowerName[l.name.trim().toLowerCase()] = l.id;
  }

  const fallbackListId = lists[0]!.id;

  const cols = await getTodoTableColumns();
  if (!cols.has('list_id')) {
    return;
  }

  const selectParts = ['todos.id'];
  if (cols.has('category')) selectParts.push('todos.category');

  const orphans = await db.all<Record<string, unknown>>(sql`
    SELECT ${sql.raw(selectParts.join(', '))}
    FROM todos
    WHERE todos.user_id = ${userId} AND todos.list_id IS NULL
  `);

  for (const raw of orphans) {
    const id = String(raw.id ?? '');
    if (!id) continue;
    const cat = cols.has('category')
      ? String(raw.category ?? 'work').toLowerCase()
      : 'work';
    const lid = byLowerName[cat] ?? fallbackListId;
    await db.update(todos).set({ listId: lid }).where(eq(todos.id, id));
  }
}
