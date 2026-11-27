import { Button } from '@/components/ui/button';
import { ModeIcon } from '@/components/icons';
import { MODES } from '@/lib/offers';
import { cn } from '@/lib/utils';
import type { TravelMode } from '@/types/domain';

/** The row of trip kinds (flights, buses ...). `outlined` draws the idle chips with a border. */
export function ModeChips({ value, onPick, highlight = true, outlined = false, className }: { value: TravelMode; onPick: (m: TravelMode) => void; highlight?: boolean; outlined?: boolean; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {MODES.map((m) => (
        <Button
          key={m.key}
          type="button"
          size="sm"
          variant={highlight && value === m.key ? 'default' : 'ghost'}
          onClick={() => onPick(m.key)}
          className={cn('h-9 px-3.5 text-sm font-semibold text-navy-700', highlight && value === m.key && 'text-white', outlined && !(highlight && value === m.key) && 'border border-slate-200')}
        >
          <ModeIcon mode={m.key} className="size-4" width={16} height={16} />
          {m.label}
        </Button>
      ))}
    </div>
  );
}
