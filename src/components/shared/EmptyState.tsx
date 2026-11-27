import { cn } from '@/lib/utils';

/** Centered "nothing here" / "something finished" block with an optional action. */
export function EmptyState({ title, children, action, className }: { title: string; children?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto max-w-md px-4 py-20 text-center', className)}>
      <p className="text-lg font-extrabold text-navy-950">{title}</p>
      {children && <div className="mt-2 text-sm text-slate-600">{children}</div>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
