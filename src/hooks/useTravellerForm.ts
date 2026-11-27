'use client';

import { useState } from 'react';
import type { AuthUser } from '@/types/auth';

/** Traveller names + contact + terms: the form state shared by the full checkout and the chat cart card. */
export function useTravellerForm(count: number, account: AuthUser | null) {
  const [names, setNames] = useState<string[]>(() => Array.from({ length: count }, (_, i) => (i === 0 ? account?.fullName || '' : '')));
  const [phone, setPhone] = useState(account?.phoneE164 || '');
  const [email, setEmail] = useState(account?.email || '');
  const [agreed, setAgreed] = useState(false);

  const setName = (i: number, value: string) => setNames((p) => p.map((n, j) => (j === i ? value : n)));
  const valid = names.every((n) => n.trim().length > 1) && /^\+?\d{7,15}$/.test(phone) && agreed;

  return { names, setName, phone, setPhone, email, setEmail, agreed, setAgreed, valid };
}
