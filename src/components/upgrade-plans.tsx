import { actions } from 'astro:actions';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { isProPlan } from '@/lib/pro-plan';
import { breatheAccentCta } from '@/lib/breathe-accent';
import { cn } from '@/lib/utils';

const accentBtn = cn('rounded-xl px-6 font-semibold', breatheAccentCta);

/** Display-only MSRP for marketing (Stripe still charges the amounts below). */
const UPGRADE_MONTHLY_MSRP = '$9.99';
const UPGRADE_MONTHLY_PRICE = '$1.99';
const UPGRADE_LIFETIME_MSRP = '$150';
const UPGRADE_LIFETIME_PRICE = '$99';

type Busy = 'monthly' | 'lifetime' | 'free' | null;

export interface UpgradePlansProps {
  isPro: boolean;
  proPlan: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeBillingConfigured: boolean;
}

function ProMemberThanks({
  stripeCustomerId,
  onOpenPortal,
  portalBusy,
}: {
  stripeCustomerId: string | null;
  onOpenPortal: () => void;
  portalBusy: boolean;
}) {
  return (
    <div className="text-muted-foreground mx-auto max-w-md space-y-5 text-center text-sm">
      <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">Breathe Pro — Lifetime</h1>
      <p className="leading-relaxed">
        Thank you for being a lifetime member. Your one-time support makes a real difference in keeping Breathe fast,
        quiet, and worthy of your daily list — we&apos;re genuinely grateful.
      </p>
      <p className="leading-relaxed">
        You keep every Pro feature for as long as we offer the product: unlimited todos, lists, categories, and the
        rest of what you see on this page.
      </p>
      {stripeCustomerId ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          disabled={portalBusy}
          onClick={() => void onOpenPortal()}
        >
          {portalBusy ? 'Opening…' : 'Invoices & payment methods'}
        </Button>
      ) : null}
      <p>
        <a href="/" className="text-foreground font-medium underline underline-offset-4">
          Back to list
        </a>
      </p>
    </div>
  );
}

function ProMemberMonthly({
  stripeCustomerId,
  onOpenPortal,
  portalBusy,
}: {
  stripeCustomerId: string | null;
  onOpenPortal: () => void;
  portalBusy: boolean;
}) {
  return (
    <div className="text-muted-foreground mx-auto max-w-md space-y-5 text-center text-sm">
      <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">Your subscription</h1>
      <p className="leading-relaxed">
        You&apos;re on{' '}
        <strong className="text-foreground">
          Breathe Pro — {UPGRADE_MONTHLY_PRICE}/month
        </strong>
        . Categories, unlimited todos, and lists are
        included, and you can cancel whenever you like.
      </p>
      {stripeCustomerId ? (
        <div className="flex flex-col items-center gap-3">
          <Button
            type="button"
            className={cn(accentBtn, 'w-full max-w-xs')}
            disabled={portalBusy}
            onClick={() => void onOpenPortal()}
          >
            {portalBusy ? 'Opening…' : 'Manage or cancel subscription'}
          </Button>
          <p className="text-muted-foreground/90 max-w-sm text-xs leading-relaxed">
            Opens Stripe&apos;s secure billing page to update your card, download invoices, or cancel the renewal.
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs leading-relaxed">
          Your billing profile is still linking after checkout. Refresh this page in a few seconds, then use{' '}
          <strong className="text-foreground">Manage or cancel subscription</strong> to open the Stripe portal.
        </p>
      )}
      <p>
        <a href="/" className="text-foreground font-medium underline underline-offset-4">
          Back to list
        </a>
      </p>
    </div>
  );
}

function ProMemberLegacy({
  stripeCustomerId,
  onOpenPortal,
  portalBusy,
}: {
  stripeCustomerId: string;
  onOpenPortal: () => void;
  portalBusy: boolean;
}) {
  return (
    <div className="text-muted-foreground mx-auto max-w-md space-y-5 text-center text-sm">
      <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">Breathe Pro</h1>
      <p className="leading-relaxed">
        Your Pro features are active — unlimited todos, lists, and categories. Thanks for supporting Breathe.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-1"
        disabled={portalBusy}
        onClick={() => void onOpenPortal()}
      >
        {portalBusy ? 'Opening…' : 'Billing & invoices'}
      </Button>
      <p className="text-muted-foreground/90 text-xs leading-relaxed">
        Open Stripe to manage a subscription, payment method, or download receipts.
      </p>
      <p>
        <a href="/" className="text-foreground font-medium underline underline-offset-4">
          Back to list
        </a>
      </p>
    </div>
  );
}

