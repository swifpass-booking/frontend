import { cn } from '@/lib/utils';

export const Spinner = ({ className }: { className?: string }) => (
  <span aria-hidden className={cn('voice-spin block size-4 rounded-full border-2 border-current/30 border-t-current', className)} />
);
