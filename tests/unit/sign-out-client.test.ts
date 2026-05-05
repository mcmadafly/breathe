/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();

vi.mock('@clerk/astro/client', () => ({
  $clerkStore: { get: () => mockGet() },
}));

import { signOutClerk } from '@/lib/auth/sign-out-client';

describe('signOutClerk', () => {
  beforeEach(() => {
    mockGet.mockReset();
    delete (window as unknown as { Clerk?: unknown }).Clerk;
    vi.spyOn(window.location, 'assign').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('polls until clerk is available then calls signOut once', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    mockGet
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null)
      .mockReturnValue({ signOut });
    await signOutClerk('/done');
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith({ redirectUrl: '/done' });
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('falls back to window.Clerk when the store is empty', async () => {
    mockGet.mockReturnValue(null);
    const signOut = vi.fn().mockResolvedValue(undefined);
    (window as unknown as { Clerk: { signOut: typeof signOut } }).Clerk = { signOut };
    await signOutClerk('/x');
    expect(signOut).toHaveBeenCalledWith({ redirectUrl: '/x' });
  });
});
