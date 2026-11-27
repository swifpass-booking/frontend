import { ModeIcon } from '@/components/icons';
import { formatDate, formatMoney, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Money, Offer } from '@/types/domain';

/** What a trip is, in one block: mode icon, provider, title, route and time, optional price. Used by checkout, the cart card and tickets. */
export function TripSummary({ offer, price, priceNote, className, children }: { offer: Offer; price?: Money; priceNote?: string; className?: string; children?: React.ReactNode }) {
  const route = offer.venue ? offer.venue.city : [offer.origin?.city, offer.destination?.city].filter(Boolean).join(' → ');
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy-950/5 text-navy-800">
        <ModeIcon mode={offer.mode} className="size-5" width={20} height={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wide text-brand-blue">{offer.provider.displayName}</p>
        <p className="truncate text-[15px] font-bold text-navy-950">{offer.title}</p>
        <p className="text-sm text-slate-500">
          {route} · {formatDate(offer.departsAt)} {formatTime(offer.departsAt)}
        </p>
        {children}
      </div>
      {price && (
        <div className="text-right">
          <p className="text-lg font-extrabold text-navy-950">{formatMoney(price)}</p>
          {priceNote && <p className="text-xs text-slate-400">{priceNote}</p>}
        </div>
      )}
    </div>
  );
}
