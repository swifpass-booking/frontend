'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { verifyPayment } from '@/api/rest';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { Spinner } from '@/components/shared/Spinner';
import { PAYMENT_LABEL } from '@/lib/payment-methods';
import { takePendingCheckout } from '@/lib/payment';
import { useTrip } from '@/context/TripContext';
import type { PaymentMethod } from '@/types/domain';

type Provider = 'esewa' | 'khalti' | 'fonepay' | 'stripe';

/** Landing page after a gateway redirects back: confirm with the backend, then show the tickets. */
export default function PaymentReturnView({ provider }: { provider: Provider }) {
  const router = useRouter();
  const { confirm } = useTrip();
  const [error, setError] = useState<string | null>(null);
  const [paidRef, setPaidRef] = useState<string | null>(null); // paid, but this browser no longer has the trip details
  const ran = useRef(false); // StrictMode double-invokes effects; the pending draft can only be taken once

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const q = new URLSearchParams(window.location.search);
    const draft = takePendingCheckout();
    verifyPayment({
      provider,
      query: provider === 'fonepay' ? Object.fromEntries(q) : undefined,
      data: q.get('data') ?? undefined,
      pidx: q.get('pidx') ?? undefined,
      sessionId: q.get('session_id') ?? undefined,
      failed: q.has('failed') || undefined,
      ref: q.get('ref') ?? undefined,
    })
      .then((booking) => {
        window.history.replaceState(null, '', '/'); // a reload must not verify the same payment again
        toast.success('Payment successful', { description: `Booking ${booking.reference} is confirmed. Your tickets are ready.` });
        if (draft) confirm({ ...draft, ...booking });
        else setPaidRef(booking.reference);
      })
      .catch((e: Error) => {
        setError(e.message || 'Could not confirm the payment.');
        toast.error('Payment not completed', { description: e.message || 'Could not confirm the payment.' });
      });
  }, [provider, confirm]);

  if (paidRef) {
    return (
      <EmptyState title="Payment confirmed" action={<Button variant="brand" onClick={() => router.push('/tickets')}>Open My tickets</Button>}>
        Your reference is <span className="font-mono font-bold">{paidRef}</span>. Your tickets are in My tickets.
      </EmptyState>
    );
  }
  if (error) {
    return <EmptyState title="Payment not completed" action={<Button variant="brand" onClick={() => router.push('/')}>Back to search</Button>}>{error}</EmptyState>;
  }
  return (
    <EmptyState title={`Confirming your ${PAYMENT_LABEL[provider as PaymentMethod]} payment…`}>
      <Spinner className="mx-auto mb-4 size-10 border-4 text-brand-blue" />
      Please don't close this page.
    </EmptyState>
  );
}
