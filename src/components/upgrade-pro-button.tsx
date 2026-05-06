import { actions } from 'astro:actions';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { breatheAccentTight } from '@/lib/breathe-accent';
import { cn } from '@/lib/utils';

export function UpgradeProButton() {
  const [busy, setBusy] = useState(false);

  async function onActivate() {
    setBusy(true);
    const res = await actions.upgradeToPro({});
    setBusy(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success("You're on Pro — categories unlocked.");
    window.location.href = '/';
  }

  return (
    <Button
      type="button"
      className={cn('rounded-lg px-4 font-semibold text-white', breatheAccentTight)}
      disabled={busy}
      onClick={() => void onActivate()}
    >
      {busy ? 'Working…' : 'Enable Pro (demo)'}
    </Button>
  );
}
