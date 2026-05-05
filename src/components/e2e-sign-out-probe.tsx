import { signOutClerk } from '@/lib/auth/sign-out-client';

/** E2E-only page (`/e2e/sign-out-probe`); not linked in the app. */
export function E2eSignOutProbe() {
  return (
    <button type="button" onClick={() => void signOutClerk('/mit-license')}>
      E2E sign out
    </button>
  );
}
