import type { APIContext } from 'astro';
import { eq } from 'drizzle-orm';

import type { AppSession } from '@/lib/auth/session';
import { ensureUser } from '@/lib/auth/ensure-user';
import { db } from '@/lib/db';
import { todoLists, todos, users } from '@/lib/db/schema';

/** HttpOnly cookie storing raw UUID (no `anon_` prefix). */
export const ANON_SESSION_COOKIE = 'spirare_anon';

const ANON_PREFIX = 'anon_';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function anonUserId(raw: string) {
  return `${ANON_PREFIX}${raw}`;
}

function isUuid(s: string) {
  return UUID_RE.test(s);
}

export function isAnonymousUserId(userId: string) {
  return userId.startsWith(ANON_PREFIX);
}

function anonCookieOptions() {
  return {
    path: '/' as const,
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 400,
  };
}

/**
 * Ensures anonymous browser cookie + `users` row; sets `locals.session` caller.
 */
export async function ensureAnonymousSession(context: APIContext): Promise<AppSession | null> {
  let raw = context.cookies.get(ANON_SESSION_COOKIE)?.value?.trim() ?? '';

  if (raw && !isUuid(raw)) {
    raw = '';
  }

  if (!raw) {
    raw = crypto.randomUUID();
    context.cookies.set(ANON_SESSION_COOKIE, raw, anonCookieOptions());
  }

  const id = anonUserId(raw);
  const email = `anon+${raw}@anonymous.local`;
  const session: AppSession = {
    user: { id, email, name: null, image: null },
  };

  await ensureUser(session);
  return session;
}

export function clearAnonymousSessionCookie(context: APIContext) {
  context.cookies.delete(ANON_SESSION_COOKIE, { path: '/' });
}

/**
 * Moves all lists/todos from anonymous user row to Clerk user, removes anon user.
 */
export async function mergeAnonymousSessionIntoUser(context: APIContext, clerkUserId: string) {
  const raw = context.cookies.get(ANON_SESSION_COOKIE)?.value?.trim() ?? '';
  if (!raw || !isUuid(raw)) {
    clearAnonymousSessionCookie(context);
    return;
  }

  const anonId = anonUserId(raw);
  if (anonId === clerkUserId) {
    clearAnonymousSessionCookie(context);
    return;
  }

  if (!isAnonymousUserId(anonId)) {
    clearAnonymousSessionCookie(context);
    return;
  }

  const anonRow = await db.select({ id: users.id }).from(users).where(eq(users.id, anonId)).get();
  if (!anonRow) {
    clearAnonymousSessionCookie(context);
    return;
  }

  await db.transaction(async (tx) => {
    await tx.update(todoLists).set({ userId: clerkUserId }).where(eq(todoLists.userId, anonId));
    await tx.update(todos).set({ userId: clerkUserId }).where(eq(todos.userId, anonId));
    await tx.delete(users).where(eq(users.id, anonId));
  });

  clearAnonymousSessionCookie(context);
}

/** Breathe, SSE, or Astro action RPC needs an anonymous identity when logged out. */
export function routeNeedsAnonymousSession(pathname: string, searchParams: URLSearchParams) {
  if (pathname === '/') return true;
  if (pathname === '/breathe' || pathname.startsWith('/breathe/')) return true;
  if (pathname === '/api/todos/stream') return true;
  if (pathname.includes('/_actions/')) return true;
  if (searchParams.has('_action')) return true;
  return false;
}
