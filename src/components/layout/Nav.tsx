'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CloseIcon, MenuIcon } from '@/components/icons';
import { Logo } from '@/components/shared/Logo';
import { useAuth } from '@/context/AuthContext';
import { useTrip } from '@/context/TripContext';
import { useSignIn } from '@/components/auth/AuthDialog';
import { cn } from '@/lib/utils';

/** One list drives the desktop pill, the mobile menu and which item is highlighted. */
const NAV_ITEMS = [
  { href: '/', label: 'Book a trip', matches: ['/', '/results', '/checkout', '/confirmation'] },
  { href: '/planner', label: 'AI planner', matches: ['/planner'] },
  { href: '/tickets', label: 'My tickets', matches: ['/tickets'] },
];

function CartButton({ count, className }: { count: number; className?: string }) {
  return (
    <Button asChild variant="outline" size="sm" className={cn('text-sm', className)}>
      <Link href="/checkout">
        Cart
        {count > 0 && <Badge className="size-5 justify-center bg-brand-amber p-0 text-[11px] text-navy-950">{count}</Badge>}
      </Link>
    </Button>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const signIn = useSignIn();
  const [open, setOpen] = useState(false);
  if (!user) return <Button size="sm" className="text-sm" onClick={signIn}>Sign in</Button>;
  const initials = user.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-slate-100">
        <span className="grid size-7 place-items-center rounded-full bg-brand-amber text-[12px] font-bold text-navy-950">{initials || 'U'}</span>
        <span className="hidden text-sm font-semibold sm:inline">{user.fullName.split(' ')[0]}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl bg-white p-1.5 shadow-popover">
            <p className="truncate px-2.5 py-2 text-xs text-slate-400">{user.email || user.phoneE164}</p>
            <Button variant="ghost" size="sm" className="w-full justify-start rounded-lg" onClick={() => { setOpen(false); logout(); }}>Sign out</Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const { offer } = useTrip();
  const [mobileOpen, setMobileOpen] = useState(false);
  const cartCount = offer && pathname !== '/confirmation' ? 1 : 0;
  const active = (m: string[]) => m.includes(pathname);

  return (
    <header className="sticky top-0 z-40 bg-white text-navy-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Logo className="flex-1" />

        <nav className="hidden items-center gap-1 rounded-full bg-slate-100 p-1 text-sm font-medium md:flex">
          {NAV_ITEMS.map((n) => (
            <Link key={n.href} href={n.href} className={cn('rounded-full px-4 py-1.5 transition', active(n.matches) ? 'bg-white text-navy-950 shadow-sm' : 'text-slate-500 hover:text-navy-950')}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-3">
          <CartButton count={cartCount} className="hidden sm:inline-flex" />
          <UserMenu />
          <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Menu" onClick={() => setMobileOpen((v) => !v)}>
            {mobileOpen ? <CloseIcon className="size-5" width={20} height={20} /> : <MenuIcon className="size-5" width={20} height={20} />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="flex flex-col gap-1 border-t border-slate-200 px-4 py-3 text-sm font-medium text-slate-500 md:hidden">
          {[...NAV_ITEMS, { href: '/checkout', label: cartCount ? `Cart (${cartCount})` : 'Cart', matches: ['/checkout'] }].map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setMobileOpen(false)} className={cn('rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-navy-950', active(n.matches) && 'font-semibold text-navy-950')}>
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
