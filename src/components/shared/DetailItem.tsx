import { cn } from '@/lib/utils';

/** A small caption over a bold value. */
export const DetailItem = ({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) => (
  <div className={className}>
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    <p className={cn('font-bold text-navy-950')}>{children}</p>
  </div>
);
