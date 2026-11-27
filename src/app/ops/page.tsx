'use client';

import { useRouter } from 'next/navigation';
import GateView from '@/views/GateView';
import StaffLoginView from '@/views/StaffLoginView';
import { useAuth } from '@/context/AuthContext';

/** Gate scanner for operator staff and gate agents. Everyone else gets the sign-in door; admins have the scanner inside their own console. */
export default function Page() {
  const { user, token, ready, logout } = useAuth();
  const router = useRouter();
  if (!ready) return <div className="min-h-screen bg-slate-50" />;
  if (user?.role === 'admin') { router.replace('/admin'); return null; }
  if (user?.role !== 'operator_staff' && user?.role !== 'gate_agent') return <StaffLoginView area="ops" />;
  return <div className="min-h-screen bg-slate-50"><GateView user={user} token={token} onBack={logout} onSignIn={() => undefined} backLabel="Sign out" /></div>;
}
