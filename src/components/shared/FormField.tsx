import { useId, type ReactElement, cloneElement } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/** A labelled control: the one place a label sits above an input. Pass the control as the only child. */
export function FormField({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: ReactElement<{ id?: string }> }) {
  const id = useId();
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Label htmlFor={id}>{label}</Label>
      {cloneElement(children, { id })}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
