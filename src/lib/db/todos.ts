import { desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { todos } from '@/lib/db/schema';

export async function listTodosForUser(userId: string) {
  return db.select().from(todos).where(eq(todos.userId, userId)).orderBy(desc(todos.createdAt)).all();
}
