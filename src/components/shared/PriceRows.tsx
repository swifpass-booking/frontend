import { formatMoney } from '@/lib/format';
import type { Money } from '@/types/domain';

export const PriceRow = ({ label, amount }: { label: string; amount: Money }) => (
  <div className="flex justify-between text-sm text-slate-500">
    <span>{label}</span>
    <span className="font-medium text-navy-950">{formatMoney(amount)}</span>
  </div>
);

export const TotalRow = ({ amount }: { amount: Money }) => (
  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
    <span className="text-sm font-bold text-navy-950">Total</span>
    <span className="text-xl font-extrabold text-navy-950">{formatMoney(amount)}</span>
  </div>
);
