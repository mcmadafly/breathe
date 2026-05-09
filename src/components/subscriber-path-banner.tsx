import { actions } from 'astro:actions';
import { X } from 'lucide-react';
import { useLayoutEffect, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';

type Props = {
  /** Match `main` width (`board-shell` vs `board-shell-wide`). */
  wideLayout?: boolean;
  /** From SSR / DB (`users.subscriber_banner_dismissed`). */
  initialDismissed: boolean;
  /** Persist dismiss only when signed in (anonymous cookie session counts). */
  canDismiss?: boolean;
};

export function SubscriberPathBanner({
  wideLayout = false,
  initialDismissed,
  canDismiss = false,
}: Props) {
  const [visible, setVisible] = useState(!initialDismissed);

  useLayoutEffect(() => {
    setVisible(!initialDismissed);
  }, [initialDismissed]);

  async function dismiss() {
    const res = await actions.dismissSubscriberBanner({});
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className={cn(
        'subscriber-path-banner relative border-b border-sky-600/35 bg-[#0ea5e9] text-white shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]',
        'dark:border-sky-300/25 dark:bg-[#0284c7]',
      )}
    >
      <div
        className={cn(
          'mx-auto flex justify-center px-3 py-2.5',
          canDismiss ? 'pr-11 sm:pr-12' : null,
          wideLayout ? 'board-shell-wide' : 'board-shell',
        )}
      >
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          <p className="m-0 text-center text-[11px] font-semibold uppercase tracking-wide text-white sm:text-xs">
            Path to 100 subscribers <span className="text-white/85 normal-case">— early pricing.</span>
          </p>
          <a
            href="/upgrade"
            className="focus-visible:ring-ring inline-flex shrink-0 items-center justify-center rounded-lg border border-white/90 bg-white px-3 py-1.5 text-center text-[11px] font-semibold tracking-tight text-sky-700 shadow-sm outline-none transition-colors hover:bg-white/95 hover:text-sky-800 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0ea5e9] dark:text-sky-800 dark:focus-visible:ring-offset-[#0284c7]"
          >
            Learn more
          </a>
        </div>
      </div>
      {canDismiss ? (
        <button
          type="button"
          aria-label="Dismiss subscriber banner"
          onClick={() => void dismiss()}
          className="text-white/90 hover:text-white absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md outline-none transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0ea5e9] dark:focus-visible:ring-offset-[#0284c7]"
        >
          <X className="size-4" strokeWidth={2} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
