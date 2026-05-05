import { actions } from 'astro:actions';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const accentBtn =
  'rounded-xl bg-[#f97316] px-6 font-semibold text-white shadow-md shadow-orange-900/25 hover:bg-[#ea580c] dark:bg-[#f97316] dark:hover:bg-[#ea580c]';

type Busy = 'monthly' | 'lifetime' | 'free' | null;

export interface UpgradePlansProps {
  isPro: boolean;
  stripeBillingConfigured: boolean;
}

export function UpgradePlans({ isPro, stripeBillingConfigured }: UpgradePlansProps) {
  const [busy, setBusy] = useState<Busy>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const q = p.get('checkout');
    if (q === 'success') {
      toast.success('Payment received. Pro unlocks as soon as Stripe confirms (usually seconds).');
      window.history.replaceState({}, '', '/upgrade');
    } else if (q === 'cancel') {
      toast.message('Checkout cancelled');
      window.history.replaceState({}, '', '/upgrade');
    }
  }, []);

  async function startCheckout(plan: 'monthly' | 'lifetime') {
    setBusy(plan);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'Could not start checkout');
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setBusy(null);
    }
  }

  async function unlockFree() {
    setBusy('free');
    try {
      const res = await actions.upgradeToPro({});
      if (res.error) {
        toast.error(res.error.message);
        return;
      }
      toast.success("You're on Pro — categories unlocked.");
      window.location.href = '/';
    } finally {
      setBusy(null);
    }
  }

  if (isPro) {
    return (
      <div className="text-muted-foreground mx-auto max-w-md space-y-6 text-center text-sm">
        <p className="text-foreground text-base font-medium">You&apos;re on Pro</p>
        <p>Categories and unlimited items are enabled.</p>
        <p>
          <a href="/" className="text-foreground font-medium underline underline-offset-4">
            Back to list
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-2">
      <header className="text-center">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">Upgrade Breathe</h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-lg text-sm sm:text-base">
          Unlock categories, unlimited todos, and lists. Pay securely with Stripe.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2 md:gap-6">
        <div
          className={cn(
            'flex flex-col rounded-2xl border border-border bg-card p-6 text-left shadow-sm',
            'dark:border-white/[0.07]',
          )}
        >
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Monthly</p>
          <p className="text-foreground mt-2 text-3xl font-semibold tabular-nums">
            $1.99<span className="text-muted-foreground text-lg font-normal">/mo</span>
          </p>
          <p className="text-muted-foreground mt-2 text-sm">Cancel anytime</p>
          <ul className="text-muted-foreground mt-4 space-y-2 text-sm">
            <li>Everything in Pro</li>
            <li>Category filters &amp; lists</li>
            <li>Unlimited todos</li>
          </ul>
          <Button
            type="button"
            disabled={!stripeBillingConfigured || busy !== null}
            className={cn(accentBtn, 'mt-6 w-full')}
            onClick={() => void startCheckout('monthly')}
          >
            {busy === 'monthly' ? 'Redirecting…' : 'Subscribe monthly'}
          </Button>
        </div>

        <div
          className={cn(
            'relative flex flex-col rounded-2xl border-2 border-[#f97316]/50 bg-card p-6 text-left shadow-sm',
            'dark:border-[#f97316]/45',
          )}
        >
          <span className="absolute right-4 top-4 rounded-full bg-[#f97316]/15 px-2.5 py-0.5 text-xs font-semibold text-[#c2410c] dark:text-[#fdba74]">
            Best value
          </span>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Lifetime</p>
          <p className="text-foreground mt-2 text-3xl font-semibold tabular-nums">$99</p>
          <p className="text-muted-foreground mt-2 text-sm">One payment — use Pro for as long as we offer the product.</p>
          <ul className="text-muted-foreground mt-4 space-y-2 text-sm">
            <li>Everything in Pro, forever</li>
            <li>No renewal hassle</li>
            <li>Helps fund development</li>
          </ul>
          <Button
            type="button"
            disabled={!stripeBillingConfigured || busy !== null}
            className={cn(accentBtn, 'mt-6 w-full')}
            onClick={() => void startCheckout('lifetime')}
          >
            {busy === 'lifetime' ? 'Redirecting…' : 'Buy lifetime license'}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          'flex flex-col gap-1.5 rounded-lg border border-border/35 bg-muted/10 px-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3',
          'dark:border-white/[0.06] dark:bg-white/[0.02]',
        )}
      >
        <p className="text-muted-foreground/75 max-w-xl text-[10px] leading-tight sm:text-[11px]">
          Can&apos;t afford to upgrade? Unlock pro here at no cost.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground/80 hover:text-foreground h-7 shrink-0 px-2 text-[10px] font-medium opacity-90 hover:opacity-100"
          disabled={busy !== null}
          onClick={() => void unlockFree()}
        >
          {busy === 'free' ? 'Working…' : 'Unlock Pro for free'}
        </Button>
      </div>
    </div>
  );
}
