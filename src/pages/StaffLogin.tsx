import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { TicketIcon } from '../components/icons';

/** Sign-in for /admin and /ops. Staff land in their own console after signing in; the traveller site never links here. */
export default function StaffLogin({ area }: { area: 'admin' | 'ops' }) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(identifier, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-navy-950 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-popover">
        <div className="mb-5 flex items-center gap-2 text-lg font-extrabold text-navy-950">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-blue text-white">
            <TicketIcon className="h-4 w-4" width={18} height={18} />
          </span>
          Swiftpass {area === 'admin' ? 'Admin' : 'Operator console'}
        </div>
        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Email or phone</span>
          <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="field-input" autoComplete="username" />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="field-input" autoComplete="current-password" />
        </label>
        {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}
        <button disabled={busy || !identifier || !password} className="w-full rounded-xl bg-brand-blue py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <a href="/" className="mt-4 block text-center text-xs font-semibold text-slate-400 hover:text-brand-blue">
          ← Traveller site
        </a>
      </form>
    </div>
  );
}