function ProMemberComplimentary() {
  return (
    <div className="text-muted-foreground mx-auto max-w-md space-y-5 text-center text-sm">
      <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">Breathe Pro</h1>
      <p className="leading-relaxed">
        You unlocked Pro through the free option. Categories, unlimited todos, and lists are yours — enjoy the calmer
        surface.
      </p>
      <p>
        <a href="/" className="text-foreground font-medium underline underline-offset-4">
          Back to list
        </a>
      </p>
    </div>
  );
}

function ProMemberActiveNoBillingRecord({
  stripeBillingConfigured,
  onOpenPortal,
  portalBusy,
}: {
  stripeBillingConfigured: boolean;
  onOpenPortal: () => void;
  portalBusy: boolean;
}) {
  return (
    <div className="text-muted-foreground mx-auto max-w-md space-y-5 text-center text-sm">
      <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">Breathe Pro</h1>
      <p className="leading-relaxed">
        Your Pro features are active — categories, unlimited todos, and lists. Thanks for supporting Breathe.
      </p>
      {stripeBillingConfigured ? (
        <div className="flex flex-col items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="w-full max-w-xs rounded-xl"
            disabled={portalBusy}
            onClick={() => void onOpenPortal()}
          >
            {portalBusy ? 'Opening…' : 'Manage or cancel in Stripe'}
          </Button>
          <p className="text-muted-foreground/90 max-w-sm text-xs leading-relaxed">
            Opens Stripe&apos;s billing portal (same sign-in email as checkout). You can cancel renewal, update your
            card, or download invoices there.
          </p>
        </div>
      ) : null}
      <p>
        <a href="/" className="text-foreground font-medium underline underline-offset-4">
          Back to list
        </a>
      </p>
    </div>
  );
}

