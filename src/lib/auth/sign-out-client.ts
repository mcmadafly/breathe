import { $clerkStore } from '@clerk/astro/client';

/** Client-only: sign out via Clerk when available. */
export async function signOutClerk(redirectUrl = '/') {
  const clerk = $clerkStore.get();
  if (clerk) {
    await clerk.signOut({ redirectUrl });
    return;
  }
  window.location.href = redirectUrl;
}
