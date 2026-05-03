import { useEffect, useState } from 'react';

/** Subtle “breath” pulse on a timer; disabled when `prefers-reduced-motion: reduce`. */
export function useBreathingWordmark() {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cancelled = false;
    const breathDuration = 3400;

    const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    void (async () => {
      await sleep(2000 + Math.random() * 5500);
      while (!cancelled) {
        setPulse(true);
        await sleep(breathDuration);
        if (cancelled) return;
        setPulse(false);
        await sleep(8000 + Math.random() * 16000);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return pulse;
}
