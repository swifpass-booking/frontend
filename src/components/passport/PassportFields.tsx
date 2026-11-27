'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { FormField } from '@/components/shared/FormField';
import { InlineMessage } from '@/components/shared/InlineMessage';
import type { PassportDetails } from '@/types/domain';

interface PassportFieldsProps {
  value: PassportDetails;
  error: string | null | undefined;
  unverified: boolean;
  onChange: (patch: Partial<PassportDetails>) => void;
  onScan: () => void;
}

/** One traveller's passport form, with a scan shortcut. */
export function PassportFields({ value, error, unverified, onChange, onScan }: PassportFieldsProps) {
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-navy-950">Passport (required for international flights)</p>
        <Button type="button" size="sm" className="rounded-lg" onClick={onScan}>Scan passport</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Passport number"><Input value={value.passportNumber} onChange={(e) => onChange({ passportNumber: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} /></FormField>
        <FormField label="Nationality (3-letter)"><Input value={value.nationality} maxLength={3} placeholder="NPL" onChange={(e) => onChange({ nationality: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })} /></FormField>
        <FormField label="Date of birth"><Input type="date" value={value.birthDate} onChange={(e) => onChange({ birthDate: e.target.value })} /></FormField>
        <FormField label="Expiry date"><Input type="date" value={value.expiryDate} onChange={(e) => onChange({ expiryDate: e.target.value })} /></FormField>
        <FormField label="Sex">
          <NativeSelect value={value.sex} onChange={(e) => onChange({ sex: e.target.value as PassportDetails['sex'] })}>
            <option value="">Select</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="X">Unspecified</option>
          </NativeSelect>
        </FormField>
      </div>
      {unverified && <InlineMessage tone="warning" className="mt-2 text-xs">Scan check digits did not match — compare every field with your passport before continuing.</InlineMessage>}
      {error && <InlineMessage tone="error" className="mt-2 text-xs">{error}</InlineMessage>}
    </div>
  );
}
