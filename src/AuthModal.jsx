import { useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { TicketIcon } from './icons.jsx';

export default function AuthModal({ onClose }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [fullName, setFullName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(identifier, password);
      } else {
        await register(fullName, identifier, password);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-popover"
      >
        <div className="mb-5 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-blue text-white">
            <TicketIcon className="h-4.5 w-4.5" width={18} height={18} />
          </span>
          <div>
            <p className="text-base font-extrabold text-navy-950">
              {mode === 'login' ? 'Sign in to Swiftpass' : 'Create your account'}
            </p>
            <p className="text-xs text-slate-500">Manage bookings and speed up checkout</p>
          </div>
        </div>

        <div className="mb-4 flex rounded-lg bg-slate-100 p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 rounded-md py-1.5 transition ${mode === 'login' ? 'bg-white text-navy-950 shadow-sm' : 'text-slate-500'}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            className={`flex-1 rounded-md py-1.5 transition ${mode === 'register' ? 'bg-white text-navy-950 shadow-sm' : 'text-slate-500'}`}
          >
            Create account
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === 'register' && (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Full name
              </span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="field-input"
                placeholder="As it appears on ID"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Email or phone
            </span>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="field-input"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="field-input"
              placeholder="At least 8 characters"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-200">
              {error}
            </p>
          )}

          <button
            disabled={busy}
            className="mt-1 rounded-xl bg-brand-blue py-2.5 text-sm font-bold text-white transition enabled:hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button onClick={onClose} className="mt-4 w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-600">
          Cancel
        </button>
      </div>
    </div>
  );
}
