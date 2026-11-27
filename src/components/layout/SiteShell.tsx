'use client';

import { usePathname } from 'next/navigation';
import Nav from './Nav';
import Footer from './Footer';
import { useEmbedded } from '@/hooks/useEmbedded';
import { cn } from '@/lib/utils';

/** Grid: nav, the page (takes all spare height), footer. A short page leaves the footer at the bottom of the window.
 *  The planner is a full-height chat, so it has no footer. Inside the admin panel (an iframe) there is no footer either. */
export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const embedded = useEmbedded();
  const footer = !embedded && pathname !== '/planner';
  return (
    <div className={cn('grid min-h-screen grid-rows-[auto_1fr_auto] bg-slate-50 font-sans text-navy-950', embedded && 'min-h-0')}>
      <Nav />
      <main className="min-w-0">{children}</main>
      {footer && <Footer />}
    </div>
  );
}
