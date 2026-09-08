import { formatMoney, formatTime, formatDate, formatDuration } from './data.js';
import { ModeIcon, ClockIcon, ChevronRightIcon } from './icons.jsx';

const MODE_LABEL = { air: 'Flight', bus: 'Bus', rail: 'Train', event: 'Event' };

export default function OfferCard({ offer, onSelect }) {
  const isRoute = offer.mode !== 'event';
  const soldPct = Math.round(((offer.capacity - offer.seatsAvailable) / offer.capacity) * 100);
  const almostGone = offer.seatsAvailable > 0 && offer.seatsAvailable <= Math.max(4, Math.round(offer.capacity * 0.08));

  return (
    <div className="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-popover sm:flex-row sm:items-center sm:p-5">
      <div className="flex items-start gap-3 sm:w-64 sm:shrink-0">
        <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy-950/5 text-navy-800">
          <ModeIcon mode={offer.mode} className="h-5 w-5" width={20} height={20} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold uppercase tracking-wide text-brand-blue">
            {MODE_LABEL[offer.mode]} · {offer.provider.displayName}
          </p>
          <p className="truncate text-[15px] font-bold text-navy-950">{offer.title}</p>
          {offer.code && <p className="text-xs text-slate-400">{offer.code}</p>}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {isRoute ? (
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-lg font-extrabold text-navy-950">{formatTime(offer.departsAt)}</p>
              <p className="text-xs text-slate-500">{offer.origin?.city}</p>
            </div>
            <div className="flex w-16 flex-col items-center text-slate-300 sm:w-24">
              <span className="text-[11px] font-medium text-slate-400">
                {formatDuration(offer.durationMinutes) || '—'}
              </span>
              <div className="my-1 h-px w-full bg-slate-200" />
              <ChevronRightIcon className="h-3 w-3 -mt-2 bg-white text-slate-300" width={12} height={12} />
            </div>
            <div className="text-center">
              <p className="text-lg font-extrabold text-navy-950">{formatTime(offer.arrivesAt) || '—'}</p>
              <p className="text-xs text-slate-500">{offer.destination?.city}</p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-lg font-extrabold text-navy-950">{formatDate(offer.departsAt)}</p>
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <ClockIcon className="h-3 w-3" width={12} height={12} />
              Doors {formatTime(offer.departsAt)} · {offer.venue?.name}, {offer.venue?.city}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
          <div className="text-right">
            <p className="text-xl font-extrabold text-navy-950">{formatMoney(offer.price)}</p>
            <p className="text-xs text-slate-400">per traveller</p>
          </div>
          <button
            onClick={() => onSelect(offer)}
            className="rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            Select
          </button>
        </div>
      </div>

      {almostGone && (
        <span className="w-fit shrink-0 self-start rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-brand-amber ring-1 ring-inset ring-amber-200 sm:self-center">
          Only {offer.seatsAvailable} left · {soldPct}% booked
        </span>
      )}
    </div>
  );
}
