import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  isPro: integer('is_pro', { mode: 'boolean' }).notNull().default(false),
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

export const usersRelations = relations(users, ({ many }) => ({
  todos: many(todos),
  todoLists: many(todoLists),
}));

export const todoListsRelations = relations(todoLists, ({ one, many }) => ({
  user: one(users, { fields: [todoLists.userId], references: [users.id] }),
  todos: many(todos),
}));

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

export const todosRelations = relations(todos, ({ one }) => ({
  user: one(users, {
    fields: [todos.userId],
    references: [users.id],
  }),
  list: one(todoLists, {
    fields: [todos.listId],
    references: [todoLists.id],
  }),
}));
