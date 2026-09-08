/**
 * Swiftpass — shared type contract.
 *
 * Publish this as an internal package (`@swiftpass/contract`) and import it
 * from BOTH the Node.js/TypeScript backend and the React operator console.
 * For the Flutter apps, generate Dart classes from the same JSON Schema so
 * the three clients cannot drift apart.
 *
 * Conventions:
 *  - All money is an integer in the MINOR unit (paisa). Never a float.
 *  - All timestamps are RFC 3339 strings in UTC ("2026-09-14T01:15:00Z").
 *  - All ids are prefixed ULIDs, so a log line tells you the type for free.
 */

// ─────────────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────────────
export type Minor = number;          // paisa. 1 NPR = 100.
export type Iso8601 = string;
export type Currency = 'NPR' | 'USD' | 'INR';
export type TravelMode = 'air' | 'bus' | 'rail' | 'event';

export type UserId = `usr_${string}`;
export type OccurrenceId = `occ_${string}`;
export type HoldId = `hld_${string}`;
export type CartId = `crt_${string}`;
export type BookingId = `bkg_${string}`;
export type TicketId = `tkt_${string}`;
export type AgentSessionId = `ags_${string}`;

export interface Money {
  amount: Minor;
  currency: Currency;
}

export interface Place {
  id: string;
  kind: 'airport' | 'bus_park' | 'station' | 'venue';
  code: string | null;
  name: string;
  nameNe: string | null;
  city: string;
  country: string;
  timezone: string;
}

// ─────────────────────────────────────────────────────────────────────
// Search — ONE offer shape across all four modes.
// `mode` discriminates `details`, so the frontend can switch exhaustively
// and TypeScript will error when a fifth mode is added.
// ─────────────────────────────────────────────────────────────────────
export interface SearchRequest {
  legs: SearchLeg[];
  passengers: { adults: number; children: number; infants: number };
  modes?: TravelMode[];            // omit = search everything
  maxPrice?: Minor;
  currency?: Currency;
  sort?: 'price_asc' | 'duration_asc' | 'departure_asc' | 'recommended';
  cursor?: string;
}

export interface SearchLeg {
  /** For transport: place id or city. For events: city or venue id. */
  from?: string;
  to?: string;
  /** Local date, YYYY-MM-DD. */
  date: string;
  timeWindow?: { earliest?: string; latest?: string };
}

export interface AirDetails {
  flightNumber: string;
  aircraft: string | null;
  cabin: 'economy' | 'premium' | 'business';
  baggageKg: number;
  stops: number;
}

export interface BusDetails {
  coachType: 'deluxe' | 'super_deluxe' | 'sleeper' | 'micro';
  boardingPoint: string;
  droppingPoint: string;
  amenities: string[];
  hasAc: boolean;
}

export interface RailDetails {
  trainNumber: string;
  coachClass: string;
  platform: string | null;
}

export interface EventDetails {
  category: 'cinema' | 'concert' | 'sport' | 'conference' | 'community';
  ageRating: string | null;
  language: string | null;
  doorsOpenAt: Iso8601 | null;
}

export type Offer =
  | (OfferBase & { mode: 'air';   details: AirDetails })
  | (OfferBase & { mode: 'bus';   details: BusDetails })
  | (OfferBase & { mode: 'rail';  details: RailDetails })
  | (OfferBase & { mode: 'event'; details: EventDetails });

export interface OfferBase {
  offerId: string;                 // short-lived, quote-scoped
  occurrenceId: OccurrenceId;
  provider: { id: string; displayName: string; isSelfServe: boolean };
  title: string;
  origin: Place | null;            // null for events
  destination: Place | null;       // null for events
  venue: Place | null;             // events only
  departsAt: Iso8601;
  arrivesAt: Iso8601 | null;
  durationMinutes: number | null;
  price: Money;
  fees: Money;
  seatsAvailable: number;
  hasReservedSeating: boolean;
  zones: Zone[];
  /** Why the ranker put this here. Disclosed, never paid placement. */
  rankingReason: string[];
  quoteExpiresAt: Iso8601;
}

export interface Zone {
  id: string;
  code: string;
  label: string;
  price: Money;
  seatsAvailable: number;
  isReservedSeating: boolean;
}

export interface SearchResponse {
  requestId: string;
  offers: Offer[];
  /** Pre-combined multi-leg journeys, e.g. flight + connecting bus. */
  bundles: JourneyBundle[];
  nextCursor: string | null;
  partialFailures: { providerId: string; reason: string }[];
}

