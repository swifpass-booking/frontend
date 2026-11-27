import { Card } from '@/components/ui/card';
import { CredentialsForm } from '@/components/auth/CredentialsForm';
import { Logo } from '@/components/shared/Logo';

/** Sign-in for /admin and /ops. Staff land in their own console after signing in; the traveller site never links here. */
export default function StaffLoginView({ area }: { area: 'admin' | 'ops' }) {
  return (
    <div className="grid min-h-screen place-items-center bg-navy-950 px-4">
      <Card className="w-full max-w-sm p-6 shadow-popover">
        <Logo href={null} className="mb-5 text-navy-950" />
        <p className="-mt-3 mb-5 text-sm font-semibold text-slate-500">{area === 'admin' ? 'Admin' : 'Operator console'}</p>
        <CredentialsForm mode="login" idPlaceholder="Email or phone" />
        <a href="/" className="mt-4 block text-center text-xs font-semibold text-slate-400 hover:text-brand-blue">← Traveller site</a>
      </Card>
    </div>
  );
}
