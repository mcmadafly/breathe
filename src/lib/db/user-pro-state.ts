import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export type UserProState = {
  isPro: boolean;
  proPlan: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

/**
 * Loads Pro/billing fields when the DB schema includes `pro_plan` / `stripe_customer_id`.
 * If those columns are missing (migration not applied), falls back to `is_pro` only so
 * requests keep working instead of failing every user lookup.
 */
export async function getUserProState(userId: string): Promise<UserProState> {
  try {
    const row = await db
      .select({
        isPro: users.isPro,
        proPlan: users.proPlan,
        stripeCustomerId: users.stripeCustomerId,
        stripeSubscriptionId: users.stripeSubscriptionId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .get();
    return {
      isPro: Boolean(row?.isPro),
      proPlan: row?.proPlan ?? null,
      stripeCustomerId: row?.stripeCustomerId ?? null,
      stripeSubscriptionId: row?.stripeSubscriptionId ?? null,
    };
  } catch (err) {
    console.warn(
      '[db] user billing columns unavailable (apply migrations / drizzle push); using is_pro only',
      err,
    );
    try {
      const row = await db
        .select({ isPro: users.isPro })
        .from(users)
        .where(eq(users.id, userId))
        .get();
      return {
        isPro: Boolean(row?.isPro),
        proPlan: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      };
    } catch (err2) {
      console.error('[db] user row read failed', err2);
      return {
        isPro: false,
        proPlan: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      };
    }
  }
}