export function UpgradePlans({
  isPro,
  proPlan,
  stripeCustomerId,
  stripeSubscriptionId,
  stripeBillingConfigured,
}: UpgradePlansProps) {
  const [busy, setBusy] = useState<Busy>(null);
  const [portalBusy, setPortalBusy] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const q = p.get('checkout');
    if (q === 'success') {
      toast.success('Payment received. Pro unlocks when Stripe confirms — refresh if perks are not on yet.');
      window.history.replaceState({}, '', '/upgrade');
    } else if (q === 'cancel') {
      toast.message('Checkout cancelled');
      window.history.replaceState({}, '', '/upgrade');
    }
  }, []);

  async function openBillingPortal() {
    setPortalBusy(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'Could not open billing portal');
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setPortalBusy(false);
    }
  }

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
    const plan = proPlan && isProPlan(proPlan) ? proPlan : null;
    const hasActiveSubscription = Boolean(stripeSubscriptionId?.trim());

    if (plan === 'lifetime') {
      return (
        <ProMemberThanks
          stripeCustomerId={stripeCustomerId}
          onOpenPortal={openBillingPortal}
          portalBusy={portalBusy}
        />
      );
    }

    if (plan === 'monthly' || hasActiveSubscription) {
      return (
        <ProMemberMonthly
          stripeCustomerId={stripeCustomerId}
          onOpenPortal={openBillingPortal}
          portalBusy={portalBusy}
        />
      );
    }

    if (stripeCustomerId) {
      return (
        <ProMemberLegacy
          stripeCustomerId={stripeCustomerId}
          onOpenPortal={openBillingPortal}
          portalBusy={portalBusy}
        />
      );
    }

    if (plan === 'complimentary') {
      return <ProMemberComplimentary />;
    }

    return (
      <ProMemberActiveNoBillingRecord
        stripeBillingConfigured={stripeBillingConfigured}
        onOpenPortal={openBillingPortal}
        portalBusy={portalBusy}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-full space-y-8 px-2">
      <header className="text-center">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">Upgrade Breathe</h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-lg text-sm sm:text-base">
          Unlock categories, unlimited todos, and lists. Pay securely with Stripe.
        </p>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-pretty text-sm italic leading-relaxed sm:text-[15px]">
          For a limited time we&apos;re offering a discount on both plans for our first 100 subscribers — about{' '}
          <span className="text-foreground font-medium">one tenth</span> the usual price.
        </p>
      </header>

      {!stripeBillingConfigured ? (
        <div
          role="status"
          className="text-muted-foreground border-border/60 bg-muted/15 mx-auto max-w-xl rounded-lg border px-3 py-2.5 text-center text-xs leading-relaxed sm:text-sm"
        >
          Paid plans are inactive until both{' '}
          <code className="text-foreground/90 font-mono text-[0.7rem] sm:text-xs">STRIPE_PRICE_PRO_MONTHLY</code> and{' '}
          <code className="text-foreground/90 font-mono text-[0.7rem] sm:text-xs">STRIPE_PRICE_PRO_LIFETIME</code> are
          set to Stripe <strong className="text-foreground">Price</strong> IDs (they start with{' '}
          <code className="text-foreground/90 font-mono text-[0.7rem] sm:text-xs">price_</code>). A{' '}
          <code className="text-foreground/90 font-mono text-[0.7rem] sm:text-xs">prod_</code> Product ID or a dollar
          amount will not work. Update <code className="font-mono text-[0.7rem] sm:text-xs">.env</code> and restart{' '}
          <code className="font-mono text-[0.7rem] sm:text-xs">npm run dev</code>.
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 md:gap-6">
        <div
          className={cn(
            'flex flex-col rounded-2xl border border-border bg-card p-6 text-left shadow-sm',
            'dark:border-white/[0.07]',
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Monthly</p>
            <span className="rounded-full bg-[#f97316]/12 px-2 py-0.5 text-[11px] font-semibold text-[#c2410c] dark:text-[#fdba74]">
              Intro pricing
            </span>
          </div>
          <p className="text-foreground mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 tabular-nums">
            <span
              className="text-muted-foreground text-lg font-medium line-through decoration-muted-foreground/80"
              aria-hidden="true"
            >
              {UPGRADE_MONTHLY_MSRP}
            </span>
            <span className="sr-only">Limited-time price </span>
            <span className="text-3xl font-semibold">
              {UPGRADE_MONTHLY_PRICE}
              <span className="text-muted-foreground text-lg font-normal">/mo</span>
            </span>
          </p>
          <p className="text-muted-foreground mt-1 text-xs">Normally {UPGRADE_MONTHLY_MSRP}/mo — save vs standard rate.</p>
          <p className="text-muted-foreground mt-2 text-sm">Cancel anytime</p>
          <ul className="text-muted-foreground mt-4 space-y-2 text-sm">
            <li>Unlimited todos and todo lists</li>
            <li>Categories, filters, and multiple lists</li>
            <li>Custom themes (including light &amp; dark)</li>
            <li>Breathe desktop app — install and run from your dock</li>
            <li>Focus mode &amp; early access to new features</li>
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
          <div className="flex flex-wrap items-center gap-2 pr-16">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Lifetime</p>
            <span className="rounded-full bg-[#f97316]/12 px-2 py-0.5 text-[11px] font-semibold text-[#c2410c] dark:text-[#fdba74]">
              Intro pricing
            </span>
          </div>
          <p className="text-foreground mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 tabular-nums">
            <span
              className="text-muted-foreground text-lg font-medium line-through decoration-muted-foreground/80"
              aria-hidden="true"
            >
              {UPGRADE_LIFETIME_MSRP}
            </span>
            <span className="sr-only">Limited-time price </span>
            <span className="text-3xl font-semibold">{UPGRADE_LIFETIME_PRICE}</span>
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Normally {UPGRADE_LIFETIME_MSRP} — limited-time discount at checkout.
          </p>
          <p className="text-muted-foreground mt-2 text-sm">One payment — use Pro for as long as we offer the product.</p>
          <ul className="text-muted-foreground mt-4 space-y-2 text-sm">
            <li>Unlimited todos and todo lists — locked in for life</li>
            <li>Categories, filters, and multiple lists</li>
            <li>Custom themes (including light &amp; dark)</li>
            <li>Breathe desktop app — install and run from your dock</li>
            <li>Focus mode &amp; early access to new features</li>
            <li>No renewal hassle — helps fund development</li>
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
