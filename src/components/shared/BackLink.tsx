import { Button } from '@/components/ui/button';

export const BackLink = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <Button variant="link" size="sm" onClick={onClick} className="mb-3 h-auto text-sm font-semibold">
    ← {children}
  </Button>
);
