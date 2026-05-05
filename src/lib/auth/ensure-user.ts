import { eq } from 'drizzle-orm';

import type { AppSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function ensureUser(session: AppSession) {
  const u = session.user;
  if (!u?.id) return;

  const id = u.id;
  const email = u.email ?? `${id}@users.local`;

  try {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).get();
    if (existing) return;
  } catch (err) {
    console.error('[ensureUser] failed to check existing user', err);
    return;
  }

  try {
    await db.insert(users).values({
      id,
      email,
      name: u.name ?? null,
      image: u.image ?? null,
      createdAt: new Date(),
      isPro: false,
    });
  } catch (err) {
    console.error('[ensureUser] failed to insert user', err);
  }
}
