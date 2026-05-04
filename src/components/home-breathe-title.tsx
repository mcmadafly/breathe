import { useBreathingWordmark } from '@/hooks/use-breathing-wordmark';
import { cn } from '@/lib/utils';

/** Home hero “Breathe” title with the same breathing motion as the header wordmark. */
export function HomeBreatheTitle() {
  const breathePulse = useBreathingWordmark();

  return (
    <h1
      className={cn(
        'group/hero relative inline-grid place-items-center font-logo text-foreground -translate-y-px text-5xl font-thin leading-none tracking-tight [font-variation-settings:"wght"_240] sm:text-6xl md:text-7xl',
        breathePulse && 'breathe-logo-pulse',
      )}
    >
      <span className="col-start-1 row-start-1 transition-opacity duration-200 group-hover/hero:opacity-0">Breathe</span>
      <span className="col-start-1 row-start-1 opacity-0 transition-opacity duration-200 group-hover/hero:opacity-100">
        Spirare
      </span>
    </h1>
  );
}
