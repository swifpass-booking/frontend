import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** A titled card: the building block of every form page (checkout, details, contact...). */
export function SectionCard({ title, className, children }: { title?: string; className?: string; children: React.ReactNode }) {
  return (
    <Card className={className}>
      <CardContent>
        {title && <h2 className={cn('mb-4 text-base font-extrabold text-navy-950')}>{title}</h2>}
        {children}
      </CardContent>
    </Card>
  );
}
