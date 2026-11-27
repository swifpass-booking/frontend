import { createBooking, type CreateBookingPayload } from '@/api/rest';
import { redirectToGateway, savePendingCheckout } from './payment';
import type { BookingDraft } from '@/types/domain';

type Draft = Omit<BookingDraft, 'tickets' | 'reference'>;

/** Create the booking for a checkout. Gateway methods (eSewa, Khalti, FonePay, Stripe) leave the site to pay and return `null`;
 *  an instant method returns the finished booking. The one place checkout and the chat cart card share. */
export async function startPayment(draft: Draft, payload: Omit<CreateBookingPayload, 'offer' | 'names' | 'phone' | 'email' | 'payment' | 'total'>, token: string | null, idempotencyKey: string): Promise<BookingDraft | null> {
  const { offer, names, phone, email, payment, total } = draft;
  const booking = await createBooking({ offer, names, phone, email, payment, total, ...payload }, token, idempotencyKey);
  if (booking.gateway) {
    // Nothing is booked until the gateway confirms: go pay, come back via /payment/<provider>.
    savePendingCheckout({ ...draft, reference: booking.reference });
    redirectToGateway(booking.gateway);
    return null;
  }
  return { ...draft, ...booking };
}
