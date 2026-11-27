import { cn } from '@/lib/utils';

export const Skeleton = ({ className, ...props }: React.ComponentProps<'div'>) => <div data-slot="skeleton" className={cn('animate-pulse rounded-2xl bg-slate-100', className)} {...props} />;
