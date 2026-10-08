/** Thin fetch wrapper for the real (non-mock) Django backend: auth, bookings, admin, carts.
 *  The voice concierge is a separate service — see api/voiceAgent.ts. */
import type { AdminBookingRow, AdminOccurrenceRow, AdminStats, AdminUserRow } from '../types/admin';
import type { BookingDraft, Money, Offer, PaymentMethod, Place, SearchCriteria, Ticket, Zone } from '../types/domain';
import type { ScanCounts, ScanEvent, ScanVerdict } from '../types/gate';

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
}

async function request<T>(path: string, { method = 'GET', body, token, headers: extra }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  Object.assign(headers, extra);

  const res = await fetch(`/v1${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || 'Something went wrong. Try again.');
  }
  return json as T;
}

export interface CreateBookingPayload {
  offer: BookingDraft['offer'];
  names: string[];
  phone: string;
  email: string;
  payment: PaymentMethod;
  total: Money;
}

/** Redirect instructions for eSewa/Khalti — present when the booking is pending payment. */
export interface PaymentGateway {
  provider: 'esewa' | 'khalti';
  method: 'GET' | 'POST';
  url: string;
  fields?: Record<string, string>;
}

export interface CreateBookingResponse {
  reference: string;
  status?: string;
  tickets: Ticket[];
  gateway?: PaymentGateway;
}

/** Pass the same `idempotencyKey` when retrying so a repeat tap never books twice. */
export const createBooking = (payload: CreateBookingPayload, token: string | null, idempotencyKey?: string) =>
  request<CreateBookingResponse>('/bookings', {
    method: 'POST',
    body: payload,
    token,
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
  });

export const adminStats = (token: string | null) => request<AdminStats>('/admin/stats', { token });
export const adminUsers = (token: string | null) => request<{ users: AdminUserRow[] }>('/admin/users', { token });
export const adminOccurrences = (token: string | null) =>
  request<{ occurrences: AdminOccurrenceRow[] }>('/admin/occurrences', { token });
export const adminBookings = (token: string | null) =>
  request<{ bookings: AdminBookingRow[] }>('/admin/bookings', { token });

export const scanRedeem = (code: string, occurrenceId: string, gate: string, token: string | null) =>
  request<ScanVerdict>('/scan/redeem', {
    method: 'POST',
    body: { code, occurrenceId: occurrenceId || null, gate },
    token,
  });

export const scanStats = (occurrenceId: string, token: string | null) =>
  request<ScanCounts>(`/scan/stats${occurrenceId ? `?occurrenceId=${encodeURIComponent(occurrenceId)}` : ''}`, {
    token,
  });

export const scanHistory = (occurrenceId: string, token: string | null) =>
  request<{ scans: ScanEvent[] }>(`/scan/history${occurrenceId ? `?occurrenceId=${encodeURIComponent(occurrenceId)}` : ''}`, {
    token,
  });

/** The shape Occurrence.to_offer_dict() actually sends — close to, but not
 *  identical to, the mock-driven `Offer` type (no `code`/`capacity`/
 *  `attributes`/`status`; has `details`/`rankingReason`/`quoteExpiresAt`
 *  instead). `toOffer` below bridges the two so a cart fetched from the real
 *  backend can be handed to the existing manual Checkout page. */
interface RawOffer {
  offerId: string;
  occurrenceId: string;
  mode: Offer['mode'];
  provider: Offer['provider'];
  title: string;
  origin: Place | null;
  destination: Place | null;
  venue: Place | null;
  departsAt: string;
  arrivesAt: string | null;
  durationMinutes: number | null;
  price: Money;
  fees: Money;
  seatsAvailable: number;
  hasReservedSeating: boolean;
  zones: Zone[];
  details: Record<string, unknown>;
}

export function toOffer(raw: RawOffer): Offer {
  return {
    offerId: raw.offerId,
    occurrenceId: raw.occurrenceId,
    mode: raw.mode,
    title: raw.title,
    code: null,
    provider: raw.provider,
    origin: raw.origin,
    destination: raw.destination,
    venue: raw.venue,
    departsAt: raw.departsAt,
    arrivesAt: raw.arrivesAt,
    durationMinutes: raw.durationMinutes,
    price: raw.price,
    fees: raw.fees,
    seatsAvailable: raw.seatsAvailable,
    capacity: raw.seatsAvailable,
    hasReservedSeating: raw.hasReservedSeating,
    zones: raw.zones,
    attributes: raw.details,
    status: 'scheduled',
  };
}

interface RawCartItem {
  cartItemId: string;
  legIndex: number;
  offer: RawOffer;
  holdId: string | null;
  seatLabels: string[];
  qty: number;
  lineTotal: Money;
}

export interface RawCart {
  cartId: string;
  items: RawCartItem[];
  subtotal: Money;
  fees: Money;
  total: Money;
  expiresAt: string;
}

export const getCart = (cartId: string, token: string | null) => request<RawCart>(`/carts/${cartId}`, { token });

/** Real backend search (POST /v1/search) — the same endpoint the voice agent's search_offers tool calls. */
export async function searchOffersApi(c: SearchCriteria): Promise<Offer[]> {
  const isEvent = c.mode === 'event';
  const res = await request<{ offers: RawOffer[] }>('/search', {
    method: 'POST',
    body: {
      legs: [{ from: isEvent ? '' : c.from || '', to: isEvent ? c.city || '' : c.to || '', date: c.date }],
      passengers: { adults: c.passengers || 1, children: 0, infants: 0 },
      modes: [c.mode],
    },
  });
  return res.offers.map(toOffer);
}

/** Cities that have scheduled trips/events for a mode — fills the search form's pickers. */
export const fetchCities = (mode: Offer['mode']) =>
  request<{ cities: string[] }>(`/places?mode=${encodeURIComponent(mode)}`).then((r) => r.cities);

/** Upcoming offers for the home page highlights, straight from the database. */
export const fetchFeatured = () => request<{ offers: RawOffer[] }>('/featured').then((r) => r.offers.map(toOffer));

/** Ask the backend to confirm a gateway payment (it re-checks with eSewa/Khalti before issuing tickets). */
export const verifyPayment = (params: { provider: 'esewa' | 'khalti'; data?: string; pidx?: string; failed?: boolean; ref?: string }) =>
  request<CreateBookingResponse>('/payments/verify', { method: 'POST', body: params });

export interface Tracking {
  occurrenceId: string;
  mode: Offer['mode'];
  title: string;
  departsAt: string;
  arrivesAt: string | null;
  origin: { name: string; city: string; lat: number; lng: number };
  destination: { name: string; city: string; lat: number; lng: number };
  position: { lat: number; lng: number; speedKmh: number | null; heading: number | null; updatedAt: string; source: 'gps' | 'simulated' };
  progress: number;
  status: 'not_started' | 'en_route' | 'arrived';
  etaMinutes: number | null;
  totalKm: number;
  /** Polyline [lat, lng][] — follows the road for buses, a straight line otherwise. */
  route: [number, number][];
  routeSource: 'road' | 'straight';
}

export const getTracking = (occurrenceId: string) => request<Tracking>(`/occurrences/${encodeURIComponent(occurrenceId)}/tracking`);
