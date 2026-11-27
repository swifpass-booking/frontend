'use client';

import { useRouter } from 'next/navigation';
import AdminView from '@/views/AdminView';
import GateView from '@/views/GateView';
import StaffLoginView from '@/views/StaffLoginView';
import { useAuth } from '@/context/AuthContext';

/** The admin console. Its "Booking site" tab shows the real traveller site in a frame, so admins see exactly what travellers book from. */
export default function Page() {
  const { user, token, ready, logout } = useAuth();
  const router = useRouter();
  if (!ready) return <div className="min-h-screen bg-slate-50" />;
  if (user?.role === 'operator_staff' || user?.role === 'gate_agent') { router.replace('/ops'); return null; }
  if (user?.role !== 'admin') return <StaffLoginView area="admin" />;
  return (
    <AdminView
      user={user}
      token={token}
      onSignOut={logout}
      storefront={<iframe src="/" title="Booking site" className="h-[80vh] w-full bg-white" />}
      scanner={<GateView user={user} token={token} onBack={() => undefined} onSignIn={() => undefined} embedded />}
    />
  );
}
