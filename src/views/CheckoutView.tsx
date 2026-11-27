'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/shared/FormField';
import { InlineMessage } from '@/components/shared/InlineMessage';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageContainer } from '@/components/shared/PageContainer';
import { SectionCard } from '@/components/shared/SectionCard';
import { BackLink } from '@/components/shared/BackLink';
import { PaymentMethodPicker } from '@/components/shared/PaymentMethodPicker';
import { ContactFields } from '@/components/shared/ContactFields';
import { AgreeCheckbox } from '@/components/shared/AgreeCheckbox';
import { PriceRow, TotalRow } from '@/components/shared/PriceRows';
import { TripSummary } from '@/components/shared/TripSummary';
import { Spinner } from '@/components/shared/Spinner';
import { PassportFields } from '@/components/passport/PassportFields';
import PassportScanner from '@/components/passport/PassportScanner';
import { ShieldIcon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import { useTrip } from '@/context/TripContext';
import { useTravellerForm } from '@/hooks/useTravellerForm';
import { startPayment } from '@/lib/checkout';
import { formatMoney } from '@/lib/format';
import { emptyPassport, isInternationalFlight, passportProblem, type ScanResult } from '@/lib/passport';
import type { Offer, PassportDetails, PaymentMethod, Zone } from '@/types/domain';

function ZonePicker({ offer, zones, value, passengers, onChange }: { offer: Offer; zones: Zone[]; value: string; passengers: number; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {[{ id: '', label: 'Standard', price: offer.price, seatsAvailable: offer.seatsAvailable }, ...zones].map((z) => {
        const soldOut = z.seatsAvailable < passengers;
        return (
          <label key={z.id} className={`flex items-center justify-between rounded-xl border px-3.5 py-3 text-sm ${value === z.id ? 'border-brand-blue bg-brand-blue/5' : 'border-slate-200'} ${soldOut ? 'opacity-40' : 'cursor-pointer'}`}>
            <span className="flex items-center gap-2.5 font-bold text-navy-950">
              <input type="radio" name="zone" checked={value === z.id} disabled={soldOut} onChange={() => onChange(z.id)} className="accent-brand-blue" />
              {z.label}
            </span>
            <span className="text-slate-500">{formatMoney(z.price)} each{soldOut && ' · sold out'}</span>
          </label>
        );
      })}
    </div>
  );
}

function CardFields({ card, onChange }: { card: { number: string; expiry: string; cvc: string }; onChange: (c: { number: string; expiry: string; cvc: string }) => void }) {
  return (
    <div className="mt-4 rounded-xl bg-sky-50 px-3.5 py-3 text-xs leading-relaxed text-sky-900">
      <p><b>Card test mode.</b> Visa <code className="font-bold">4242 4242 4242 4242</code>, Mastercard <code className="font-bold">5555 5555 5555 4444</code>, any future expiry, any 3-digit CVC. Use <code className="font-bold">4000 0000 0000 0002</code> to see a decline. No real money moves.</p>
      <div className="mt-3 grid grid-cols-[1fr_90px_80px] gap-2">
        <Input inputMode="numeric" autoComplete="off" placeholder="Card number" maxLength={19} value={card.number} onChange={(e) => onChange({ ...card, number: e.target.value.replace(/[^\d]/g, '').replace(/(.{4})/g, '$1 ').trim() })} />
        <Input inputMode="numeric" autoComplete="off" placeholder="MM/YY" maxLength={5} value={card.expiry} onChange={(e) => onChange({ ...card, expiry: e.target.value.replace(/[^\d/]/g, '') })} />
        <Input inputMode="numeric" autoComplete="off" placeholder="CVC" maxLength={3} value={card.cvc} onChange={(e) => onChange({ ...card, cvc: e.target.value.replace(/\D/g, '') })} />
      </div>
    </div>
  );
}

export default function CheckoutView() {
  const router = useRouter();
  const { offer, passengers, seats, zoneId: initialZone, confirm } = useTrip();
  const { user, token } = useAuth();
  if (!offer) return <EmptyState title="Nothing to check out yet" action={<Button variant="link" onClick={() => router.push('/')}>Back to search</Button>} />;
  return <Checkout offer={offer} passengers={passengers} seats={seats} initialZone={initialZone} account={user} token={token} onBack={() => router.back()} onConfirm={confirm} />;
}

function Checkout({ offer, passengers, seats, initialZone, account, token, onBack, onConfirm }: {
  offer: Offer; passengers: number; seats: ReturnType<typeof useTrip>['seats']; initialZone: string; account: ReturnType<typeof useAuth>['user']; token: string | null;
  onBack: () => void; onConfirm: ReturnType<typeof useTrip>['confirm'];
}) {
  const form = useTravellerForm(passengers, account);
  const international = isInternationalFlight(offer);
  const [passports, setPassports] = useState<PassportDetails[]>(() => Array.from({ length: passengers }, emptyPassport));
  const [scanning, setScanning] = useState<number | null>(null);
  const [unverified, setUnverified] = useState<Record<number, boolean>>({}); // scans whose MRZ check digits failed: OCR likely misread a character
  const [payment, setPayment] = useState<PaymentMethod>('esewa');
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '' });
  const [zoneId, setZoneId] = useState(initialZone);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const idempotencyKey = useRef(crypto.randomUUID()); // one key per checkout screen: a double-tap or retry returns the same booking

  const passportErrors = useMemo(() => (international ? passports.map((p) => passportProblem(p, offer.departsAt)) : []), [international, offer.departsAt, passports]);
  const canConfirm = form.valid && passportErrors.every((e) => e === null);

  const updatePassport = (i: number, patch: Partial<PassportDetails>) => {
    setPassports((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
    setUnverified((prev) => ({ ...prev, [i]: false }));
  };
  function applyScan(i: number, r: ScanResult) {
    if (r.fullName) form.setName(i, r.fullName);
    updatePassport(i, r.passport);
    setUnverified((prev) => ({ ...prev, [i]: !r.checksumValid }));
    setScanning(null);
  }

  // Seat prices come from the zone each seat sits in; zones without numbered seats (VIP stand, room type) are bought by count.
  const seated = seats.length === passengers;
  const countZones = seated ? [] : offer.zones.filter((z) => !z.isReservedSeating);
  const zone = countZones.find((z) => z.id === zoneId);
  const fees = seated ? seats.reduce((n, s) => n + s.fee.amount, 0) : (zone?.fee ?? offer.fees).amount * passengers;
  const subtotal = seated ? seats.reduce((n, s) => n + s.price.amount, 0) : (zone?.price ?? offer.price).amount * passengers;
  const currency = offer.price.currency;
  const total = { amount: subtotal + fees, currency };

  async function handlePay() {
    setError('');
    setSubmitting(true);
    try {
      const booking = await startPayment(
        { offer, passengers, seats, zone, names: form.names, phone: form.phone, email: form.email, payment, total },
        { passports: international ? passports : undefined, card: payment === 'card' ? card : undefined, seats: seated ? seats.map((s) => s.label) : undefined, zoneId: zone?.id },
        token,
        idempotencyKey.current,
      );
      if (booking) onConfirm(booking);
    } catch (err) {
      setError((err as Error).message || 'Payment could not be confirmed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContainer>
      <BackLink onClick={onBack}>Back to results</BackLink>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <SectionCard title="Traveller details">
            <div className="flex flex-col gap-3">
              {form.names.map((n, i) => (
                <div key={i}>
                  <FormField label={`Traveller ${i + 1} full name${i === 0 ? ' (lead)' : ''}${seated ? ` · Seat ${seats[i].label}` : ''}`}>
                    <Input value={n} onChange={(e) => form.setName(i, e.target.value)} placeholder="As it appears on ID" />
                  </FormField>
                  {international && <PassportFields value={passports[i]} error={passportErrors[i]} unverified={!!unverified[i]} onChange={(patch) => updatePassport(i, patch)} onScan={() => setScanning(i)} />}
                </div>
              ))}
            </div>
          </SectionCard>

          {countZones.length > 0 && (
            <SectionCard title="Ticket type">
              <ZonePicker offer={offer} zones={countZones} value={zoneId} passengers={passengers} onChange={(id) => { setZoneId(id); idempotencyKey.current = crypto.randomUUID(); /* a different order must not replay the old booking */ }} />
            </SectionCard>
          )}

          <SectionCard title="Contact">
            <ContactFields phone={form.phone} email={form.email} onPhone={form.setPhone} onEmail={form.setEmail} />
          </SectionCard>

          <SectionCard title="Payment method">
            <PaymentMethodPicker value={payment} onChange={setPayment}>{payment === 'card' && <CardFields card={card} onChange={setCard} />}</PaymentMethodPicker>
            <AgreeCheckbox checked={form.agreed} onChange={form.setAgreed} className="mt-5" />
            <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400"><ShieldIcon className="size-3.5" width={14} height={14} />Payment is protected — a duplicate tap never creates two bookings (idempotency key).</p>
          </SectionCard>
        </div>

        <Card className="h-fit lg:sticky lg:top-24">
          <CardContent>
            <TripSummary offer={offer} className="border-b border-slate-100 pb-4" />
            <div className="flex flex-col gap-2 py-4">
              <PriceRow label={zone ? `${zone.label} × ${passengers}` : `Fare × ${passengers}`} amount={{ amount: subtotal, currency }} />
              <PriceRow label="Taxes & fees" amount={{ amount: fees, currency }} />
            </div>
            <TotalRow amount={total} />
            {error && <InlineMessage tone="error" className="mt-4">{error}</InlineMessage>}
            <Button variant="brand" size="lg" disabled={!canConfirm || submitting} onClick={handlePay} className="mt-5 w-full rounded-xl">
              {submitting && <Spinner />}
              {submitting ? 'Confirming…' : `Confirm and pay ${formatMoney(total)}`}
            </Button>
          </CardContent>
        </Card>
      </div>

      {scanning !== null && <PassportScanner onResult={(r) => applyScan(scanning, r)} onClose={() => setScanning(null)} />}
    </PageContainer>
  );
}
