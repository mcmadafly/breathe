import { and, asc, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { getTodoTableColumns } from '@/lib/db/todo-table-capabilities';
import { todoLists, todos } from '@/lib/db/schema';

/** Default names seeded for every account; duplicates come from concurrent first-seed races. */
const SEEDED_LIST_NAMES = new Set(['work', 'personal', 'home']);

export async function listTodoListsForUser(userId: string) {
  return db
    .select()
    .from(todoLists)
    .where(eq(todoLists.userId, userId))
    .orderBy(asc(todoLists.position), asc(todoLists.createdAt))
    .all();
}

type TodoListRow = typeof todoLists.$inferSelect;

async function dedupeSeededListCopies(userId: string, lists: TodoListRow[]) {
  const cols = await getTodoTableColumns();
  if (!cols.has('list_id')) return;

  const byKey = new Map<string, TodoListRow[]>();
  for (const l of lists) {
    const k = l.name.trim().toLowerCase();
    if (!SEEDED_LIST_NAMES.has(k)) continue;
    const arr = byKey.get(k) ?? [];
    arr.push(l);
    byKey.set(k, arr);
  }

  for (const arr of byKey.values()) {
    if (arr.length <= 1) continue;
    arr.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const keeper = arr[0]!;
    for (const dup of arr.slice(1)) {
      await db
        .update(todos)
        .set({ listId: keeper.id })
        .where(and(eq(todos.userId, userId), eq(todos.listId, dup.id)));
      await db.delete(todoLists).where(and(eq(todoLists.id, dup.id), eq(todoLists.userId, userId)));
    }
  }
}

const ensureChains = new Map<string, Promise<void>>();

/** Ensure default lists exist and migrate legacy `category` → `list_id`. Swallows DB errors so middleware/pages do not 500 when Turso is misconfigured. */
export async function ensureTodoListsAndMigrate(userId: string): Promise<void> {
  const prev = ensureChains.get(userId) ?? Promise.resolve();
  const run = async () => {
    await prev.catch(() => {});
    await ensureTodoListsAndMigrateCore(userId);
  };
  const p = run();
  ensureChains.set(userId, p);
  try {
    await p;
  } finally {
    if (ensureChains.get(userId) === p) {
      ensureChains.delete(userId);
    }
  }
}

async function ensureTodoListsAndMigrateCore(userId: string) {
  try {
    let lists = await listTodoListsForUser(userId);
    await dedupeSeededListCopies(userId, lists);
    lists = await listTodoListsForUser(userId);

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
  } catch (err) {
    const hint =
      err instanceof Error
        ? err.cause instanceof Error
          ? err.cause.message
          : err.message
        : String(err);
    console.warn(`[db] ensureTodoListsAndMigrate skipped: ${hint}`);
  }
}
