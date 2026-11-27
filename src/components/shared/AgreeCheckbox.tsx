import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export function AgreeCheckbox({ checked, onChange, className }: { checked: boolean; onChange: (v: boolean) => void; className?: string }) {
  return (
    <label className={cn('flex items-start gap-2.5 text-sm text-slate-600', className)}>
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} className="mt-0.5" />
      I agree to the fare rules and terms of carriage. My seat is not confirmed until payment succeeds.
    </label>
  );
}