export interface JourneyBundle {
  bundleId: string;
  offerIds: string[];
  total: Money;
  totalDurationMinutes: number;
  connectionRiskMinutes: number[];   // buffer between consecutive legs
}

// ─────────────────────────────────────────────────────────────────────
// Seat map
// ─────────────────────────────────────────────────────────────────────
export type SeatState = 'available' | 'held' | 'sold' | 'blocked';

export interface SeatMapResponse {
  occurrenceId: OccurrenceId;
  isReservedSeating: boolean;
  layout: { rows: number; columns: string[]; aisleAfter: string[] };
  seats: {
    label: string;
    zoneId: string;
    state: SeatState;
    price: Money;
    attributes: string[];          // 'window','legroom','wheelchair'
  }[];
  /** Advisory only — the hold call is still the source of truth. */
  snapshotAt: Iso8601;
}

// ─────────────────────────────────────────────────────────────────────
// Hold → cart → checkout
// ─────────────────────────────────────────────────────────────────────
export interface CreateHoldRequest {
  occurrenceId: OccurrenceId;
  zoneId: string;
  seatLabels: string[];            // empty array = general admission
  qty?: number;                    // GA only
  ttlSeconds?: number;             // capped server-side at 600
}

export interface Hold {
  holdId: HoldId;
  occurrenceId: OccurrenceId;
  seatLabels: string[];
  expiresAt: Iso8601;
  /** Seconds remaining — render a countdown from this, not from clock diff. */
  expiresInSeconds: number;
}

export interface Cart {
  cartId: CartId;
  items: CartItem[];
  subtotal: Money;
  fees: Money;
  total: Money;
  expiresAt: Iso8601;
}

export interface CartItem {
  cartItemId: string;
  legIndex: number;
  offer: Offer;
  holdId: HoldId | null;
  seatLabels: string[];
  qty: number;
  lineTotal: Money;
}

export interface Passenger {
  fullName: string;
  dateOfBirth?: string;
  documentType?: 'citizenship' | 'passport' | 'none';
  documentNumber?: string;         // hashed server-side, never persisted raw
  isLead: boolean;
}

export interface CheckoutRequest {
  cartId: CartId;
  passengers: Passenger[];
  contact: { phoneE164: string; email?: string };
  payment: { method: 'esewa' | 'khalti' | 'fonepay' | 'card'; returnUrl: string };
  /** REQUIRED header too: `Idempotency-Key`. Same key = same result. */
  acceptedTermsVersion: string;
}

export type BookingStatus =
  | 'draft' | 'awaiting_payment' | 'confirmed'
  | 'partially_failed' | 'cancelled' | 'refunded';

export interface Booking {
  bookingId: BookingId;
  reference: string;               // 'SWP-8K2QJ4'
  status: BookingStatus;
  total: Money;
  items: BookingItem[];
  passengers: (Passenger & { passengerId: string })[];
  tickets: TicketSummary[];
  createdVia: 'app' | 'web' | 'agent' | 'counter';
  confirmedAt: Iso8601 | null;
}

export interface BookingItem {
  bookingItemId: string;
  legIndex: number;
  occurrenceId: OccurrenceId;
  status: 'held' | 'confirmed' | 'cancelled' | 'failed';
  providerRef: string | null;
  subtotal: Money;
  failureReason: string | null;
}

// ─────────────────────────────────────────────────────────────────────
// Tickets & validation
// ─────────────────────────────────────────────────────────────────────
export interface TicketSummary {
  ticketId: TicketId;
  bookingItemId: string;
  passengerName: string;
  seatLabel: string | null;
  status: 'issued' | 'redeemed' | 'void' | 'expired';
  validFrom: Iso8601;
  validUntil: Iso8601;
  fallbackCode: string;            // for users without a working camera/data
}

/**
 * What the traveller app stores per ticket. `credential` is signed by the
 * server; `rotationSecret` never leaves the device's secure storage.
 */
export interface TicketCredential {
  ticketId: TicketId;
  credential: string;              // "SWP1.<hdr>.<body>.<sig>"
  kid: string;
  rotationIntervalSeconds: number; // 30
  /** Only returned once, at issuance. Store in Keychain / Keystore. */
  rotationSecret?: string;
}

