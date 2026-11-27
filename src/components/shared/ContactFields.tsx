import { FormField } from './FormField';
import { Input } from '@/components/ui/input';

/** Phone + email inputs. */
export function ContactFields({ phone, email, onPhone, onEmail }: { phone: string; email: string; onPhone: (v: string) => void; onEmail: (v: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <FormField label="Phone"><Input value={phone} onChange={(e) => onPhone(e.target.value)} placeholder="+9779841000000" inputMode="tel" /></FormField>
      <FormField label="Email (optional)"><Input value={email} onChange={(e) => onEmail(e.target.value)} placeholder="you@example.com" type="email" /></FormField>
    </div>
  );
}
