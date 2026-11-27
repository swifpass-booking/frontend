'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getCart, heldSeats, toOffer } from '@/api/rest';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { InlineMessage } from '@/components/shared/InlineMessage';
import { TripSummary } from '@/components/shared/TripSummary';
import { AgreeCheckbox } from '@/components/shared/AgreeCheckbox';
import { Spinner } from '@/components/shared/Spinner';
import { useSignIn } from '@/components/auth/AuthDialog';
import { useAuth } from '@/context/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { useTravellerForm } from '@/hooks/useTravellerForm';
import { startPayment } from '@/lib/checkout';
import { GATEWAY_METHODS, PAYMENT_LABEL } from '@/lib/payment-methods';
import { isInternationalFlight } from '@/lib/passport';
import type { PaymentMethod } from '@/types/domain';

const CHAT_METHODS = GATEWAY_METHODS.filter((m) => m !== 'stripe');

interface CartCardProps {
  cartId: string;
  /** The chat session id that owns an anonymous cart. */
  guestKey: string;
  /** Open the full checkout page with this cart. */
  onReview: () => void;
  onDismiss: () => void;
}

/** Seconds left on the hold, ticking once a second until it reaches zero. */
function useCountdown(expiresAt: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= expiresAt) clearInterval(t); // stop re-rendering once the hold is dead
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  return expiresAt ? Math.max(0, Math.floor((expiresAt - now) / 1000)) : 0;
}

/** The held trip inside the chat: what is held, the seats, and pay buttons that go straight to the gateway. */
export default function CartCard({ cartId, guestKey, onReview, onDismiss }: CartCardProps) {
  const { user, token } = useAuth();
  const signIn = useSignIn();
  const { data: cart, error } = useAsync(() => getCart(cartId, token, guestKey), [cartId]);
  const item = cart?.items[0];
  const offer = useMemo(() => (item ? toOffer(item.offer) : null), [item]);
  const form = useTravellerForm(item?.qty ?? 1, user);
  const left = useCountdown(cart ? new Date(cart.expiresAt).getTime() : 0);
  const [formOpen, setFormOpen] = useState(false); // the pay-here form stays folded away until asked for
  const [paying, setPaying] = useState<PaymentMethod | null>(null);
  const [problem, setProblem] = useState('');
  const idempotencyKey = useRef(crypto.randomUUID());

  async function pay(method: PaymentMethod) {
    if (!item || !offer || !form.valid || left <= 0) return;
    if (!token) {
      setProblem('Sign in to pay. Your seats stay held.');
      return signIn();
    }
    setProblem('');
    setPaying(method);
    try {
      const seats = await heldSeats(item);
      await startPayment(
        { offer, passengers: item.qty, seats: seats ?? [], names: form.names, phone: form.phone, email: form.email, payment: method, total: item.lineTotal },
        { seats: seats?.map((s) => s.label), zoneId: seats ? undefined : item.zoneId || undefined },
        token,
        idempotencyKey.current,
      );
    } catch (err) {
      const e = err as Error & { status?: number };
      setProblem(e.status === 409 ? 'The price changed. Open the full checkout to review it.' : e.message || 'Could not start the payment.');
      setPaying(null);
    }
  }

  if (!cart && !error) return <Skeleton className="h-24" />;
  if (!cart || !item || !offer) return <InlineMessage>{error || "That trip isn't held anymore. Ask me to search again."}</InlineMessage>;

  return (
    <Card className="animate-[composerIn_0.25s_ease-out]">
      <TripSummary offer={offer} price={item.lineTotal} priceNote={`${item.qty} × · fees incl.`} className="p-4">
        {item.seatLabels.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.seatLabels.map((l) => <Badge key={l} variant="success" className="rounded-md">{l}</Badge>)}
          </div>
        )}
      </TripSummary>

      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs">
        <span className={left > 0 && left < 120 ? 'font-semibold text-red-600' : 'text-slate-500'}>
          {left > 0 ? `Held for ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : 'Hold expired. Ask me to search again.'}
        </span>
        <Button variant="ghost" size="sm" onClick={onDismiss} className="h-auto p-0 text-xs hover:bg-transparent">Dismiss</Button>
      </div>

      {left > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 p-4">
          <Button onClick={onReview}>Review &amp; pay</Button>
          <Button variant="link" size="sm" onClick={() => setFormOpen((v) => !v)} aria-expanded={formOpen}>{formOpen ? 'Hide details form' : 'Fill in details here'}</Button>
        </div>
      )}

      {left > 0 && formOpen && (
        <div className="space-y-3 border-t border-slate-100 p-4">
          {isInternationalFlight(offer) ? (
            <p className="text-sm text-slate-600">International flights need passport details, so finish this one in the full checkout.</p>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                {form.names.map((n, i) => <Input key={i} value={n} onChange={(e) => form.setName(i, e.target.value)} placeholder={form.names.length > 1 ? `Traveller ${i + 1} full name` : 'Full name'} />)}
                <Input value={form.phone} onChange={(e) => form.setPhone(e.target.value)} placeholder="Phone, e.g. +9779800000000" inputMode="tel" />
                <Input value={form.email} onChange={(e) => form.setEmail(e.target.value)} placeholder="Email (optional)" type="email" />
              </div>
              <AgreeCheckbox checked={form.agreed} onChange={form.setAgreed} className="text-xs text-slate-500" />
              <div className="flex flex-wrap gap-2">
                {CHAT_METHODS.map((m) => (
                  <Button key={m} onClick={() => pay(m)} disabled={!form.valid || paying !== null}>
                    {paying === m && <Spinner />}
                    Pay with {PAYMENT_LABEL[m]}
                  </Button>
                ))}
              </div>
            </>
          )}
          {problem && <InlineMessage tone="error">{problem}</InlineMessage>}
        </div>
      )}
    </Card>
  );
}
