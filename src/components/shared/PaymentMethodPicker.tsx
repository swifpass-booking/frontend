'use client';

import { Button } from '@/components/ui/button';
import { PAYMENT_LABEL, PAYMENT_METHODS } from '@/lib/payment-methods';
import { cn } from '@/lib/utils';
import type { PaymentMethod } from '@/types/domain';

const code = (s: string) => <code className="font-bold">{s}</code>;

const HINTS: Partial<Record<PaymentMethod, { bg: string; body: React.ReactNode }>> = {
  esewa: { bg: 'bg-emerald-50 text-emerald-900', body: <><b>eSewa test mode.</b> You'll be sent to eSewa's sandbox. Sign in with ID {code('9806800001')}, password {code('Nepal@123')}, then MPIN {code('1122')} and OTP {code('123456')}. No real money moves.</> },
  khalti: { bg: 'bg-violet-50 text-violet-900', body: <><b>Khalti test mode.</b> You'll be sent to Khalti's sandbox to pay with a test wallet. No real money moves.</> },
  fonepay: { bg: 'bg-rose-50 text-rose-900', body: <><b>Fonepay test mode.</b> You'll be sent to Fonepay's dev gateway to pay with a test account. No real money moves.</> },
  stripe: { bg: 'bg-indigo-50 text-indigo-900', body: <><b>Stripe test mode.</b> You'll be sent to Stripe Checkout (or the local simulator when no Stripe key is set). Visa {code('4242 4242 4242 4242')}; decline {code('4000 0000 0000 0002')}; 3-D Secure {code('4000 0025 0000 3155')}; no funds {code('4000 0000 0000 9995')}. Any future expiry, any CVC. No real money moves.</> },
};

/** The method grid + the sandbox hint for the chosen one. `children` renders extra fields for a method (the card form). */
export function PaymentMethodPicker({ value, onChange, children }: { value: PaymentMethod; onChange: (m: PaymentMethod) => void; children?: React.ReactNode }) {
  const hint = HINTS[value];
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PAYMENT_METHODS.map((m) => (
          <Button key={m} type="button" variant="outline" onClick={() => onChange(m)} className={cn('h-auto rounded-xl py-3', value === m && 'border-brand-blue bg-brand-blue/5 text-brand-blue hover:bg-brand-blue/5')}>
            {PAYMENT_LABEL[m]}
          </Button>
        ))}
      </div>
      {hint && <p className={cn('mt-4 rounded-xl px-3.5 py-3 text-xs leading-relaxed', hint.bg)}>{hint.body}</p>}
      {children}
    </div>
  );
}
