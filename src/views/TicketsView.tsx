'use client';

import { useState, type FormEvent } from 'react';
import { lookupBooking, myBookings, type BookingRow } from '@/api/rest';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { FormField } from '@/components/shared/FormField';
import { InlineMessage } from '@/components/shared/InlineMessage';
import { PageContainer, PageHeading } from '@/components/shared/PageContainer';
import { TicketHeaderBand } from '@/components/ticket/TicketHeaderBand';
import { TicketQr } from '@/components/ticket/TicketQr';
import { useSignIn } from '@/components/auth/AuthDialog';
import { useAuth } from '@/context/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { formatDate, formatMoney, formatTime } from '@/lib/format';
import { redirectToGateway } from '@/lib/payment';

function BookingCard({ b }: { b: BookingRow }) {
  return (
    <Card>
      <TicketHeaderBand
        title={b.title}
        subtitle={`${b.providerName}${b.departsAt ? ` · ${formatDate(b.departsAt)} · ${formatTime(b.departsAt)}` : ''}`}
        right={<><p className="font-mono font-bold">{b.reference}</p><p className="text-navy-100/70">{formatMoney(b.total)}</p></>}
      />
      {b.status === 'confirmed' ? (
        <ul className="grid gap-4 p-5 sm:grid-cols-2">
          {b.tickets.map((t) => (
            <li key={t.ticketId} className="flex flex-col items-center gap-2 rounded-xl border border-slate-100 p-4">
              <p className="text-sm font-bold text-navy-950">{t.passengerName}</p>
              {(t.seatLabel || t.zoneLabel) && <p className="text-xs font-semibold text-brand-blue">{[t.zoneLabel, t.seatLabel && `Seat ${t.seatLabel}`].filter(Boolean).join(' · ')}</p>}
              <TicketQr code={t.code} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <p className="text-sm text-slate-600">Waiting for payment. If you already paid, your tickets appear here within a few minutes.</p>
          {b.gateway && <Button variant="brand" onClick={() => redirectToGateway(b.gateway!)}>Continue payment</Button>}
        </div>
      )}
    </Card>
  );
}

/** Every ticket the traveller has paid for: their account's bookings, plus any a guest looks up by reference and phone. */
export default function TicketsView() {
  const { user, token, ready } = useAuth();
  const signIn = useSignIn();
  const { data: mine, loading, error } = useAsync(() => myBookings(token), [user?.id, token], !!user);
  const [found, setFound] = useState<BookingRow[]>([]);
  const [reference, setReference] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [lookupError, setLookupError] = useState('');

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

  const rows = [...found, ...(user ? mine ?? [] : []).filter((m) => !found.some((f) => f.reference === m.reference))];

  return (
    <PageContainer width="lg">
      <PageHeading
        title="My tickets"
        subtitle={ready && !user && <><Button variant="link" size="sm" onClick={signIn} className="h-auto p-0">Sign in</Button> to see every booking on your account, or find a single booking below.</>}
      />
      <Card>
        <form onSubmit={lookup} className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <FormField label="Booking reference"><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="SWP-ABC123" /></FormField>
          <FormField label="Phone used to book"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+9779841000000" /></FormField>
          <Button variant="brand" disabled={busy || !reference.trim() || !phone.trim()} className="rounded-xl">{busy ? 'Finding…' : 'Find booking'}</Button>
          {lookupError && <InlineMessage tone="error" className="sm:col-span-3">{lookupError}</InlineMessage>}
        </form>
      </Card>

      {loading && <Skeleton className="mt-5 h-28 bg-white shadow-card" />}
      {error && <InlineMessage tone="error" className="mt-5">{error}</InlineMessage>}
      {!loading && !error && rows.length === 0 && <p className="mt-6 text-center text-sm text-slate-500">{user ? 'No bookings on this account yet.' : 'Your tickets will appear here once you find a booking.'}</p>}
      <div className="mt-5 flex flex-col gap-4">{rows.map((b) => <BookingCard key={b.reference} b={b} />)}</div>
    </PageContainer>
  );
}
