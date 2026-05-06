import { Circle, LogOut, Menu, Moon, Sun } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { UserMenu } from '@/components/user-menu';
import { BREATHE_SIGNOFF } from '@/lib/site';
import { useBreathingWordmark } from '@/hooks/use-breathing-wordmark';
import { cn } from '@/lib/utils';

const upgradeClass = cn(
  'focus-visible:ring-ring inline-flex shrink-0 items-center rounded-md border text-[10px] font-medium leading-none outline-none transition-all',
  'border-white/20 bg-white/10 px-2 py-0.5 text-foreground/75 shadow-none backdrop-blur-[2px]',
  'hover:border-[#f97316] hover:bg-[#f97316] hover:text-white hover:text-opacity-100',
  'dark:border-white/15 dark:bg-white/10 dark:text-foreground/75',
  'dark:hover:border-[#f97316] dark:hover:bg-[#f97316] dark:hover:text-white',
  'focus-visible:ring-2 focus-visible:ring-offset-2',
);

const proBadgeClass = cn(
  'focus-visible:ring-ring inline-flex shrink-0 items-center rounded-md border text-[10px] font-semibold leading-none uppercase tracking-wide outline-none transition-all',
  'border-[#f97316]/40 bg-[#f97316]/12 px-2 py-0.5 text-[#c2410c] shadow-none',
  'dark:border-[#f97316]/35 dark:bg-[#f97316]/15 dark:text-[#fdba74]',
  'hover:border-[#f97316] hover:bg-[#f97316] hover:text-white',
  'focus-visible:ring-2 focus-visible:ring-offset-2',
);

interface Props {
  homeHref: string;
  /** When true, show a Pro badge linking to /upgrade; otherwise show Upgrade. */
  isProMember: boolean;
  skipAuth: boolean;
  /** Cookie session only — show Sign in instead of account menu. */
  isAnonymous?: boolean;
  /** Match wider `main` on boards (e.g. /breathe). */
  wideLayout?: boolean;
  /** Home todo board: fixed focus (zen) toggle in the upper-left corner. */
  zenModeToggle?: boolean;
  userName?: string | null;
  userEmail?: string | null;
  userImage?: string | null;
}

function useDarkModeFlag() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
    const obs = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains('dark'));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return [dark, setDark] as const;
}

function useHeaderSolidFromScroll() {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return solid;
}

