import * as React from 'react';
import { cn } from '@/lib/utils';

/** A styled native <select>: keeps the platform picker (great on phones) with the same look as Input. */
function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      data-slot="native-select"
      className={cn('h-10 w-full rounded-lg border border-input bg-slate-50 px-3 text-sm font-medium text-foreground outline-none transition focus:border-ring focus:bg-white focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:opacity-50', className)}
      {...props}
    />
  );
}

export { NativeSelect };
