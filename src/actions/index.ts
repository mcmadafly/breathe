import { ActionError, defineAction } from 'astro:actions';
import { and, asc, count, eq, max, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/db';
import { listTodoListsForUser } from '@/lib/db/todo-lists';
import { listTodosForUser } from '@/lib/db/todos';
import {
  fetchOwnedTodoRow,
  getTodoTableColumns,
  insertTodoDynamic,
  todosSupportsListJoin,
  todosSupportsPosition,
  updateTodoContentDynamic,
  updateTodoPositionsRaw,
  updateTodoToggleDynamic,
} from '@/lib/db/todo-table-capabilities';
import { todoLists, todos, users } from '@/lib/db/schema';
import { FREE_TODO_LIMIT, TODO_LIST_NAME_MAX_LENGTH, TODO_CONTENT_MAX_LENGTH } from '@/lib/todo-limits';
import { splitTodoContent } from '@/lib/todo-text';
import { toTodoWire, todoSync } from '@/lib/todo-sync';

async function requireUserId(context: { locals: App.Locals }) {
  const session = context.locals.session;
  const id = session?.user?.id;
  if (!id) {
    throw new ActionError({ code: 'UNAUTHORIZED', message: 'Sign in required' });
  }
  return id;
}

async function getOwnedTodo(userId: string, todoId: string) {
  return fetchOwnedTodoRow(userId, todoId);
}

async function getDefaultListId(userId: string): Promise<string> {
  const row = await db
    .select({ id: todoLists.id })
    .from(todoLists)
    .where(eq(todoLists.userId, userId))
    .orderBy(asc(todoLists.position), asc(todoLists.createdAt))
    .limit(1)
    .get();
  if (!row?.id) {
    throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'No list available' });
  }
  return row.id;
}

async function assertListOwned(userId: string, listId: string) {
  const row = await db
    .select({ id: todoLists.id })
    .from(todoLists)
    .where(and(eq(todoLists.id, listId), eq(todoLists.userId, userId)))
    .get();
  if (!row) {
    throw new ActionError({ code: 'NOT_FOUND', message: 'List not found' });
  }
}

