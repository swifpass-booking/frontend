import { useState } from 'react';
import { MenuIcon, CloseIcon } from '../icons';
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
    <header className="sticky top-0 z-40 bg-white text-navy-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <button
          onClick={() => onNavigate('home')}
          className="flex flex-1 items-center gap-2 text-lg font-extrabold tracking-tight"
        >
          <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
          Swiftpass
        </button>

        <nav className="hidden items-center gap-1 rounded-full bg-slate-100 p-1 text-sm font-medium md:flex">
          {(
            [
              ['home', 'Book a trip', isBooking],
              ['planner', 'AI planner', page === 'planner'],
              ['tickets', 'My tickets', page === 'tickets'],
            ] as [Page, string, boolean][]
          ).map(([target, label, active]) => (
            <button
              key={target}
              onClick={() => onNavigate(target)}
              className={`rounded-full px-4 py-1.5 transition ${active ? 'bg-white text-navy-950 shadow-sm' : 'text-slate-500 hover:text-navy-950'}`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-3">
          <button
            onClick={() => onNavigate('checkout')}
            className="relative hidden items-center gap-1.5 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-navy-950 hover:bg-slate-50 sm:inline-flex"
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
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-slate-100"
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
              className="rounded-full bg-navy-950 px-4 py-1.5 text-sm font-semibold text-white hover:bg-navy-800"
            >
              Sign in
            </button>
          )}

          <button
            onClick={() => setMobileNavOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100 md:hidden"
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
          <nav className="relative z-50 flex flex-col gap-1 border-t border-slate-200 px-4 py-3 text-sm font-medium text-slate-500 md:hidden">
            <button
              onClick={() => handleMobileNavigate('home')}
              className={`rounded-lg px-3 py-2 text-left transition hover:bg-slate-100 hover:text-navy-950 ${isBooking ? 'font-semibold text-navy-950' : ''}`}
            >
              Book a trip
            </button>
            <button
              onClick={() => handleMobileNavigate('checkout')}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-left transition hover:bg-slate-100 hover:text-navy-950"
            >
              Cart
              {cartCount > 0 && (
                <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-amber text-[11px] font-bold text-navy-950">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              onClick={() => handleMobileNavigate('tickets')}
              className={`rounded-lg px-3 py-2 text-left transition hover:bg-slate-100 hover:text-navy-950 ${page === 'tickets' ? 'font-semibold text-navy-950' : ''}`}
            >
              My tickets
            </button>
            <button
              onClick={() => handleMobileNavigate('planner')}
              className={`rounded-lg px-3 py-2 text-left transition hover:bg-slate-100 hover:text-navy-950 ${page === 'planner' ? 'font-semibold text-navy-950' : ''}`}
            >
              AI planner
            </button>
          </nav>
        </>
      )}
    </header>
  );
}
