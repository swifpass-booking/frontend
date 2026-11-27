import { cn } from '@/lib/utils';

/** The dark title strip on top of a ticket card: title + subtitle on the left, extra info on the right. */
export function TicketHeaderBand({ title, subtitle, icon, right, className }: { title: string; subtitle?: string; icon?: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-2 bg-navy-950 px-5 py-3 text-white', className)}>
      <div className="flex items-center gap-3">
        {icon && <span className="grid size-9 place-items-center rounded-lg bg-white/10">{icon}</span>}
        <div>
          <p className="text-sm font-bold">{title}</p>
          {subtitle && <p className="text-xs text-navy-100/70">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="text-right text-xs">{right}</div>}
    </div>
  );
}
