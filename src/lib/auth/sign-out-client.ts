import { $clerkStore } from '@clerk/astro/client';

type ClerkLike = { signOut: (opts?: { redirectUrl?: string }) => Promise<void> };

function getWindowClerk(): ClerkLike | null {
  if (typeof window === 'undefined') return null;
  const c = (window as unknown as { Clerk?: ClerkLike }).Clerk;
  return c && typeof c.signOut === 'function' ? c : null;
}

function resolveClerk(): ClerkLike | null {
  return getWindowClerk() ?? $clerkStore.get();
}

/**
 * Client-only: sign out via Clerk. Waits for `clerk-js` / `$clerkStore` so the first click works
 * (otherwise we fell back to `location.assign` without clearing the session).
 */
export async function signOutClerk(redirectUrl = '/') {
  const deadline = Date.now() + 10_000;
  let clerk = resolveClerk();
  while (!clerk && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 50));
    clerk = resolveClerk();
  }
  if (clerk) {
    await clerk.signOut({ redirectUrl });
    return;
  }
  window.location.assign(redirectUrl);
}
