import { useMemo, useRef, useState } from 'react';
import { formatMoney, formatTime, formatDate } from '../lib/format';
import { ModeIcon, ShieldIcon } from '../components/icons';
import { createBooking } from '../api/rest';
import type { AuthUser } from '../types/auth';
import { redirectToGateway, savePendingCheckout } from '../lib/payment';
import type { BookingDraft, Offer, PassportDetails, PaymentMethod, SeatPick } from '../types/domain';
import PassportScanner from '../components/PassportScanner';
import { emptyPassport, isInternationalFlight, passportProblem } from '../lib/passport';
import type { ScanResult } from '../lib/passport';

const PAYMENT_METHODS: { key: PaymentMethod; label: string }[] = [
  { key: 'esewa', label: 'eSewa' },
  { key: 'khalti', label: 'Khalti' },
  { key: 'fonepay', label: 'FonePay' },
  { key: 'card', label: 'Card' },
];

interface CheckoutProps {
  offer: Offer | null;
  passengers: number;
  seats: SeatPick[];
  account: AuthUser | null;
  token: string | null;
  onBack: () => void;
  onConfirm: (booking: BookingDraft) => void;
}

export default function Checkout({ offer, passengers, seats, account, token, onBack, onConfirm }: CheckoutProps) {
  const [names, setNames] = useState<string[]>(
    Array.from({ length: passengers }, (_, i) => (i === 0 ? account?.fullName || '' : ''))
  );
  const international = isInternationalFlight(offer);
  const [passportDetails, setPassportDetails] = useState<PassportDetails[]>(
    Array.from({ length: passengers }, emptyPassport)
  );
  const [scanning, setScanning] = useState<number | null>(null);
  // Travellers whose scan failed MRZ check digits: OCR likely misread a character.
  const [unverified, setUnverified] = useState<Record<number, boolean>>({});
  const [phone, setPhone] = useState(account?.phoneE164 || '');
  const [email, setEmail] = useState(account?.email || '');
  const [payment, setPayment] = useState<PaymentMethod>('esewa');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const passportErrors = useMemo(
    () => (international && offer ? passportDetails.map((p) => passportProblem(p, offer.departsAt)) : []),
    [international, offer, passportDetails]
  );

  const canConfirm = useMemo(
    () =>
      names.every((n) => n.trim().length > 1) &&
      /^\+?\d{7,15}$/.test(phone) &&
      agreed &&
      passportErrors.every((e) => e === null),
    [names, phone, agreed, passportErrors]
  );

  function updatePassport(i: number, patch: Partial<PassportDetails>) {
    setPassportDetails((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
    setUnverified((prev) => ({ ...prev, [i]: false }));
  }

  function applyScan(i: number, result: ScanResult) {
    if (result.fullName) updateName(i, result.fullName);
    updatePassport(i, result.passport);
    setUnverified((prev) => ({ ...prev, [i]: !result.checksumValid }));
    setScanning(null);
  }

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

  // Seat prices come from the zone each seat sits in (business vs economy, gold vs standard).
  const seated = seats.length === passengers;
  const fees = seated ? seats.reduce((n, s) => n + s.fee.amount, 0) : offer.fees.amount * passengers;
  const subtotal = seated ? seats.reduce((n, s) => n + s.price.amount, 0) : offer.price.amount * passengers;
  const total = { amount: subtotal + fees, currency: offer.price.currency };

  // One key per checkout screen: a double-tap or retry returns the same booking.
  const idempotencyKey = useRef(crypto.randomUUID());

  async function handlePay() {
    setError('');
    setSubmitting(true);
    try {
      const booking = await createBooking({ offer: offer as Offer, names, passports: international ? passportDetails : undefined, phone, email, payment, total, seats: seated ? seats.map((s) => s.label) : undefined }, token, idempotencyKey.current);
      if (booking.gateway) {
        // eSewa / Khalti: nothing is booked until the gateway confirms — go pay, come back via /payment/<provider>.
        savePendingCheckout({ offer: offer as Offer, passengers, seats, names, phone, email, payment, total, reference: booking.reference });
        redirectToGateway(booking.gateway);
        return;
      }
      onConfirm({ offer: offer as Offer, passengers, seats, names, phone, email, payment, total, ...booking });
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
                <div key={i}>
                  <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Traveller {i + 1} full name {i === 0 && '(lead)'}{seated && ` · Seat ${seats[i].label}`}
                  </span>
                  <input
                    value={n}
                    onChange={(e) => updateName(i, e.target.value)}
                    placeholder="As it appears on ID"
                    className="field-input"
                  />
                  </label>
                  {international && (
                    <PassportFields
                      value={passportDetails[i]}
                      error={passportErrors[i]}
                      unverified={!!unverified[i]}
                      onChange={(patch) => updatePassport(i, patch)}
                      onScan={() => setScanning(i)}
                    />
                  )}
                </div>
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

            {payment === 'esewa' && (
              <p className="mt-4 rounded-xl bg-emerald-50 px-3.5 py-3 text-xs leading-relaxed text-emerald-900">
                <span className="font-bold">eSewa test mode.</span> You'll be sent to eSewa's sandbox. Sign in with ID{' '}
                <code className="font-bold">9806800001</code>, password <code className="font-bold">Nepal@123</code>, then MPIN{' '}
                <code className="font-bold">1122</code> and OTP <code className="font-bold">123456</code>. No real money moves.
              </p>
            )}
            {payment === 'khalti' && (
              <p className="mt-4 rounded-xl bg-violet-50 px-3.5 py-3 text-xs leading-relaxed text-violet-900">
                <span className="font-bold">Khalti test mode.</span> You'll be sent to Khalti's sandbox to pay with a test wallet. No real money moves.
              </p>
            )}

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

      {scanning !== null && (
        <PassportScanner onResult={(r) => applyScan(scanning, r)} onClose={() => setScanning(null)} />
      )}
    </div>
  );
}

const LABEL = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400';

function PassportFields({
  value,
  error,
  unverified,
  onChange,
  onScan,
}: {
  value: PassportDetails;
  error: string | null | undefined;
  unverified: boolean;
  onChange: (patch: Partial<PassportDetails>) => void;
  onScan: () => void;
}) {
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-navy-950">Passport (required for international flights)</p>
        <button
          type="button"
          onClick={onScan}
          className="rounded-lg bg-navy-950 px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-800"
        >
          Scan passport
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={LABEL}>Passport number</span>
          <input
            value={value.passportNumber}
            onChange={(e) => onChange({ passportNumber: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
            className="field-input"
          />
        </label>
        <label className="block">
          <span className={LABEL}>Nationality (3-letter)</span>
          <input
            value={value.nationality}
            maxLength={3}
            placeholder="NPL"
            onChange={(e) => onChange({ nationality: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })}
            className="field-input"
          />
        </label>
        <label className="block">
          <span className={LABEL}>Date of birth</span>
          <input type="date" value={value.birthDate} onChange={(e) => onChange({ birthDate: e.target.value })} className="field-input" />
        </label>
        <label className="block">
          <span className={LABEL}>Expiry date</span>
          <input type="date" value={value.expiryDate} onChange={(e) => onChange({ expiryDate: e.target.value })} className="field-input" />
        </label>
        <label className="block">
          <span className={LABEL}>Sex</span>
          <select
            value={value.sex}
            onChange={(e) => onChange({ sex: e.target.value as PassportDetails['sex'] })}
            className="field-input"
          >
            <option value="">Select</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="X">Unspecified</option>
          </select>
        </label>
      </div>
      {unverified && (
        <p className="mt-2 text-xs font-semibold text-amber-700">
          Scan check digits did not match — compare every field with your passport before continuing.
        </p>
      )}
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
