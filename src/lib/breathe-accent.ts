import { cn } from '@/lib/utils';

/**
 * Upgrade / Pro CTA accent — hex source of truth (see DESIGN.md).
 * Avoid Tailwind palette `orange-*` here so marketing and product match.
 */

/** Filled control: default surface + hover (no shadow). */
export const breatheAccentTight =
  'bg-[#f97316] hover:bg-[#ea580c] dark:bg-[#f97316] dark:hover:bg-[#ea580c]';

/** Full-width or primary upgrade buttons: + elevation (matches `/upgrade` plans). */
export const breatheAccentCta = cn(
  breatheAccentTight,
  'text-white shadow-md shadow-orange-900/25',
);

/** Outline composer control: hover/active fills like upgrade CTAs (`!` so outline variant hover loses). */
export const breatheAccentOutlineHover = cn(
  'hover:!border-[#f97316] hover:!bg-[#f97316] hover:!text-white',
  'hover:shadow-md hover:shadow-orange-900/25',
  'active:!border-[#ea580c] active:!bg-[#ea580c]',
  'dark:hover:!border-[#f97316] dark:hover:!bg-[#f97316] dark:hover:!text-white',
  'dark:active:!border-[#ea580c] dark:active:!bg-[#ea580c]',
);
