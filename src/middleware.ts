import type { User } from '@clerk/backend';
import type { APIContext } from 'astro';
import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';

import {
  ensureAnonymousSession,
  isAnonymousUserId,
  mergeAnonymousSessionIntoUser,
  routeNeedsAnonymousSession,
} from '@/lib/auth/anonymous-session';
import { ensureUser } from '@/lib/auth/ensure-user';
import { getDevSession, isForceFree, isForcePro, isSkipAuth } from '@/lib/auth/dev-session';
import type { AppSession } from '@/lib/auth/session';
import { getSubscriberBannerDismissed } from '@/lib/db/subscriber-banner-dismissed';
import { ensureTodoListsAndMigrate } from '@/lib/db/todo-lists';
import { getUserProState } from '@/lib/db/user-pro-state';

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
  if (isForceFree()) {
    context.locals.isPro = false;
    context.locals.proPlan = null;
    context.locals.stripeCustomerId = null;
    context.locals.stripeSubscriptionId = null;
    return;
  }
  if (isForcePro()) {
    context.locals.isPro = true;
    context.locals.proPlan = null;
    context.locals.stripeCustomerId = null;
    context.locals.stripeSubscriptionId = null;
    return;
  }
  const uid = context.locals.session?.user?.id;
  if (!uid) {
    context.locals.isPro = false;
    context.locals.proPlan = null;
    context.locals.stripeCustomerId = null;
    context.locals.stripeSubscriptionId = null;
    return;
  }
  if (isAnonymousUserId(uid)) {
    context.locals.isPro = false;
    context.locals.proPlan = null;
    context.locals.stripeCustomerId = null;
    context.locals.stripeSubscriptionId = null;
    return;
  }
  const row = await getUserProState(uid);
  context.locals.isPro = row.isPro;
  context.locals.proPlan = row.proPlan;
  context.locals.stripeCustomerId = row.stripeCustomerId;
  context.locals.stripeSubscriptionId = row.stripeSubscriptionId;
}

async function refreshSubscriberBannerDismissed(context: APIContext) {
  const uid = context.locals.session?.user?.id;
  if (!uid) {
    context.locals.subscriberBannerDismissed = false;
    return;
  }
  context.locals.subscriberBannerDismissed = await getSubscriberBannerDismissed(uid);
}

export const onRequest = clerkMiddleware(async (auth, context, next) => {
  context.locals.isPro = false;
  context.locals.proPlan = null;
  context.locals.stripeCustomerId = null;
  context.locals.stripeSubscriptionId = null;
  context.locals.subscriberBannerDismissed = false;
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
    await refreshSubscriberBannerDismissed(context);
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
  await refreshSubscriberBannerDismissed(context);

  if (isProtectedRoute(context.request)) {
    if (!context.locals.session?.user?.id || context.locals.isAnonymous) {
      return context.redirect('/sign-in');
    }
  }

  return next();
});
