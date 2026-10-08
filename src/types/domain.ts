/**
 * Display-layer domain types for the Swiftpass booking console.
 * Shaped to match the seed data in `lib/mock-data.json` via `lib/offers.ts`.
 * For the full backend API contract (search, holds, tickets, gate ops), see `api/contract.ts`.
 */

export type TravelMode = 'air' | 'bus' | 'rail' | 'event';

export type Currency = 'NPR' | 'USD' | 'INR';

export interface Money {
  amount: number; // minor unit (paisa)
  currency: Currency;
}

export type PlaceKind = 'airport' | 'bus_park' | 'station' | 'venue';

export interface Place {
  id: string;
  kind: PlaceKind;
  code: string | null;
  name: string;
  nameNe?: string | null;
  city: string;
  country: string;
  timezone?: string;
}

export interface Zone {
  id: string;
  code: string;
  label: string;
  price: Money;
  seatsAvailable: number;
  isReservedSeating: boolean;
}

export interface Offer {
  offerId: string;
  occurrenceId: string;
  mode: TravelMode;
  title: string;
  code: string | null;
  provider: { id: string; displayName: string; isSelfServe: boolean };
  origin: Place | null;
  destination: Place | null;
  venue: Place | null;
  departsAt: string;
  arrivesAt: string | null;
  durationMinutes: number | null;
  price: Money;
  fees: Money;
  seatsAvailable: number;
  capacity: number;
  hasReservedSeating: boolean;
  zones: Zone[];
  attributes: Record<string, unknown>;
  status: string;
}

export interface SearchCriteria {
  mode: TravelMode;
  from?: string;
  to?: string;
  city?: string;
  date: string;
  passengers: number;
}

export type PaymentMethod = 'esewa' | 'khalti' | 'fonepay' | 'card';

export interface Ticket {
  ticketId: string;
  passengerName: string;
  code: string;
}

export interface BookingDraft {
  offer: Offer;
  passengers: number;
  names: string[];
  phone: string;
  email: string;
  payment: PaymentMethod;
  total: Money;
  reference?: string;
  tickets?: Ticket[];
}

export type Page = 'home' | 'results' | 'checkout' | 'confirmation' | 'ops' | 'admin';
