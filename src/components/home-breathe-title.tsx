import { useBreathingWordmark } from '@/hooks/use-breathing-wordmark';
import { cn } from '@/lib/utils';

/** Home hero “Breathe” title with the same breathing motion as the header wordmark. */
export function HomeBreatheTitle() {
  const breathePulse = useBreathingWordmark();

  return (
    <h1
      className={cn(
        'font-logo text-foreground inline-block text-5xl font-thin leading-none tracking-tight [font-variation-settings:"wght"_240] sm:text-6xl md:text-7xl',
        breathePulse && 'breathe-logo-pulse',
      )}
    >
      Breathe
    </h1>
  );
}
