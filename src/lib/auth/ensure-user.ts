import type { Session } from '@auth/core/types';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function ensureUser(session: Session) {
  const u = session.user;
  if (!u?.id) return;

  const id = u.id;
  const email = u.email ?? `${id}@users.local`;

  const existing = await db.select().from(users).where(eq(users.id, id)).get();
  if (existing) return;

  await db.insert(users).values({
    id,
    email,
    name: u.name ?? null,
    image: u.image ?? null,
    createdAt: new Date(),
    isPro: false,
  });
}
