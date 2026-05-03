import { LogOut, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export function UserMenu({ name, email, image }: Props) {
  async function logout() {
    const { signOutClerk } = await import('@/lib/auth/sign-out-client');
    await signOutClerk('/');
  }

  const ariaLabel =
    name && email ? `Account menu for ${name}` : name ? `Account menu for ${name}` : email ? `Account menu for ${email}` : 'Account menu';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 rounded-full"
          aria-label={ariaLabel}
        >
          {image ? (
            <img src={image} alt="" className="size-8 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <User className="size-[1.125rem]" strokeWidth={1.75} />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5">
            {name ? <span>{name}</span> : null}
            {email ? <span className="text-muted-foreground text-xs font-normal">{email}</span> : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            void logout();
          }}
        >
          <LogOut className="mr-2 size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
