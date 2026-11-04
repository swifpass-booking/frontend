import { useEffect, useMemo, useRef, useState } from 'react';
import { createBooking, getCart, heldSeats, toOffer, type RawCart } from '../../api/rest';
import { useAuth } from '../../context/AuthContext';
import { formatDate, formatMoney, formatTime } from '../../lib/format';
import { isInternationalFlight } from '../../lib/passport';
import { redirectToGateway, savePendingCheckout } from '../../lib/payment';
import { ModeIcon } from '../icons';
import type { PaymentMethod } from '../../types/domain';

const METHODS: { key: PaymentMethod; label: string }[] = [
  { key: 'esewa', label: 'eSewa' },
  { key: 'khalti', label: 'Khalti' },
  { key: 'fonepay', label: 'FonePay' },
];

interface CartCardProps {
  cartId: string;
  /** Open the full checkout page with this cart. */
  onReview: () => void;
  onDismiss: () => void;
}

/** The held trip inside the chat: what is held, the seats, and pay buttons that go straight to the gateway. */
export default function CartCard({ cartId, onReview, onDismiss }: CartCardProps) {
  const { user, token } = useAuth();
  const [cart, setCart] = useState<RawCart | null>(null);
  const [problem, setProblem] = useState('');
  const [names, setNames] = useState<string[]>([]);
  const [phone, setPhone] = useState(user?.phoneE164 || '');
  const [email, setEmail] = useState(user?.email || '');
  const [agreed, setAgreed] = useState(false);
  const [paying, setPaying] = useState<PaymentMethod | null>(null);
  const [now, setNow] = useState(Date.now());
  const idempotencyKey = useRef(crypto.randomUUID());

  useEffect(() => {
    let cancelled = false;
    getCart(cartId, token)
      .then((c) => {
        if (cancelled) return;
        setCart(c);
        setNames(Array.from({ length: c.items[0]?.qty ?? 1 }, (_, i) => (i === 0 ? user?.fullName || '' : '')));
      })
      .catch((e: Error) => !cancelled && setProblem(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const item = cart?.items[0];
  const offer = useMemo(() => (item ? toOffer(item.offer) : null), [item]);
  const international = isInternationalFlight(offer);
  const left = cart ? Math.max(0, Math.floor((new Date(cart.expiresAt).getTime() - now) / 1000)) : 0;
  const valid = names.every((n) => n.trim().length > 1) && /^\+?\d{7,15}$/.test(phone) && agreed && left > 0;

  async function pay(method: PaymentMethod) {
    if (!item || !offer || !valid) return;
    setProblem('');
    setPaying(method);
    try {
      const seats = await heldSeats(item);
      const total = item.lineTotal;
      const booking = await createBooking(
        { offer, names, phone, email, payment: method, total, seats: seats?.map((s) => s.label), zoneId: seats ? undefined : item.zoneId || undefined },
        token,
        idempotencyKey.current,
      );
      if (!booking.gateway) throw new Error('This payment method is not available here. Use the full checkout.');
      savePendingCheckout({ offer, passengers: item.qty, seats: seats ?? [], zone: undefined, names, phone, email, payment: method, total, reference: booking.reference });
      redirectToGateway(booking.gateway);
    } catch (err) {
      const e = err as Error & { status?: number };
      setProblem(e.status === 409 ? 'The price changed. Open the full checkout to review it.' : e.message || 'Could not start the payment.');
      setPaying(null);
    }
  }

  if (!cart && !problem) return <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />;
  if (!cart || !item || !offer) {
    return <p className="rounded-2xl bg-slate-100 p-3 text-sm text-slate-600">{problem || "That trip isn't held anymore. Ask me to search again."}</p>;
  }

  const route = offer.venue ? offer.venue.city : [offer.origin?.city, offer.destination?.city].filter(Boolean).join(' → ');
  const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-navy-950 placeholder:text-slate-400 focus:border-brand-blue focus:outline-none';

  return (
    <div className="animate-[composerIn_0.25s_ease-out] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="flex items-start gap-3 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy-950/5 text-navy-800">
          <ModeIcon mode={offer.mode} className="h-5 w-5" width={20} height={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-blue">{offer.provider.displayName}</p>
          <p className="truncate text-[15px] font-bold text-navy-950">{offer.title}</p>
          <p className="text-sm text-slate-500">
            {route} · {formatDate(offer.departsAt)} {formatTime(offer.departsAt)}
          </p>
          {item.seatLabels.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.seatLabels.map((l) => (
                <span key={l} className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                  {l}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-extrabold text-navy-950">{formatMoney(item.lineTotal)}</p>
          <p className="text-xs text-slate-400">
            {item.qty} × · fees incl.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs">
        <span className={left > 0 && left < 120 ? 'font-semibold text-red-600' : 'text-slate-500'}>
          {left > 0 ? `Held for ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : 'Hold expired. Ask me to search again.'}
        </span>
        <button onClick={onDismiss} className="font-semibold text-slate-500 hover:text-navy-950">
          Dismiss
        </button>
      </div>

      {left > 0 && (
        <div className="space-y-3 border-t border-slate-100 p-4">
          {international ? (
            <p className="text-sm text-slate-600">International flights need passport details, so finish this one in the full checkout.</p>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                {names.map((n, i) => (
                  <input
                    key={i}
                    value={n}
                    onChange={(e) => setNames((p) => p.map((x, j) => (j === i ? e.target.value : x)))}
                    placeholder={names.length > 1 ? `Traveller ${i + 1} full name` : 'Full name'}
                    className={input}
                  />
                ))}
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone, e.g. +9779800000000" inputMode="tel" className={input} />
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" type="email" className={input} />
              </div>
              <label className="flex items-start gap-2 text-xs text-slate-500">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
                I agree to the fare rules and terms. My seat is not confirmed until payment succeeds.
              </label>
              <div className="flex flex-wrap gap-2">
                {METHODS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => pay(m.key)}
                    disabled={!valid || paying !== null}
                    className="flex items-center gap-2 rounded-full bg-navy-950 px-5 py-2 text-sm font-bold text-white transition active:scale-95 hover:bg-navy-800 disabled:bg-slate-300 disabled:text-slate-100"
                  >
                    {paying === m.key && <span className="voice-spin block h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white" />}
                    Pay with {m.label}
                  </button>
                ))}
              </div>
            </>
          )}
          {problem && <p className="text-sm font-semibold text-red-600">{problem}</p>}
          <button onClick={onReview} className="text-xs font-semibold text-brand-blue hover:underline">
            Open full checkout
          </button>
        </div>
      )}
    </div>
  );
}
