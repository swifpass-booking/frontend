import { useMemo, useRef, useState } from 'react';
import { formatMoney, formatTime, formatDate } from '../lib/format';
import { ModeIcon, ShieldIcon } from '../components/icons';
import { createBooking } from '../api/rest';
import type { AuthUser } from '../types/auth';
import type { BookingDraft, Offer, PaymentMethod } from '../types/domain';

const PAYMENT_METHODS: { key: PaymentMethod; label: string }[] = [
  { key: 'esewa', label: 'eSewa' },
  { key: 'khalti', label: 'Khalti' },
  { key: 'fonepay', label: 'FonePay' },
  { key: 'card', label: 'Card' },
];

interface CheckoutProps {
  offer: Offer | null;
  passengers: number;
  account: AuthUser | null;
  token: string | null;
  onBack: () => void;
  onConfirm: (booking: BookingDraft) => void;
}

export default function Checkout({ offer, passengers, account, token, onBack, onConfirm }: CheckoutProps) {
  const [names, setNames] = useState<string[]>(
    Array.from({ length: passengers }, (_, i) => (i === 0 ? account?.fullName || '' : ''))
  );
  const [phone, setPhone] = useState(account?.phoneE164 || '');
  const [email, setEmail] = useState(account?.email || '');
  const [payment, setPayment] = useState<PaymentMethod>('esewa');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canConfirm = useMemo(
    () => names.every((n) => n.trim().length > 1) && /^\+?\d{7,15}$/.test(phone) && agreed,
    [names, phone, agreed]
  );

  function updateName(i: number, value: string) {
    setNames((prev) => prev.map((n, idx) => (idx === i ? value : n)));
  }

  if (!offer) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="font-bold text-navy-950">Nothing to check out yet</p>
        <button onClick={onBack} className="mt-3 text-sm font-semibold text-brand-blue hover:underline">
          Back to search
        </button>
      </div>
    );
  }

  const fees = offer.fees.amount * passengers;
  const subtotal = offer.price.amount * passengers;
  const total = { amount: subtotal + fees, currency: offer.price.currency };

  // One key per checkout screen: a double-tap or retry returns the same booking.
  const idempotencyKey = useRef(crypto.randomUUID());

  async function handlePay() {
    setError('');
    setSubmitting(true);
    try {
      const booking = await createBooking({ offer: offer as Offer, names, phone, email, payment, total }, token, idempotencyKey.current);
      onConfirm({ offer: offer as Offer, passengers, names, phone, email, payment, total, ...booking });
    } catch (err) {
      setError((err as Error).message || 'Payment could not be confirmed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <button onClick={onBack} className="mb-4 text-sm font-semibold text-brand-blue hover:underline">
        ← Back to results
      </button>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="mb-4 text-base font-extrabold text-navy-950">Traveller details</h2>
            <div className="flex flex-col gap-3">
              {names.map((n, i) => (
                <label key={i} className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Traveller {i + 1} full name {i === 0 && '(lead)'}
                  </span>
                  <input
                    value={n}
                    onChange={(e) => updateName(i, e.target.value)}
                    placeholder="As it appears on ID"
                    className="field-input"
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="mb-4 text-base font-extrabold text-navy-950">Contact</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Phone
                </span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+9779841000000"
                  className="field-input"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Email (optional)
                </span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="field-input"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="mb-4 text-base font-extrabold text-navy-950">Payment method</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setPayment(m.key)}
                  className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${
                    payment === m.key
                      ? 'border-brand-blue bg-brand-blue/5 text-brand-blue'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <label className="mt-5 flex items-start gap-2.5 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-brand-blue"
              />
              I agree to the fare rules and terms of carriage. My seat is not confirmed until payment succeeds.
            </label>

            <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
              <ShieldIcon className="h-3.5 w-3.5" width={14} height={14} />
              Payment is protected — a duplicate tap never creates two bookings (idempotency key).
            </p>
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-card lg:sticky lg:top-24">
          <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy-950/5 text-navy-800">
              <ModeIcon mode={offer.mode} className="h-4.5 w-4.5" width={18} height={18} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-navy-950">{offer.title}</p>
              <p className="text-xs text-slate-500">
                {formatDate(offer.departsAt)} · {formatTime(offer.departsAt)}
              </p>
              <p className="text-xs text-slate-500">{offer.provider.displayName}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 py-4 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Fare × {passengers}</span>
              <span className="font-medium text-navy-950">{formatMoney({ amount: subtotal, currency: offer.price.currency })}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Taxes & fees</span>
              <span className="font-medium text-navy-950">{formatMoney({ amount: fees, currency: offer.price.currency })}</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-sm font-bold text-navy-950">Total</span>
            <span className="text-xl font-extrabold text-navy-950">{formatMoney(total)}</span>
          </div>

          {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}

          <button
            disabled={!canConfirm || submitting}
            onClick={handlePay}
            className="mt-5 w-full rounded-xl bg-brand-blue py-3 text-sm font-bold text-white transition enabled:hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? 'Confirming…' : `Confirm and pay ${formatMoney(total)}`}
          </button>
        </aside>
      </div>
    </div>
  );
}
