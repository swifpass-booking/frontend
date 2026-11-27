import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 active:scale-95 disabled:pointer-events-none disabled:bg-slate-300 disabled:text-slate-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-navy-800',
        brand: 'bg-brand-blue text-white hover:bg-blue-700',
        destructive: 'bg-destructive text-white hover:bg-red-700',
        outline: 'border border-border bg-white text-foreground hover:bg-slate-50',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-slate-200',
        ghost: 'text-slate-500 hover:bg-slate-100 hover:text-foreground',
        link: 'rounded-none px-0 text-brand-blue hover:underline',
      },
      size: {
        default: 'h-10 px-5',
        sm: 'h-8 px-3.5 text-xs',
        lg: 'h-12 px-7 text-base',
        icon: 'size-10 p-0',
        'icon-sm': 'size-8 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button';
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
