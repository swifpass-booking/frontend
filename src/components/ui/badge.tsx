import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold', {
  variants: {
    variant: {
      default: 'bg-slate-100 text-slate-600',
      brand: 'bg-blue-50 text-brand-blue',
      success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
      warning: 'bg-amber-50 text-amber-700',
      destructive: 'bg-red-50 text-red-700',
    },
  },
  defaultVariants: { variant: 'default' },
});

function Badge({ className, variant, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
