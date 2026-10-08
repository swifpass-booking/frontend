import { useState } from 'react';
import { TicketIcon, MenuIcon, CloseIcon } from '../icons';
import { useAuth } from '../../context/AuthContext';
import type { Page } from '../../types/domain';

interface NavProps {
  page: Page;
  cartCount: number;
  onNavigate: (page: Page) => void;
  onSignIn: () => void;
}

export default function Nav({ page, cartCount, onNavigate, onSignIn }: NavProps) {
  const isBooking = (['home', 'results', 'checkout', 'confirmation'] as Page[]).includes(page);
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  function handleMobileNavigate(p: Page) {
    setMobileNavOpen(false);
    onNavigate(p);
  }

  const initials = user?.fullName
    ?.split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 bg-navy-950 text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 text-lg font-extrabold tracking-tight"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-blue">
            <TicketIcon className="h-4.5 w-4.5" width={18} height={18} />
          </span>
          Swiftpass
        </button>

        <nav className="hidden items-center gap-6 text-sm font-medium text-navy-100/80 md:flex">
          <button
            onClick={() => onNavigate('home')}
            className={`transition hover:text-white ${isBooking ? 'text-white' : ''}`}
          >
            Book a trip
          </button>
          <button
            onClick={() => onNavigate('ops')}
            className={`transition hover:text-white ${page === 'ops' ? 'text-white' : ''}`}
          >
            Operator console
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => onNavigate('admin')}
              className={`transition hover:text-white ${page === 'admin' ? 'text-white' : ''}`}
            >
              Admin
            </button>
          )}
          <a href="#" className="transition hover:text-white">
            Help
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('checkout')}
            className="relative hidden rounded-lg border border-white/15 px-3 py-1.5 text-sm font-medium text-white/90 hover:bg-white/10 sm:inline-flex items-center gap-1.5"
          >
            Cart
            {cartCount > 0 && (
              <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-amber text-[11px] font-bold text-navy-950">
                {cartCount}
              </span>
            )}
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2.5 hover:bg-white/10"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-amber text-[12px] font-bold text-navy-950">
                  {initials || 'U'}
                </span>
                <span className="hidden text-sm font-semibold sm:inline">{user.fullName.split(' ')[0]}</span>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl bg-white p-1.5 text-navy-950 shadow-popover">
                    <p className="truncate px-2.5 py-2 text-xs text-slate-400">{user.email || user.phoneE164}</p>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                      }}
                      className="w-full rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={onSignIn}
              className="rounded-lg bg-white px-3.5 py-1.5 text-sm font-semibold text-navy-950 hover:bg-navy-100"
            >
              Sign in
            </button>
          )}

          <button
            onClick={() => setMobileNavOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10 md:hidden"
            aria-label="Menu"
          >
            {mobileNavOpen ? (
              <CloseIcon className="h-5 w-5" width={20} height={20} />
            ) : (
              <MenuIcon className="h-5 w-5" width={20} height={20} />
            )}
          </button>
        </div>
      </div>

      {mobileNavOpen && (
        <>
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileNavOpen(false)} />
          <nav className="relative z-50 flex flex-col gap-1 border-t border-white/10 px-4 py-3 text-sm font-medium text-navy-100/80 md:hidden">
            <button
              onClick={() => handleMobileNavigate('home')}
              className={`rounded-lg px-3 py-2 text-left transition hover:bg-white/10 hover:text-white ${isBooking ? 'text-white' : ''}`}
            >
              Book a trip
            </button>
            <button
              onClick={() => handleMobileNavigate('ops')}
              className={`rounded-lg px-3 py-2 text-left transition hover:bg-white/10 hover:text-white ${page === 'ops' ? 'text-white' : ''}`}
            >
              Operator console
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => handleMobileNavigate('admin')}
                className={`rounded-lg px-3 py-2 text-left transition hover:bg-white/10 hover:text-white ${page === 'admin' ? 'text-white' : ''}`}
              >
                Admin
              </button>
            )}
            <button
              onClick={() => handleMobileNavigate('checkout')}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-left transition hover:bg-white/10 hover:text-white"
            >
              Cart
              {cartCount > 0 && (
                <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-amber text-[11px] font-bold text-navy-950">
                  {cartCount}
                </span>
              )}
            </button>
            <a href="#" className="rounded-lg px-3 py-2 text-left transition hover:bg-white/10 hover:text-white">
              Help
            </a>
          </nav>
        </>
      )}
    </header>
  );
}
