import * as React from 'react';
import { cn } from '@/lib/utils';

const Card = ({ className, ...props }: React.ComponentProps<'div'>) => (
  <div data-slot="card" className={cn('overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-card', className)} {...props} />
);
const CardHeader = ({ className, ...props }: React.ComponentProps<'div'>) => <div data-slot="card-header" className={cn('flex flex-col gap-1 px-5 pt-5', className)} {...props} />;
const CardTitle = ({ className, ...props }: React.ComponentProps<'h3'>) => <h3 data-slot="card-title" className={cn('text-base font-extrabold leading-tight', className)} {...props} />;
const CardDescription = ({ className, ...props }: React.ComponentProps<'p'>) => <p data-slot="card-description" className={cn('text-sm text-muted-foreground', className)} {...props} />;
const CardContent = ({ className, ...props }: React.ComponentProps<'div'>) => <div data-slot="card-content" className={cn('p-5', className)} {...props} />;
const CardFooter = ({ className, ...props }: React.ComponentProps<'div'>) => <div data-slot="card-footer" className={cn('flex items-center border-t border-slate-100 bg-slate-50 px-5 py-3', className)} {...props} />;

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
