'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/shared/FormField';
import { InlineMessage } from '@/components/shared/InlineMessage';
import { Spinner } from '@/components/shared/Spinner';
import { useAuth } from '@/context/AuthContext';

/** Email/phone + password sign-in or sign-up: the one form behind the sign-in dialog and the staff login pages. */
export function CredentialsForm({ mode, onDone, idPlaceholder = 'you@example.com' }: { mode: 'login' | 'register'; onDone?: () => void; idPlaceholder?: string }) {
  const { login, register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') await login(identifier, password);
      else await register(fullName, identifier, password);
      onDone?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {mode === 'register' && <FormField label="Full name"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="As it appears on ID" /></FormField>}
      <FormField label="Email or phone"><Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoComplete="username" placeholder={idPlaceholder} /></FormField>
      <FormField label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="At least 8 characters" /></FormField>
      {error && <InlineMessage tone="error">{error}</InlineMessage>}
      <Button variant="brand" disabled={busy || !identifier || !password} className="mt-1 rounded-xl">
        {busy && <Spinner />}
        {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
      </Button>
    </form>
  );
}
