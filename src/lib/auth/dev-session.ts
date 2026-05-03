import type { Session } from '@auth/core/types';

/** Stable local user for SKIP_AUTH / todo testing (no OAuth). */
export const DEV_USER_ID = 'dev-local-user';

export function getDevSession(): Session {
  return {
    user: {
      id: DEV_USER_ID,
      email: 'dev@scribbbles.local',
      name: 'Local dev',
    },
    expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

function rawSkipAuth(): string | undefined {
  return (
    import.meta.env.SKIP_AUTH ??
    (typeof process !== 'undefined' ? process.env.SKIP_AUTH : undefined)
  );
}

export function isSkipAuth(): boolean {
  const v = rawSkipAuth();
  if (v === undefined || v === '') return false;
  const s = String(v).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}
