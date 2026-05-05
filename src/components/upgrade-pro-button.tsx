import { actions } from 'astro:actions';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

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
      className="bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500"
      disabled={busy}
      onClick={() => void onActivate()}
    >
      {busy ? 'Working…' : 'Enable Pro (demo)'}
    </Button>
  );
}
