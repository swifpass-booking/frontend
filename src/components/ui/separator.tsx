import { cn } from '@/lib/utils';

export const Separator = ({ className, ...props }: React.ComponentProps<'div'>) => <div role="separator" className={cn('h-px w-full bg-slate-100', className)} {...props} />;
