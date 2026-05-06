import { defineRelations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  isPro: integer('is_pro', { mode: 'boolean' }).notNull().default(false),
  /** `monthly` | `lifetime` (Stripe) | `complimentary` (free unlock). Null when not Pro or legacy row. */
  proPlan: text('pro_plan'),
  stripeCustomerId: text('stripe_customer_id'),
  /** Present for active monthly subscriptions; used for billing UI and webhook sync. */
  stripeSubscriptionId: text('stripe_subscription_id'),
});

export const todoLists = sqliteTable('todo_lists', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  position: integer('position').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const todos = sqliteTable('todos', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  /** Text beyond the todo title character limit; continuation of the same item. */
  body: text('body').notNull().default(''),
  /** @deprecated Use `listId`. Retained for migration; new writes use a placeholder. */
  category: text('category').notNull().default('work'),
  listId: text('list_id').references(() => todoLists.id, { onDelete: 'restrict' }),
  /** Order within `listId` (0 = top). */
  position: integer('position').notNull().default(0),
  done: integer('done', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const schemaTables = { users, todoLists, todos };

export const relations = defineRelations(schemaTables, (r) => ({
  users: {
    todos: r.many.todos(),
    todoLists: r.many.todoLists(),
  },
  todoLists: {
    user: r.one.users({ from: r.todoLists.userId, to: r.users.id }),
    todos: r.many.todos(),
  },
  todos: {
    user: r.one.users({ from: r.todos.userId, to: r.users.id }),
    list: r.one.todoLists({ from: r.todos.listId, to: r.todoLists.id, optional: true }),
  },
}));
