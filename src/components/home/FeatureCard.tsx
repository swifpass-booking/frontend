import { Card } from '@/components/ui/card';

export function FeatureCard({ icon: Icon, title, body }: { icon: (p: { className?: string; width?: number; height?: number }) => React.ReactElement; title: string; body: string }) {
  return (
    <Card className="p-5">
      <span className="grid size-10 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue"><Icon className="size-5" width={20} height={20} /></span>
      <p className="mt-3 text-[15px] font-bold text-navy-950">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">{body}</p>
    </Card>
  );
}
