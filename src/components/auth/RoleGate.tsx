'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEmbedded } from '@/hooks/useEmbedded';

/** Which app you get depends on who you are: admins and gate staff never see the traveller site (outside the admin's own storefront frame). */
export function RoleGate({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const embedded = useEmbedded();
  const home = user?.role === 'admin' ? '/admin' : user?.role === 'operator_staff' || user?.role === 'gate_agent' ? '/ops' : null;
  const blocked = !!home && !embedded;

  useEffect(() => {
    if (ready && blocked && home && !pathname.startsWith('/payment')) router.replace(home);
  }, [ready, blocked, home, pathname, router]);

  if (!ready || (blocked && !pathname.startsWith('/payment'))) return <div className="min-h-screen bg-slate-50" />;
  return <>{children}</>;
}