export type RejectReason =
  | 'bad_signature'
  | 'unknown_key'
  | 'expired_window'
  | 'wrong_occurrence'
  | 'already_redeemed'
  | 'device_proof_invalid'
  | 'revoked'
  | 'not_yet_valid'
  | 'clock_skew_exceeded';

export interface ScanResult {
  accepted: boolean;
  reason: RejectReason | null;
  ticketId: TicketId | null;
  passengerName: string | null;
  seatLabel: string | null;
  zoneLabel: string | null;
  /** true when decided from the cached manifest with no network. */
  decidedOffline: boolean;
  decidedAt: Iso8601;
}

/** Downloaded once before the gate opens; ~40 bytes per ticket. */
export interface ScanManifest {
  scanSessionId: string;
  occurrenceId: OccurrenceId;
  issuedAt: Iso8601;
  expiresAt: Iso8601;
  signingKeys: { kid: string; publicKey: string; notAfter: Iso8601 }[];
  /** Tickets valid for this occurrence. */
  entries: {
    tid: TicketId;
    dpk: string;                   // bound device public key
    seat: string | null;
    zone: string;
    name: string;                  // shown to the gate agent
    st: 'issued' | 'void';
  }[];
  revoked: TicketId[];
  manifestHash: string;
  manifestSignature: string;
}

/** Uploaded when the scanner regains connectivity. */
export interface RedemptionSyncRequest {
  scanSessionId: string;
  redemptions: {
    ticketId: TicketId;
    accepted: boolean;
    rejectReason: RejectReason | null;
    rotationCounter: number;
    scannedAt: Iso8601;
    deviceSignature: string;       // scanner signs each record — tamper evidence
  }[];
}

export interface RedemptionSyncResponse {
  accepted: number;
  duplicates: { ticketId: TicketId; conflictingDeviceIds: string[] }[];
  rejected: { ticketId: TicketId; reason: string }[];
}

// ─────────────────────────────────────────────────────────────────────
// Agentic layer
// ─────────────────────────────────────────────────────────────────────
export interface AgentSessionRequest {
  goal: string;                    // "Kathmandu to Pokhara Friday, back Sunday, under 8000"
  spendCeiling: Money;             // hard bound; server refuses to exceed
  useStoredPreferences: boolean;
}

export interface AgentEvent {
  seq: number;
  type: 'thought' | 'tool_call' | 'tool_result' | 'plan' | 'error';
  /** Reasoning traces are surfaced, not hidden — the proposal requires it. */
  content: unknown;
  at: Iso8601;
}

export interface AgentPlan {
  planId: string;
  sessionId: AgentSessionId;
  legs: { legIndex: number; offer: Offer; seatLabels: string[]; price: Money }[];
  total: Money;
  withinCeiling: boolean;
  assumptions: string[];           // what the agent guessed and you should check
  /** Nothing is charged until this is POSTed back with `confirmed: true`. */
  requiresConfirmation: true;
  expiresAt: Iso8601;
}

export interface AgentConfirmRequest {
  planId: string;
  confirmed: boolean;
  /** Must equal AgentPlan.total.amount, or the server rejects. */
  acknowledgedTotal: Minor;
}

/** The only tools the model may call. Each maps 1:1 to a public endpoint. */
export const AGENT_TOOL_ALLOWLIST = [
  'search_offers',       // GET  — safe
  'get_seatmap',         // GET  — safe
  'get_user_preferences',// GET  — safe
  'create_hold',         // POST — mutating, reversible, no confirmation
  'add_to_cart',         // POST — mutating, reversible, no confirmation
  'price_cart',          // GET  — safe
  'present_plan',        // POST — terminates the run, hands control to the user
] as const;
export type AgentTool = typeof AGENT_TOOL_ALLOWLIST[number];
/** Note what is ABSENT: `checkout` and `pay`. The agent cannot spend. */

// ─────────────────────────────────────────────────────────────────────
// Errors — one shape for every non-2xx response
// ─────────────────────────────────────────────────────────────────────
export interface ApiError {
  error: {
    code:
      | 'seat_unavailable' | 'hold_expired' | 'quote_expired'
      | 'payment_failed' | 'provider_unavailable' | 'validation_failed'
      | 'idempotency_conflict' | 'spend_ceiling_exceeded'
      | 'confirmation_required' | 'rate_limited' | 'unauthorised';
    message: string;
    messageNe?: string;
    details?: Record<string, unknown>;
    requestId: string;
    retryable: boolean;
  };
}
