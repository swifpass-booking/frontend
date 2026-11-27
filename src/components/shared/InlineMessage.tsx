import { cn } from '@/lib/utils';

const TONE = {
  error: 'bg-red-50 text-red-700 ring-red-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  info: 'bg-sky-50 text-sky-900 ring-sky-200',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
} as const;

/** A short notice inside a page or form. For transient news use `toast` from sonner instead. */
export function InlineMessage({ tone = 'neutral', className, children }: { tone?: keyof typeof TONE; className?: string; children: React.ReactNode }) {
  return <p role={tone === 'error' ? 'alert' : undefined} className={cn('rounded-xl px-3.5 py-2.5 text-sm font-medium ring-1 ring-inset', TONE[tone], className)}>{children}</p>;
}
