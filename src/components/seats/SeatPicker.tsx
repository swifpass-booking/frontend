import { useEffect, useMemo, useState } from 'react';
import { getSeatMap } from '../../api/rest';
import { formatMoney } from '../../lib/format';
import type { Offer, Seat, SeatMap, SeatPick, SeatSection } from '../../types/domain';

interface SeatPickerProps {
  offer: Offer;
  passengers: number;
  /** Seats already chosen (e.g. when coming back from checkout). */
  initial?: SeatPick[];
  onConfirm: (seats: SeatPick[]) => void;
  onClose?: () => void;
}

const FRONT_LABEL: Record<string, string> = {
  air: 'Front of aircraft',
  bus: 'Driver',
  rail: 'Front of coach',
};

function isCinema(offer: Offer) {
  return offer.mode === 'event' && offer.attributes?.category === 'cinema';
}

function Cell({
  seat,
  selected,
  section,
  onToggle,
}: {
  seat: Seat;
  selected: boolean;
  section: SeatSection;
  onToggle: () => void;
}) {
  const taken = seat.state !== 'available';
  const tags = seat.attributes.length ? ` · ${seat.attributes.join(', ')}` : '';
  const text = seat.label.includes('-') ? seat.label.split('-')[1] : seat.label;
  return (
    <button
      type="button"
      disabled={taken}
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={`Seat ${seat.label}${taken ? ', taken' : ''}`}
      title={`${seat.label}${tags} · ${taken ? 'taken' : formatMoney(section.price)}`}
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-md text-[10px] font-bold transition ${
        selected
          ? 'bg-brand-blue text-white ring-2 ring-brand-blue/30'
          : taken
            ? 'cursor-not-allowed bg-slate-200 text-slate-400'
            : 'border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
      }`}
    >
      {taken ? '×' : text}
    </button>
  );
}

export default function SeatPicker({ offer, passengers, initial, onConfirm, onClose }: SeatPickerProps) {
  const [map, setMap] = useState<SeatMap | null>(null);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<string[]>(() => initial?.map((s) => s.label) ?? []);

  useEffect(() => {
    let cancelled = false;
    getSeatMap(offer.occurrenceId)
      .then((m) => !cancelled && setMap(m))
      .catch((e: Error) => !cancelled && setError(e.message || 'Could not load the seat map.'));
    return () => {
      cancelled = true;
    };
  }, [offer.occurrenceId]);

  const index = useMemo(() => {
    const out = new Map<string, { seat: Seat; section: SeatSection }>();
    map?.sections.forEach((section) =>
      section.rows.forEach((row) => row.seats.forEach((seat) => seat && out.set(seat.label, { seat, section }))),
    );
    return out;
  }, [map]);

  function toggle(label: string) {
    setPicked((prev) => {
      if (prev.includes(label)) return prev.filter((l) => l !== label);
      // At the limit, the oldest pick makes room — handy for switching a single seat with one tap.
      return prev.length >= passengers ? [...prev.slice(1), label] : [...prev, label];
    });
  }

  const picks: SeatPick[] = picked
    .map((label) => index.get(label))
    .filter((x): x is { seat: Seat; section: SeatSection } => !!x)
    .map(({ seat, section }) => ({
      label: seat.label,
      zoneCode: section.code,
      zoneLabel: section.label,
      price: section.price,
      fee: section.fee,
    }));
  const total = picks.reduce((sum, p) => sum + p.price.amount + p.fee.amount, 0);
  const ready = picks.length === passengers;
  const cinema = isCinema(offer);

  if (error) return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>;
  if (!map) return <div className="h-40 animate-pulse rounded-xl bg-slate-100" />;
  if (!map.sections.length) {
    return (
      <div className="rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-600">
        This {offer.mode === 'event' ? 'event is general admission' : 'trip has open seating'} — seats are not
        assigned.
        <button
          onClick={() => onConfirm([])}
          className="ml-3 rounded-lg bg-brand-blue px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-navy-950">
          Choose {passengers === 1 ? 'your seat' : `${passengers} seats`}
          <span className="ml-2 text-xs font-medium text-slate-500">
            {picks.length}/{passengers} selected
          </span>
        </p>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <i className="h-3 w-3 rounded border border-emerald-300 bg-emerald-50" /> Available
          </span>
          <span className="flex items-center gap-1">
            <i className="h-3 w-3 rounded bg-brand-blue" /> Selected
          </span>
          <span className="flex items-center gap-1">
            <i className="h-3 w-3 rounded bg-slate-200" /> Taken
          </span>
        </div>
      </div>

      <div className="max-h-96 overflow-auto rounded-lg bg-white p-4">
        <div className="mx-auto w-fit min-w-full">
          {cinema || offer.mode === 'event' ? (
            <div
              className={`mx-auto mb-5 w-3/4 rounded-b-[50%] py-2 text-center text-[10px] font-bold uppercase tracking-[0.3em] ${
                cinema ? 'bg-slate-300 text-slate-600' : 'bg-navy-950/10 text-navy-800'
              }`}
            >
              {cinema ? 'Screen' : 'Stage'}
            </div>
          ) : (
            <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              ↑ {FRONT_LABEL[offer.mode]}
            </p>
          )}

          {map.sections.map((section) => (
            <div key={section.zoneId} className="mb-5 last:mb-0">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-bold text-navy-950">{section.label}</span>
                <span className="font-semibold text-slate-500">{formatMoney(section.price)} per seat</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                {section.rows.map((row) => (
                  <div key={row.row} className="flex items-center gap-1">
                    <span className="w-6 text-right text-[10px] font-semibold text-slate-400">{row.row}</span>
                    {row.seats.map((seat, i) =>
                      seat ? (
                        <Cell
                          key={seat.label}
                          seat={seat}
                          section={section}
                          selected={picked.includes(seat.label)}
                          onToggle={() => toggle(seat.label)}
                        />
                      ) : (
                        <span key={`gap-${i}`} className="w-4 shrink-0" />
                      ),
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          {picks.length ? (
            <>
              <span className="font-bold text-navy-950">{picks.map((p) => p.label).join(', ')}</span>
              <span className="ml-2 text-slate-500">
                incl. fees · {formatMoney({ amount: total, currency: 'NPR' })}
              </span>
            </>
          ) : (
            <span className="text-slate-500">Tap a seat to select it.</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <button onClick={onClose} className="px-3 py-2 text-sm font-semibold text-slate-500 hover:text-navy-950">
              Cancel
            </button>
          )}
          <button
            disabled={!ready}
            onClick={() => onConfirm(picks)}
            className="rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-bold text-white transition enabled:hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {ready ? 'Continue to checkout' : `Select ${passengers - picks.length} more`}
          </button>
        </div>
      </div>
    </div>
  );
}
