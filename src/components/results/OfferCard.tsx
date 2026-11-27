'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SeatPicker from '@/components/seats/SeatPicker';
import { ModeIcon, ClockIcon, ChevronRightIcon } from '@/components/icons';
import { formatDate, formatDuration, formatMoney, formatTime } from '@/lib/format';
import { isStayMode, isVenueMode, MODE_NOUN } from '@/lib/offers';
import type { Offer, SeatPick } from '@/types/domain';

interface OfferCardProps {
  offer: Offer;
  passengers?: number;
  onSelect: (offer: Offer, passengers?: number, seats?: SeatPick[]) => void;
}

/** Departure → arrival with the duration line between them. */
function RouteTimes({ offer }: { offer: Offer }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-center">
        <p className="text-lg font-extrabold text-navy-950">{formatTime(offer.departsAt)}</p>
        <p className="text-xs text-slate-500">{offer.origin?.city}</p>
      </div>
      <div className="flex w-16 flex-col items-center text-slate-300 sm:w-24">
        <span className="text-[11px] font-medium text-slate-400">{formatDuration(offer.durationMinutes) || '—'}</span>
        <div className="my-1 h-px w-full bg-slate-200" />
        <ChevronRightIcon className="-mt-2 size-3 bg-white text-slate-300" width={12} height={12} />
      </div>
      <div className="text-center">
        <p className="text-lg font-extrabold text-navy-950">{formatTime(offer.arrivesAt) || '—'}</p>
        <p className="text-xs text-slate-500">{offer.destination?.city}</p>
      </div>
    </div>
  );
}

export default function OfferCard({ offer, passengers = 1, onSelect }: OfferCardProps) {
  const [picking, setPicking] = useState(false);
  const seated = offer.hasReservedSeating;
  const soldPct = Math.round(((offer.capacity - offer.seatsAvailable) / offer.capacity) * 100);
  const almostGone = offer.seatsAvailable > 0 && offer.seatsAvailable <= Math.max(4, Math.round(offer.capacity * 0.08));

  return (
    <div className="flex flex-col gap-2">
      <Card className="group flex flex-col gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-popover sm:flex-row sm:items-center sm:p-5">
        <div className="flex items-start gap-3 sm:w-64 sm:shrink-0">
          <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-navy-950/5 text-navy-800">
            <ModeIcon mode={offer.mode} className="size-5" width={20} height={20} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold uppercase tracking-wide text-brand-blue">{MODE_NOUN[offer.mode]} · {offer.provider.displayName}</p>
            <p className="truncate text-[15px] font-bold text-navy-950">{offer.title}</p>
            {offer.code && <p className="text-xs text-slate-400">{offer.code}</p>}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {isVenueMode(offer.mode) ? (
            <div>
              <p className="text-lg font-extrabold text-navy-950">{formatDate(offer.departsAt)}</p>
              <p className="flex items-center gap-1 text-xs text-slate-500">
                <ClockIcon className="size-3" width={12} height={12} />
                {isStayMode(offer.mode) ? 'Check-in' : 'Doors'} {formatTime(offer.departsAt)} · {offer.venue?.name}, {offer.venue?.city}
              </p>
            </div>
          ) : (
            <RouteTimes offer={offer} />
          )}

          <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
            <div className="text-right">
              <p className="text-xl font-extrabold text-navy-950">{formatMoney(offer.price)}</p>
              <p className="text-xs text-slate-400">per traveller</p>
            </div>
            <Button variant="brand" className="rounded-lg" onClick={() => (seated ? setPicking((v) => !v) : onSelect(offer, passengers))}>
              {seated ? (picking ? 'Hide seats' : 'Choose seats') : 'Select'}
            </Button>
          </div>
        </div>

        {almostGone && <Badge variant="warning" className="w-fit self-start text-[11px] text-brand-amber ring-1 ring-inset ring-amber-200 sm:self-center">Only {offer.seatsAvailable} left · {soldPct}% booked</Badge>}
      </Card>
      {picking && <SeatPicker offer={offer} passengers={passengers} onClose={() => setPicking(false)} onConfirm={(seats) => onSelect(offer, passengers, seats)} />}
    </div>
  );
}
