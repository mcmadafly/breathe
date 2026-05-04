import { LogOut, Menu, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

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
  'focus-visible:ring-ring inline-flex shrink-0 items-center justify-center rounded-md border text-[10px] font-medium leading-none outline-none transition-all',
  'border-white/20 bg-white/10 px-2 py-0.5 text-foreground/75 shadow-none backdrop-blur-[2px]',
  'hover:border-[#f97316] hover:bg-[#f97316] hover:text-white hover:text-opacity-100',
  'dark:border-white/15 dark:bg-white/10 dark:text-foreground/75',
  'dark:hover:border-[#f97316] dark:hover:bg-[#f97316] dark:hover:text-white',
  'focus-visible:ring-2 focus-visible:ring-offset-2',
);

interface Props {
  homeHref: string;
  showUpgrade: boolean;
  skipAuth: boolean;
  /** Match wider `main` on boards (e.g. /breathe). */
  wideLayout?: boolean;
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

export function SiteHeader({
  homeHref,
  showUpgrade,
  skipAuth,
  wideLayout = false,
  userName,
  userEmail,
  userImage,
}: Props) {
  const [menuDark, setMenuDark] = useDarkModeFlag();
  const breathePulse = useBreathingWordmark();

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

  const showUserMenu = Boolean(!skipAuth && userEmail);

  return (
    <div
      className={cn(
        'mx-auto grid h-14 w-full grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-x-1 px-3',
        wideLayout ? 'max-w-3xl md:max-w-4xl lg:max-w-5xl' : 'max-w-3xl',
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
                'group/logo relative inline-grid place-items-center font-logo -translate-y-px shrink-0 text-xl font-thin leading-none tracking-tight text-foreground [font-variation-settings:"wght"_240] outline-none',
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
        {showUpgrade ? (
          <a href="/upgrade" className={cn(upgradeClass, 'shrink-0')}>
            Upgrade
          </a>
        ) : null}
      </div>

      <div className="hidden min-w-0 items-center justify-end gap-1 md:flex md:w-full md:justify-self-stretch">
        <ThemeToggle />
        {showUserMenu ? <UserMenu name={userName} email={userEmail} image={userImage} /> : null}
      </div>
    </div>
  );
}
