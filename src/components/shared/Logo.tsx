import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({ className, size = 32, href = '/' }: { className?: string; size?: number; href?: string | null }) {
  const inner = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" width={size} height={size} className="object-contain" />
      Swiftpass
    </>
  );
  const cls = cn('flex items-center gap-2 text-lg font-extrabold tracking-tight', className);
  return href ? <Link href={href} className={cls}>{inner}</Link> : <span className={cls}>{inner}</span>;
}
