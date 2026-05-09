import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function getSubscriberBannerDismissed(userId: string): Promise<boolean> {
  try {
    const row = await db
      .select({ dismissed: users.subscriberBannerDismissed })
      .from(users)
      .where(eq(users.id, userId))
      .get();
    return Boolean(row?.dismissed);
  } catch {
    return false;
  }
}

export async function setSubscriberBannerDismissed(userId: string, dismissed: boolean): Promise<void> {
  await db.update(users).set({ subscriberBannerDismissed: dismissed }).where(eq(users.id, userId));
}
