import { ModeIcon } from '@/components/icons';
import { formatMoney } from '@/lib/format';
import type { Offer, SearchCriteria } from '@/types/domain';

/** A "coming up" tile: tapping it runs the search that finds this departure. */
export function FeaturedOffer({ offer: o, onSearch }: { offer: Offer; onSearch: (c: SearchCriteria) => void }) {
  return (
    <button
      onClick={() => onSearch({ mode: o.mode, from: o.origin?.city || '', to: o.destination?.city || '', city: o.venue?.city || '', date: o.departsAt.slice(0, 10), passengers: 1 })}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-popover"
    >
      <div className="flex h-28 items-center justify-center bg-gradient-to-br from-navy-800 to-navy-950 text-white/90"><ModeIcon mode={o.mode} className="size-9" width={36} height={36} /></div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-brand-blue">{o.provider.displayName}</p>
        <p className="mt-0.5 line-clamp-2 text-sm font-bold text-navy-950">{o.title}</p>
        <div className="mt-auto flex items-end justify-between pt-3">
          <span className="text-xs text-slate-400">from</span>
          <span className="text-base font-extrabold text-navy-950">{formatMoney(o.price)}</span>
        </div>
      </div>
    </button>
  );
}
