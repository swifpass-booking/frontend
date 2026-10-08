import { useEffect, useRef, useState } from 'react';
import { verifyPayment } from '../api/rest';
import { takePendingCheckout } from '../lib/payment';
import type { BookingDraft } from '../types/domain';

interface PaymentReturnProps {
  provider: 'esewa' | 'khalti';
  onConfirmed: (booking: BookingDraft) => void;
  onBack: () => void;
}

/** Landing page after eSewa/Khalti redirect back: confirm with the backend, then show the tickets. */
export default function PaymentReturn({ provider, onConfirmed, onBack }: PaymentReturnProps) {
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false); // StrictMode double-invokes effects; the pending draft can only be taken once

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const q = new URLSearchParams(window.location.search);
    const draft = takePendingCheckout();
    verifyPayment({
      provider,
      data: q.get('data') ?? undefined,
      pidx: q.get('pidx') ?? undefined,
      failed: q.has('failed') || undefined,
      ref: q.get('ref') ?? undefined,
    })
      .then((booking) => {
        window.history.replaceState({}, '', '/');
        if (!draft) {
          setError(`Payment confirmed (reference ${booking.reference}), but the trip details were lost on return. Check your bookings.`);
          return;
        }
        onConfirmed({ ...draft, ...booking });
      })
      .catch((e: Error) => setError(e.message || 'Could not confirm the payment.'));
  }, [provider, onConfirmed]);

  if (!error) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="voice-spin mx-auto h-10 w-10 rounded-full border-4 border-slate-200 border-t-brand-blue" />
        <p className="mt-5 font-bold text-navy-950">Confirming your {provider === 'esewa' ? 'eSewa' : 'Khalti'} payment…</p>
        <p className="mt-1 text-sm text-slate-500">Please don't close this page.</p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-lg font-extrabold text-navy-950">Payment not completed</p>
      <p className="mt-2 text-sm text-slate-600">{error}</p>
      <button onClick={() => { window.history.replaceState({}, '', '/'); onBack(); }} className="mt-5 rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
        Back to search
      </button>
    </div>
  );
}
