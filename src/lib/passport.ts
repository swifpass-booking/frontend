import { parse } from 'mrz';
import type { Offer, PassportDetails } from '../types/domain';

/** International = a flight whose origin and destination sit in different countries. */
export function isInternationalFlight(offer: Offer | null): boolean {
  if (!offer || offer.mode !== 'air') return false;
  const from = offer.origin?.country;
  const to = offer.destination?.country;
  return !!from && !!to && from !== to;
}

export const emptyPassport = (): PassportDetails => ({
  passportNumber: '',
  nationality: '',
  birthDate: '',
  expiryDate: '',
  sex: '',
});

// MRZ dates are YYMMDD. Birth years in the future are really the previous century;
// expiry years are always read as 20YY.
function expandDate(yymmdd: string, kind: 'birth' | 'expiry'): string {
  if (!/^\d{6}$/.test(yymmdd)) return '';
  const yy = Number(yymmdd.slice(0, 2));
  const now = new Date().getFullYear();
  let year = 2000 + yy;
  if (kind === 'birth' && year > now) year -= 100;
  return `${year}-${yymmdd.slice(2, 4)}-${yymmdd.slice(4, 6)}`;
}

export interface ScanResult {
  fullName: string;
  passport: PassportDetails;
  /** Every MRZ check digit matched. When false the traveller must review each field. */
  checksumValid: boolean;
}

/** Pull candidate TD3 (passport) lines out of noisy OCR text: two 44-char lines, first starting with P. */
export function extractMrzLines(text: string): string[] | null {
  const lines = text
    .split('\n')
    .map((l) => l.replace(/\s+/g, '').toUpperCase().replace(/[«‹]/g, '<'))
    .filter((l) => l.length >= 30);
  for (let i = 0; i < lines.length - 1; i++) {
    const first = lines[i];
    if (!first.startsWith('P')) continue;
    const pad = (l: string) => l.slice(0, 44).padEnd(44, '<');
    return [pad(first), pad(lines[i + 1])];
  }
  return null;
}

export function parsePassportText(text: string): ScanResult | null {
  const lines = extractMrzLines(text);
  if (!lines) return null;
  let result;
  try {
    result = parse(lines, { autocorrect: true });
  } catch {
    return null;
  }
  if (result.format !== 'TD3') return null;
  const f = result.fields;
  const sex = f.sex === 'male' ? 'M' : f.sex === 'female' ? 'F' : f.sex === 'nonspecified' ? 'X' : '';
  return {
    fullName: [f.firstName, f.lastName].filter(Boolean).join(' '),
    checksumValid: result.valid,
    passport: {
      passportNumber: f.documentNumber ?? '',
      // Read raw from line 2 (cols 11-13): the library returns null for codes outside its state list.
      nationality: lines[1].slice(10, 13).replace(/</g, ''),
      birthDate: expandDate(f.birthDate ?? '', 'birth'),
      expiryDate: expandDate(f.expirationDate ?? '', 'expiry'),
      sex,
    },
  };
}

/** Airlines commonly require 6 months of validity left on the day of travel. */
export function passportProblem(p: PassportDetails, departsAt: string): string | null {
  if (!/^[A-Z0-9]{5,12}$/.test(p.passportNumber.toUpperCase())) return 'Enter a valid passport number.';
  if (!/^[A-Z]{3}$/.test(p.nationality.toUpperCase())) return 'Nationality must be a 3-letter code (e.g. NPL).';
  if (!p.birthDate || new Date(p.birthDate) >= new Date()) return 'Enter a valid date of birth.';
  if (!['M', 'F', 'X'].includes(p.sex)) return 'Select sex as shown on the passport.';
  if (!p.expiryDate) return 'Enter the passport expiry date.';
  const minExpiry = new Date(departsAt);
  minExpiry.setMonth(minExpiry.getMonth() + 6);
  if (new Date(p.expiryDate) < minExpiry) return 'Passport must be valid for at least 6 months after travel.';
  return null;
}
