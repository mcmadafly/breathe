import { ActionError, defineAction } from 'astro:actions';
import { and, count, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/lib/db';
import { todos, users } from '@/lib/db/schema';
import { DEFAULT_TODO_CATEGORY, todoCategoryZod } from '@/lib/todo-categories';
import { FREE_TODO_LIMIT } from '@/lib/todo-limits';

async function requireUserId(context: { locals: App.Locals }) {
  const session = context.locals.session;
  const id = session?.user?.id;
  if (!id) {
    throw new ActionError({ code: 'UNAUTHORIZED', message: 'Sign in required' });
  }
  return id;
}

async function getOwnedTodo(userId: string, todoId: string) {
  const row = await db
    .select()
    .from(todos)
    .where(and(eq(todos.id, todoId), eq(todos.userId, userId)))
    .get();
  return row;
}

export const server = {
  upgradeToPro: defineAction({
    accept: 'json',
    input: z.object({}),
    handler: async (_input, context) => {
      const userId = await requireUserId(context);
      await db.update(users).set({ isPro: true }).where(eq(users.id, userId));
      return { ok: true as const };
    },
  }),

  createTodo: defineAction({
    accept: 'json',
    input: z.object({
      title: z.string().trim().min(1).max(500),
      category: todoCategoryZod.optional(),
    }),
    handler: async (input, context) => {
      const userId = await requireUserId(context);
      const isPro = context.locals.isPro;

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

      const category =
        isPro && input.category ? input.category : DEFAULT_TODO_CATEGORY;

      const id = crypto.randomUUID();
      const now = new Date();
      await db.insert(todos).values({
        id,
        userId,
        title: input.title,
        category,
        done: false,
        createdAt: now,
        updatedAt: now,
      });
      const created = await db.select().from(todos).where(eq(todos.id, id)).get();
      return created!;
    },
  }),

  updateTodoTitle: defineAction({
    accept: 'json',
    input: z.object({
      id: z.string().min(1),
      title: z.string().trim().min(1).max(500),
    }),
    handler: async (input, context) => {
      const userId = await requireUserId(context);
      const row = await getOwnedTodo(userId, input.id);
      if (!row) {
        throw new ActionError({ code: 'NOT_FOUND', message: 'Todo not found' });
      }
      const now = new Date();
      await db
        .update(todos)
        .set({ title: input.title, updatedAt: now })
        .where(eq(todos.id, input.id));
      return { ...row, title: input.title, updatedAt: now };
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
      await db
        .update(todos)
        .set({ done: input.done, updatedAt: now })
        .where(eq(todos.id, input.id));
      return { ...row, done: input.done, updatedAt: now };
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
      return { ok: true as const };
    },
  }),
};
