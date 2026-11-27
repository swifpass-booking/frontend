import { cn } from '@/lib/utils';

const WIDTH = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl', full: 'max-w-7xl' } as const;

/** Centered page column with the site's standard gutters. */
export function PageContainer({ width = 'xl', className, ...props }: React.ComponentProps<'div'> & { width?: keyof typeof WIDTH }) {
  return <div className={cn('mx-auto w-full px-4 py-8 sm:px-6', WIDTH[width], className)} {...props} />;
}

export function PageHeading({ title, subtitle, className }: { title: string; subtitle?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mb-5', className)}>
      <h1 className="text-2xl font-extrabold text-navy-950">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
    </div>
  );
}
