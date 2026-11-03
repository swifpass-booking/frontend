import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { lookupBooking, myBookings, type BookingRow } from '../api/rest';
import { formatDate, formatMoney, formatTime } from '../lib/format';
import { redirectToGateway } from '../lib/payment';
import { TicketQr } from './Confirmation';

/** Every ticket the traveller has paid for: their account's bookings, plus any a guest looks up by reference and phone. */
export default function MyTickets({ onSignIn }: { onSignIn: () => void }) {
  const { user, token, ready } = useAuth();
  const [mine, setMine] = useState<BookingRow[]>([]);
  const [found, setFound] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [lookupError, setLookupError] = useState('');

  useEffect(() => {
    if (!user) {
      setMine([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    myBookings(token)
      .then((rows) => !cancelled && setMine(rows))
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user, token]);

  async function lookup(e: FormEvent) {
    e.preventDefault();
    setLookupError('');
    setBusy(true);
    try {
      const row = await lookupBooking(reference.trim(), phone.trim());
      setFound((prev) => [row, ...prev.filter((p) => p.reference !== row.reference)]);
      setReference('');
      setPhone('');
    } catch (err) {
      setLookupError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const rows = [...found, ...mine.filter((m) => !found.some((f) => f.reference === m.reference))];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-extrabold text-navy-950">My tickets</h1>

      {ready && !user && (
        <p className="mt-2 text-sm text-slate-600">
          <button onClick={onSignIn} className="font-semibold text-brand-blue hover:underline">
            Sign in
          </button>{' '}
          to see every booking on your account, or find a single booking below.
        </p>
      )}

      <form onSubmit={lookup} className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Booking reference</span>
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="SWP-ABC123" className="field-input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Phone used to book</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+9779841000000" className="field-input" />
        </label>
        <button
          disabled={busy || !reference.trim() || !phone.trim()}
          className="rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40"
        >
          {busy ? 'Finding…' : 'Find booking'}
        </button>
        {lookupError && <p className="text-sm font-semibold text-red-600 sm:col-span-3">{lookupError}</p>}
      </form>

      {loading && <div className="mt-5 h-28 animate-pulse rounded-2xl bg-white shadow-card" />}
      {error && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="mt-6 text-center text-sm text-slate-500">
          {user ? 'No bookings on this account yet.' : 'Your tickets will appear here once you find a booking.'}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-4">
        {rows.map((b) => (
          <section key={b.reference} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-navy-950 px-5 py-3 text-white">
              <div>
                <p className="text-sm font-bold">{b.title}</p>
                <p className="text-xs text-navy-100/70">
                  {b.providerName}
                  {b.departsAt && ` · ${formatDate(b.departsAt)} · ${formatTime(b.departsAt)}`}
                </p>
              </div>
              <div className="text-right text-xs">
                <p className="font-mono font-bold">{b.reference}</p>
                <p className="text-navy-100/70">{formatMoney(b.total)}</p>
              </div>
            </div>
            {b.status === 'confirmed' ? (
              <ul className="grid gap-4 p-5 sm:grid-cols-2">
                {b.tickets.map((t) => (
                  <li key={t.ticketId} className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 p-4">
                    <p className="text-sm font-bold text-navy-950">{t.passengerName}</p>
                    {(t.seatLabel || t.zoneLabel) && (
                      <p className="text-xs font-semibold text-brand-blue">
                        {[t.zoneLabel, t.seatLabel && `Seat ${t.seatLabel}`].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <TicketQr code={t.code} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <p className="text-sm text-slate-600">
                  Waiting for payment. If you already paid, your tickets appear here within a few minutes.
                </p>
                {b.gateway && (
                  <button
                    onClick={() => redirectToGateway(b.gateway!)}
                    className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                  >
                    Continue payment
                  </button>
                )}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
