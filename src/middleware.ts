import { defineMiddleware } from 'astro:middleware';
import type { APIContext } from 'astro';
import { eq } from 'drizzle-orm';
import { getSession } from 'auth-astro/server';

import { ensureUser } from '@/lib/auth/ensure-user';
import { getDevSession, isSkipAuth } from '@/lib/auth/dev-session';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

async function refreshProStatus(context: APIContext) {
  const uid = context.locals.session?.user?.id;
  if (!uid) {
    context.locals.isPro = false;
    return;
  }
  const row = await db.select({ isPro: users.isPro }).from(users).where(eq(users.id, uid)).get();
  context.locals.isPro = Boolean(row?.isPro);
}

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.isPro = false;

  if (isSkipAuth()) {
    const pathname = context.url.pathname.replace(/\/$/, '') || '/';
    if (pathname === '/' || pathname === '/signin') {
      return context.redirect('/app');
    }

    const session = getDevSession();
    context.locals.session = session;
    await ensureUser(session);
    await refreshProStatus(context);
    return next();
  }

  const session = await getSession(context.request);
  context.locals.session = session;

  if (session) {
    await ensureUser(session);
    await refreshProStatus(context);
  }

  if (context.url.pathname.startsWith('/app')) {
    if (!session) {
      return context.redirect('/signin');
    }
  }

  return next();
});