export function SiteHeader({
  homeHref,
  isProMember,
  skipAuth,
  isAnonymous = false,
  wideLayout = false,
  zenModeToggle = false,
  userName,
  userEmail,
  userImage,
}: Props) {
  const [menuDark, setMenuDark] = useDarkModeFlag();
  const breathePulse = useBreathingWordmark();
  const headerSolid = useHeaderSolidFromScroll();
  const [zenMode, setZenMode] = useState(false);

  const setZen = useCallback((on: boolean) => {
    setZenMode(on);
    document.documentElement.classList.toggle('zen-mode', on);
  }, []);

  useEffect(() => {
    return () => {
      document.documentElement.classList.remove('zen-mode');
    };
  }, []);

  useEffect(() => {
    if (!zenModeToggle) {
      setZen(false);
    }
  }, [zenModeToggle, setZen]);

  useEffect(() => {
    if (!zenMode || !zenModeToggle) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zenMode, zenModeToggle, setZen]);

  async function logout() {
    const { signOutClerk } = await import('@/lib/auth/sign-out-client');
    await signOutClerk('/');
  }

  function toggleThemeFromMenu() {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    setMenuDark(next);
  }

  const showUserMenu = Boolean(!skipAuth && userEmail && !isAnonymous);
  const showAnonSignIn = Boolean(!skipAuth && isAnonymous);

  const innerGrid = (
    <div
      className={cn(
        'mx-auto grid h-14 w-full grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-x-1 px-3',
        wideLayout ? 'board-shell-wide' : 'max-w-[36rem]',
        'md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-x-4',
      )}
    >
      <div className="flex items-center justify-self-start">
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56" alignOffset={-8} sideOffset={8}>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  toggleThemeFromMenu();
                }}
              >
                {menuDark ? <Sun className="mr-2 size-4" /> : <Moon className="mr-2 size-4" />}
                {menuDark ? 'Light mode' : 'Dark mode'}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/upgrade">{isProMember ? 'Pro plan' : 'Upgrade'}</a>
              </DropdownMenuItem>
              {showAnonSignIn ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a href="/sign-in">Sign in</a>
                  </DropdownMenuItem>
                </>
              ) : null}
              {showUserMenu ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>
                    <div className="flex flex-col gap-0.5">
                      {userName ? <span>{userName}</span> : null}
                      {userEmail ? <span className="text-muted-foreground text-xs font-normal">{userEmail}</span> : null}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      void logout();
                    }}
                  >
                    <LogOut className="mr-2 size-4" />
                    Sign out
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex h-full min-w-0 flex-nowrap items-center justify-center gap-x-2 justify-self-center sm:gap-x-3">
        <HoverCard openDelay={180} closeDelay={80}>
          <HoverCardTrigger asChild>
            <a
              href={homeHref}
              className={cn(
                'group/logo relative inline-grid shrink-0 place-items-center font-logo -translate-y-px text-xl font-thin leading-none tracking-tight text-foreground [font-variation-settings:"wght"_240] outline-none',
                'hover:opacity-90 focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 md:text-2xl',
                breathePulse && 'breathe-logo-pulse',
              )}
            >
              <span className="col-start-1 row-start-1 transition-opacity duration-200 group-hover/logo:opacity-0">
                Breathe
              </span>
              <span className="col-start-1 row-start-1 opacity-0 transition-opacity duration-200 group-hover/logo:opacity-100">
                Spirare
              </span>
            </a>
          </HoverCardTrigger>
          <HoverCardContent align="center" className="w-[min(calc(100vw-2rem),20rem)]" side="bottom">
            <p className="text-muted-foreground text-center text-xs leading-relaxed tracking-tight">
              Spirare is a Latin verb meaning &quot;to breathe,&quot;
            </p>
            <p className="text-foreground mt-3 text-sm font-medium tracking-tight">Why Breathe</p>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Breathe is a quiet surface for what&apos;s next—capture tasks in a moment and keep one clear list without
              dashboards or clutter.
            </p>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              It&apos;s lightweight on purpose: fewer controls, faster flow, and a calm place to finish work instead of
              managing it.
            </p>
            <p className="text-muted-foreground mt-3 text-sm font-medium leading-relaxed tracking-tight">
              {BREATHE_SIGNOFF}
            </p>
          </HoverCardContent>
        </HoverCard>
        {isProMember ? (
          <a href="/upgrade" className={cn(proBadgeClass, 'shrink-0')} title="Your Pro plan">
            Pro
          </a>
        ) : (
          <a href="/upgrade" className={cn(upgradeClass, 'shrink-0')}>
            Upgrade
          </a>
        )}
      </div>

      <div className="hidden min-w-0 items-center justify-end gap-1 md:flex md:w-full md:justify-self-stretch">
        <ThemeToggle />
        {showAnonSignIn ? (
          <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
            <a href="/sign-in">Sign in</a>
          </Button>
        ) : null}
        {showUserMenu ? <UserMenu name={userName} email={userEmail} image={userImage} /> : null}
      </div>
    </div>
  );

  return (
    <>
      <header
        className={cn(
          'site-header-root sticky top-0 z-10 min-h-14 transition-[background-color,backdrop-filter] duration-300 ease-out',
          headerSolid &&
            'bg-background/80 supports-backdrop-filter:bg-background/60 backdrop-blur supports-backdrop-filter:backdrop-blur-md',
        )}
      >
        {innerGrid}
      </header>
      {zenModeToggle ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'zen-mode-toggle fixed top-3 left-3 z-[60] size-7 text-foreground/55',
            'hover:bg-[#f97316]/10 hover:text-[#f97316]',
            'dark:text-foreground/65',
          )}
          aria-label={zenMode ? 'Exit focus mode' : 'Focus mode — hide header and footer'}
          aria-pressed={zenMode}
          onClick={() => setZen(!zenMode)}
        >
          <Circle className="size-3" strokeWidth={1.5} />
        </Button>
      ) : null}
    </>
  );
}
