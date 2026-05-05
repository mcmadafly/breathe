import type { User } from '@clerk/backend';
import type { APIContext } from 'astro';
import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';
import { eq } from 'drizzle-orm';

import {
  ensureAnonymousSession,
  isAnonymousUserId,
  mergeAnonymousSessionIntoUser,
  routeNeedsAnonymousSession,
} from '@/lib/auth/anonymous-session';
import { ensureUser } from '@/lib/auth/ensure-user';
import { getDevSession, isForcePro, isSkipAuth } from '@/lib/auth/dev-session';
import type { AppSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { ensureTodoListsAndMigrate } from '@/lib/db/todo-lists';
import { users } from '@/lib/db/schema';

const isProtectedRoute = createRouteMatcher(['/upgrade(.*)']);

function clerkUserToSession(user: User): AppSession {
  const email =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    null;
  return {
    user: {
      id: user.id,
      email: email ?? undefined,
      name: user.fullName ?? user.username ?? undefined,
      image: user.imageUrl ?? undefined,
    },
  };
}

async function refreshProStatus(context: APIContext) {
  if (isForcePro()) {
    context.locals.isPro = true;
    return;
  }
  const uid = context.locals.session?.user?.id;
  if (!uid) {
    context.locals.isPro = false;
    return;
  }
  if (isAnonymousUserId(uid)) {
    context.locals.isPro = false;
    return;
  }
  const row = await db.select({ isPro: users.isPro }).from(users).where(eq(users.id, uid)).get();
  context.locals.isPro = Boolean(row?.isPro);
}

export const onRequest = clerkMiddleware(async (auth, context, next) => {
  context.locals.isPro = false;
  context.locals.session = null;
  context.locals.isAnonymous = false;

  const pathname = context.url.pathname.replace(/\/$/, '') || '/';

  if (pathname === '/signin') {
    return context.redirect('/sign-in');
  }

  if (isSkipAuth()) {
    if (pathname === '/sign-in' || pathname === '/sign-up') {
      return context.redirect('/');
    }
    const session = getDevSession();
    context.locals.session = session;
    await ensureUser(session);
    if (session.user?.id) {
      await ensureTodoListsAndMigrate(session.user.id);
    }
    await refreshProStatus(context);
    return next();
  }

  const { isAuthenticated, userId } = auth();

  if (isAuthenticated && userId) {
    await mergeAnonymousSessionIntoUser(context, userId);

    const user = await context.locals.currentUser();
    if (user) {
      context.locals.session = clerkUserToSession(user);
    } else {
      context.locals.session = {
        user: {
          id: userId,
          email: `${userId}@users.clerk.local`,
        },
      };
    }
    await ensureUser(context.locals.session);
    if (context.locals.session?.user?.id) {
      await ensureTodoListsAndMigrate(context.locals.session.user.id);
    }
  } else if (routeNeedsAnonymousSession(pathname, context.url.searchParams)) {
    const anonSession = await ensureAnonymousSession(context);
    if (anonSession?.user?.id) {
      context.locals.session = anonSession;
      context.locals.isAnonymous = true;
      await ensureTodoListsAndMigrate(anonSession.user.id);
    }
  }

  await refreshProStatus(context);

  if (isProtectedRoute(context.request)) {
    if (!context.locals.session?.user?.id || context.locals.isAnonymous) {
      return context.redirect('/sign-in');
    }
  }

  return next();
});
