import type { AppSession } from '@/lib/auth/session';

/** Stable local user for SKIP_AUTH / todo testing (no OAuth). */
export const DEV_USER_ID = 'dev-local-user';

export function getDevSession(): AppSession {
  return {
    user: {
      id: DEV_USER_ID,
      email: 'dev@breathe.local',
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

function rawForcePro(): string | undefined {
  return (
    import.meta.env.FORCE_PRO ??
    (typeof process !== 'undefined' ? process.env.FORCE_PRO : undefined)
  );
}

function truthyFlag(v: string | undefined): boolean {
  if (v === undefined || v === '') return false;
  const s = String(v).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

export function isSkipAuth(): boolean {
  return truthyFlag(rawSkipAuth());
}

export function isForcePro(): boolean {
  return truthyFlag(rawForcePro());
}
