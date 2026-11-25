import { useState } from 'react';
import { simulateStripe } from '../api/rest';

// Mirrors what Stripe Checkout can do to a payment. Declines stay on this page, like retrying a card on stripe.com.
const OUTCOMES: { group: string; items: { key: string; label: string; hint: string }[] }[] = [
  {
    group: 'Succeeds',
    items: [
      { key: 'succeeded', label: 'Pay (4242 4242 4242 4242)', hint: 'Browser returns, backend re-checks the session, tickets issue.' },
      { key: 'webhook_only', label: 'Pay, browser never returns', hint: 'Only the webhook settles it (closed tab after paying).' },
      { key: 'paid_late', label: 'Pay after the 15-min hold expired', hint: 'Seats were released; re-confirmed if still free, else refund due.' },
    ],
  },
  {
    group: 'Card errors (retry here)',
    items: [
      { key: 'card_declined', label: 'Declined (…0002)', hint: 'generic decline' },
      { key: 'insufficient_funds', label: 'Insufficient funds (…9995)', hint: '' },
      { key: 'expired_card', label: 'Expired card (…0069)', hint: '' },
      { key: 'incorrect_cvc', label: 'Incorrect CVC (…0127)', hint: '' },
      { key: '3ds_failed', label: '3-D Secure fails (…3155)', hint: 'authentication not completed' },
      { key: 'processing_error', label: 'Processing error (…0119)', hint: '' },
    ],
  },
  {
    group: 'Edge cases',
    items: [
      { key: 'abandoned', label: 'Click "Back" on Checkout', hint: 'Cancel URL; seats free after the stale sweep.' },
      { key: 'session_expired', label: 'Checkout session expires', hint: 'Booking cancelled, seats released.' },
      { key: 'amount_mismatch', label: 'Underpaid by Rs 1', hint: 'Backend rejects: amount_mismatch.' },
    ],
  },
];

/** Dev-only stand-in for stripe.com/checkout, used when the backend runs with no STRIPE_SECRET_KEY. */
export default function StripeSim() {
  const sessionId = new URLSearchParams(window.location.search).get('session_id') ?? '';
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  async function run(outcome: string) {
    setBusy(outcome);
    setMessage('');
    try {
      const { next } = await simulateStripe(sessionId, outcome);
      window.location.assign(next === 'return' ? `/payment/stripe?session_id=${encodeURIComponent(sessionId)}` : next === 'cancel' ? '/payment/stripe?failed=1' : '/');
    } catch (e) {
      setMessage((e as Error).message);
      setBusy('');
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Simulated Stripe Checkout · test mode</p>
      <h1 className="mt-1 text-xl font-extrabold text-navy-950">How should this payment end?</h1>
      <p className="mt-1 break-all font-mono text-xs text-slate-400">{sessionId}</p>
      {message && <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-3 text-sm font-semibold text-red-700">{message}</p>}
      {OUTCOMES.map((g) => (
        <section key={g.group} className="mt-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{g.group}</h2>
          <div className="flex flex-col gap-2">
            {g.items.map((o) => (
              <button
                key={o.key}
                disabled={!!busy}
                onClick={() => run(o.key)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition enabled:hover:border-brand-blue disabled:opacity-50"
              >
                <span className="block text-sm font-bold text-navy-950">{busy === o.key ? 'Working…' : o.label}</span>
                {o.hint && <span className="block text-xs text-slate-500">{o.hint}</span>}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
