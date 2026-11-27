'use client';

import * as React from 'react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root data-slot="checkbox" className={cn('peer size-4 shrink-0 rounded-[4px] border border-slate-300 bg-white outline-none transition focus-visible:ring-[3px] focus-visible:ring-ring/30 data-[state=checked]:border-brand-blue data-[state=checked]:bg-brand-blue data-[state=checked]:text-white', className)} {...props}>
      <CheckboxPrimitive.Indicator className="grid place-items-center text-current">
        <Check className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
