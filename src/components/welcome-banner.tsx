import { X } from 'lucide-react';
import { useCallback, useLayoutEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'breathe-welcome-dismissed-v2';
/** Cleared on load so old dismiss flags do not linger. */
const LEGACY_STORAGE_KEYS = ['breathe-welcome-dismissed-v1'] as const;

function WelcomeIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={cn('shrink-0', className)}
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="wb-sky" x1="40" y1="0" x2="180" y2="140" gradientUnits="userSpaceOnUse">
          <stop stopColor="oklch(0.97 0.02 250)" />
          <stop offset="1" stopColor="oklch(0.94 0.04 55)" />
        </linearGradient>
        <linearGradient id="wb-sun" x1="100" y1="40" x2="160" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="oklch(0.78 0.15 55)" />
          <stop offset="1" stopColor="oklch(0.7 0.18 45)" />
        </linearGradient>
        <linearGradient id="wb-wave" x1="0" y1="100" x2="200" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="oklch(0.55 0.12 200)" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="oklch(0.65 0.14 200)" stopOpacity="0.55" />
          <stop offset="1" stopColor="oklch(0.55 0.12 200)" stopOpacity="0.35" />
        </linearGradient>
        <filter id="wb-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="200" height="160" rx="20" fill="url(#wb-sky)" />
      <circle cx="148" cy="52" r="28" fill="url(#wb-sun)" opacity="0.85" filter="url(#wb-soft)" />
      <path
        d="M20 108 Q52 88 84 100 T148 96 T200 104"
        stroke="url(#wb-wave)"
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M28 122 Q60 102 96 114 T160 108 T200 116"
        stroke="url(#wb-wave)"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      <ellipse cx="72" cy="118" rx="22" ry="10" fill="oklch(0.45 0.08 200)" opacity="0.2" />
      <ellipse cx="130" cy="124" rx="18" ry="8" fill="oklch(0.45 0.08 200)" opacity="0.15" />
      <circle cx="56" cy="56" r="4" fill="oklch(0.5 0.02 250)" opacity="0.45" />
      <circle cx="76" cy="44" r="2.5" fill="oklch(0.5 0.02 250)" opacity="0.35" />
      <circle cx="96" cy="52" r="3" fill="oklch(0.5 0.02 250)" opacity="0.3" />
    </svg>
  );
}

/**
 * First-visit welcome strip for the todo home. Dismiss is stored in `localStorage`
 * (`breathe-welcome-dismissed-v2`). To show it again: open `/?showWelcome=1` (or `true` / `yes`);
 * the query is stripped after load. Legacy `breathe-welcome-dismissed-v1` is removed on mount.
 */
export function WelcomeBanner() {
  const [show, setShow] = useState<boolean | null>(null);

  useLayoutEffect(() => {
    try {
      for (const k of LEGACY_STORAGE_KEYS) {
        localStorage.removeItem(k);
      }
      const params = new URLSearchParams(window.location.search);
      const raw = params.get('showWelcome');
      if (
        raw !== null &&
        ['1', 'true', 'yes'].includes(String(raw).trim().toLowerCase())
      ) {
        localStorage.removeItem(STORAGE_KEY);
        params.delete('showWelcome');
        const qs = params.toString();
        const path = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
        window.history.replaceState(null, '', path);
      }
      setShow(localStorage.getItem(STORAGE_KEY) !== '1');
    } catch {
      setShow(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setShow(false);
  }, []);

  if (show === null || !show) {
    return null;
  }

  return (
    <section
      className={cn(
        'border-border/80 bg-card/80 relative mb-5 overflow-hidden rounded-2xl border',
        'shadow-sm backdrop-blur-sm dark:border-border/60 dark:bg-card/60',
      )}
      aria-labelledby="welcome-banner-title"
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
        <WelcomeIllustration className="mx-auto h-32 w-40 sm:mx-0 sm:h-36 sm:w-44" />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h2 id="welcome-banner-title" className="text-foreground text-lg font-semibold tracking-tight">
            Welcome to Breathe
          </h2>
          <p className="text-muted-foreground mt-1.5 max-w-prose text-pretty text-sm leading-relaxed sm:mt-2">
            A calmer place for your tasks. Capture what matters, reorder with drag and drop, and check things off
            when you’re done. You can hide this message anytime—it won’t come back on this device.
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:text-foreground absolute top-2 right-2 sm:top-3 sm:right-3"
        onClick={dismiss}
        aria-label="Dismiss welcome message"
      >
        <X className="size-4" />
      </Button>
    </section>
  );
}