export const server = {
  listTodoLists: defineAction({
    accept: 'json',
    input: z.object({}),
    handler: async (_input, context) => {
      const userId = await requireUserId(context);
      return listTodoListsForUser(userId);
    },
  }),

  listTodos: defineAction({
    accept: 'json',
    input: z.object({}),
    handler: async (_input, context) => {
      const userId = await requireUserId(context);
      return listTodosForUser(userId);
    },
  }),

  upgradeToPro: defineAction({
    accept: 'json',
    input: z.object({}),
    handler: async (_input, context) => {
      const userId = await requireUserId(context);
      await db.update(users).set({ isPro: true }).where(eq(users.id, userId));
      return { ok: true as const };
    },
  }),

  createTodoList: defineAction({
    accept: 'json',
    input: z.object({
      name: z.string().trim().min(1).max(TODO_LIST_NAME_MAX_LENGTH),
    }),
    handler: async (input, context) => {
      const userId = await requireUserId(context);
      const [mx] = await db
        .select({ v: max(todoLists.position) })
        .from(todoLists)
        .where(eq(todoLists.userId, userId));
      const position = Number(mx?.v ?? -1) + 1;
      const id = crypto.randomUUID();
      const now = new Date();
      await db.insert(todoLists).values({
        id,
        userId,
        name: input.name.trim(),
        position,
        createdAt: now,
        updatedAt: now,
      });
      const created = await db.select().from(todoLists).where(eq(todoLists.id, id)).get();
      return created!;
    },
  }),

  updateTodoList: defineAction({
    accept: 'json',
    input: z.object({
      id: z.string().min(1),
      name: z.string().trim().min(1).max(TODO_LIST_NAME_MAX_LENGTH),
    }),
    handler: async (input, context) => {
      const userId = await requireUserId(context);
      const row = await db
        .select()
        .from(todoLists)
        .where(and(eq(todoLists.id, input.id), eq(todoLists.userId, userId)))
        .get();
      if (!row) {
        throw new ActionError({ code: 'NOT_FOUND', message: 'List not found' });
      }
      const now = new Date();
      await db
        .update(todoLists)
        .set({ name: input.name.trim(), updatedAt: now })
        .where(eq(todoLists.id, input.id));
      return { ...row, name: input.name.trim(), updatedAt: now };
    },
  }),

  deleteTodoList: defineAction({
    accept: 'json',
    input: z.object({ id: z.string().min(1) }),
    handler: async (input, context) => {
      const userId = await requireUserId(context);
      const row = await db
        .select()
        .from(todoLists)
        .where(and(eq(todoLists.id, input.id), eq(todoLists.userId, userId)))
        .get();
      if (!row) {
        throw new ActionError({ code: 'NOT_FOUND', message: 'List not found' });
      }
      const cols = await getTodoTableColumns();
      let n = 0;
      if (cols.has('list_id')) {
        const [countRow] = await db
          .select({ n: count() })
          .from(todos)
          .where(eq(todos.listId, input.id));
        n = Number(countRow?.n ?? 0);
      }
      if (n > 0) {
        throw new ActionError({
          code: 'FORBIDDEN',
          message: 'Move or delete todos in this list before deleting it.',
        });
      }
      const listCount = (await listTodoListsForUser(userId)).length;
      if (listCount <= 1) {
        throw new ActionError({
          code: 'FORBIDDEN',
          message: 'You need at least one list.',
        });
      }
      await db.delete(todoLists).where(eq(todoLists.id, input.id));
      return { ok: true as const };
    },
  }),

  createTodo: defineAction({
    accept: 'json',
    input: z.object({
      title: z.string().min(1).max(TODO_CONTENT_MAX_LENGTH),
      listId: z.string().min(1).optional(),
    }),
    handler: async (input, context) => {
      const userId = await requireUserId(context);
      const isPro = context.locals.isPro;

      const { title, body } = splitTodoContent(input.title);
      if (!title) {
        throw new ActionError({ code: 'BAD_REQUEST', message: 'Add some text for this task.' });
      }

      if (!isPro) {
        const [countRow] = await db
          .select({ n: count() })
          .from(todos)
          .where(eq(todos.userId, userId));
        const existing = Number(countRow?.n ?? 0);
        if (existing >= FREE_TODO_LIMIT) {
          throw new ActionError({
            code: 'FORBIDDEN',
            message: `Free tier is limited to ${FREE_TODO_LIMIT} items. Upgrade to add more.`,
          });
        }
      }

      const defaultListId = await getDefaultListId(userId);
      let listId = defaultListId;
      if (isPro && input.listId) {
        await assertListOwned(userId, input.listId);
        listId = input.listId;
      }

      const cols = await getTodoTableColumns();
      let position = 0;
      if (todosSupportsPosition(cols) && todosSupportsListJoin(cols)) {
        const [posRow] = await db
          .select({ v: max(todos.position) })
          .from(todos)
          .where(and(eq(todos.userId, userId), eq(todos.listId, listId)));
        position = Number(posRow?.v ?? -1) + 1;
      }

      const id = crypto.randomUUID();
      const now = new Date();
      await insertTodoDynamic({
        id,
        userId,
        title,
        body,
        listId,
        position,
        createdAt: now,
        updatedAt: now,
      });
      const created = await fetchOwnedTodoRow(userId, id);
      if (!created) {
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Todo could not be loaded after create' });
      }
      if (created) todoSync.publish(userId, { type: 'todo:created', todo: toTodoWire(created) });
      return created!;
    },
  }),

  reorderTodos: defineAction({
    accept: 'json',
    input: z.object({
      listId: z.string().min(1),
      orderedIds: z.array(z.string().min(1)),
    }),
    handler: async (input, context) => {
      const userId = await requireUserId(context);
      const cols = await getTodoTableColumns();
      if (!todosSupportsPosition(cols) || !todosSupportsListJoin(cols)) {
        throw new ActionError({
          code: 'PRECONDITION_FAILED',
          message: 'Todo reorder needs a migrated database (list + position columns). Run npm run db:push.',
        });
      }
      await assertListOwned(userId, input.listId);
      const rows = await db.all<{ id: string }>(sql`
        SELECT todos.id AS id
        FROM todos
        WHERE todos.user_id = ${userId} AND todos.list_id = ${input.listId}
      `);
      if (rows.length !== input.orderedIds.length) {
        throw new ActionError({ code: 'BAD_REQUEST', message: 'Todo order mismatch' });
      }
      const ids = new Set(rows.map((r) => r.id));
      for (const id of input.orderedIds) {
        if (!ids.has(id)) {
          throw new ActionError({ code: 'BAD_REQUEST', message: 'Todo order mismatch' });
        }
      }
      const now = new Date();
      await updateTodoPositionsRaw(input.orderedIds, now);
      todoSync.publish(userId, { type: 'todos:reordered' });
      return { ok: true as const };
    },
  }),

  updateTodoTitle: defineAction({
    accept: 'json',
    input: z.object({
      id: z.string().min(1),
      title: z.string().min(1).max(TODO_CONTENT_MAX_LENGTH),
    }),
    handler: async (input, context) => {
      const userId = await requireUserId(context);
      const row = await getOwnedTodo(userId, input.id);
      if (!row) {
        throw new ActionError({ code: 'NOT_FOUND', message: 'Todo not found' });
      }
      const { title, body } = splitTodoContent(input.title);
      if (!title) {
        throw new ActionError({ code: 'BAD_REQUEST', message: 'Add some text for this task.' });
      }
      const now = new Date();
      await updateTodoContentDynamic({
        id: input.id,
        userId,
        title,
        body,
        updatedAt: now,
      });
      const updated = await fetchOwnedTodoRow(userId, input.id);
      if (!updated) {
        throw new ActionError({ code: 'NOT_FOUND', message: 'Todo not found' });
      }
      todoSync.publish(userId, { type: 'todo:updated', todo: toTodoWire(updated) });
      return updated;
    },
  }),

  toggleTodo: defineAction({
    accept: 'json',
    input: z.object({
      id: z.string().min(1),
      done: z.boolean(),
    }),
    handler: async (input, context) => {
      const userId = await requireUserId(context);
      const row = await getOwnedTodo(userId, input.id);
      if (!row) {
        throw new ActionError({ code: 'NOT_FOUND', message: 'Todo not found' });
      }
      const now = new Date();
      await updateTodoToggleDynamic({ id: input.id, userId, done: input.done, updatedAt: now });
      const updated = await fetchOwnedTodoRow(userId, input.id);
      if (!updated) {
        throw new ActionError({ code: 'NOT_FOUND', message: 'Todo not found' });
      }
      todoSync.publish(userId, { type: 'todo:updated', todo: toTodoWire(updated) });
      return updated;
    },
  }),

  deleteTodo: defineAction({
    accept: 'json',
    input: z.object({ id: z.string().min(1) }),
    handler: async (input, context) => {
      const userId = await requireUserId(context);
      const row = await getOwnedTodo(userId, input.id);
      if (!row) {
        throw new ActionError({ code: 'NOT_FOUND', message: 'Todo not found' });
      }
      await db.delete(todos).where(eq(todos.id, input.id));
      todoSync.publish(userId, { type: 'todo:deleted', id: input.id });
      return { ok: true as const };
    },
  }),
};
