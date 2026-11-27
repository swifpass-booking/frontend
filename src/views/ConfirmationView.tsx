'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LiveMap from '@/components/map/LiveMap';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckIcon, ModeIcon } from '@/components/icons';
import { DetailItem } from '@/components/shared/DetailItem';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageContainer } from '@/components/shared/PageContainer';
import { TicketHeaderBand } from '@/components/ticket/TicketHeaderBand';
import { TicketQr } from '@/components/ticket/TicketQr';
import { useTrip } from '@/context/TripContext';
import { formatDate, formatMoney, formatTime } from '@/lib/format';
import { downloadTickets } from '@/lib/ticket-image';
import { isVenueMode } from '@/lib/offers';

export default function ConfirmationView() {
  const { booking, reset } = useTrip();
  const router = useRouter();
  const [tracking, setTracking] = useState(false);
  const done = () => { reset(); router.push('/'); window.scrollTo({ top: 0, behavior: 'instant' }); };

  if (!booking) return <EmptyState title="No booking to show" action={<Button variant="link" onClick={done}>Back to home</Button>} />;

  const { offer, names, total, tickets } = booking;
  const ref = booking.reference ?? '';
  const zoneLabel = booking.zone?.label ?? tickets?.[0]?.zoneLabel;
  const seatOf = (i: number) => booking.seats?.[i]?.label ?? tickets?.[i]?.seatLabel;

  const download = () => tickets?.length && downloadTickets(tickets, {
    title: zoneLabel ? `${offer.title} · ${zoneLabel}` : offer.title,
    providerName: offer.provider.displayName,
    date: formatDate(offer.departsAt),
    time: formatTime(offer.departsAt),
    reference: ref,
  });

  return (
    <PageContainer width="lg" className="py-10">
      <div className="mb-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-600"><CheckIcon className="size-7" width={28} height={28} /></span>
        <h1 className="mt-4 text-2xl font-extrabold text-navy-950">Booking confirmed</h1>
        <p className="mt-1 text-sm text-slate-500">Reference <span className="font-mono font-bold text-navy-950">{ref}</span></p>
      </div>

      <Card>
        <TicketHeaderBand title={offer.title} subtitle={`${offer.provider.displayName}${zoneLabel ? ` · ${zoneLabel}` : ''}`} icon={<ModeIcon mode={offer.mode} className="size-[18px]" width={18} height={18} />} className="py-4" />
        <div className="grid gap-6 p-5 sm:grid-cols-[1fr_auto] sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <DetailItem label="Date">{formatDate(offer.departsAt)}</DetailItem>
              <DetailItem label="Time">{formatTime(offer.departsAt)}</DetailItem>
              {offer.origin && <DetailItem label="From">{offer.origin.name}</DetailItem>}
              {offer.destination && <DetailItem label="To">{offer.destination.name}</DetailItem>}
              {offer.venue && <DetailItem label="Venue" className="col-span-2">{offer.venue.name}, {offer.venue.city}</DetailItem>}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Travellers</p>
              <ul className="mt-1 space-y-0.5">
                {names.map((n, i) => (
                  <li key={i} className="text-sm font-medium text-navy-950">
                    {n || `Traveller ${i + 1}`}
                    {seatOf(i) && <Badge variant="brand" className="ml-2 rounded px-1.5 py-0.5">Seat {seatOf(i)}</Badge>}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-4">
              <span className="text-sm font-bold text-navy-950">Total paid</span>
              <span className="text-lg font-extrabold text-navy-950">{formatMoney(total)}</span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 rounded-xl bg-slate-50 p-4">
            {tickets?.length ? tickets.map((t) => (
              <div key={t.ticketId} className="flex flex-col items-center gap-1.5">
                <TicketQr code={t.code} />
                <p className="text-center text-xs font-bold text-navy-950">{t.passengerName}</p>
                {t.seatLabel && <p className="text-center text-xs font-semibold text-brand-blue">Seat {t.seatLabel}</p>}
                <p className="text-center text-[11px] text-slate-400">Show this at the gate</p>
              </div>
            )) : <p className="max-w-[10rem] text-center text-xs text-slate-400">Ticket QR unavailable for this booking.</p>}
          </div>
        </div>
      </Card>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button variant="brand" size="lg" onClick={done}>Book another trip</Button>
        <Button variant="outline" size="lg" onClick={download} disabled={!tickets?.length}>Download ticket</Button>
        {!isVenueMode(offer.mode) && <Button variant="outline" size="lg" onClick={() => setTracking((v) => !v)}>{tracking ? 'Hide live location' : 'Track live location'}</Button>}
      </div>
      {tracking && <div className="mt-6"><LiveMap occurrenceId={offer.occurrenceId} onClose={() => setTracking(false)} /></div>}
    </PageContainer>
  );
}
