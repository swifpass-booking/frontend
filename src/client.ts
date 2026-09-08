/**
 * Swiftpass API client.
 *
 * One typed entry point for the React operator console and any Node consumer
 * (tests, the agent service, seed scripts). Imports the contract from
 * ../types.ts so the client cannot drift from the schema.
 *
 *   const api = createClient({ baseUrl: '/v1', getToken: () => session.token });
 *   const { offers } = await api.search({ legs, passengers: { adults: 2 } });
 */

import type {
  SearchRequest, SearchResponse, SeatMapResponse,
  CreateHoldRequest, Hold, Cart, CartItem,
  CheckoutRequest, Booking, TicketCredential,
  ScanManifest, RedemptionSyncRequest, RedemptionSyncResponse,
  AgentSessionRequest, AgentPlan, AgentConfirmRequest,
  StaySearchRequest, CreateStayHoldRequest,
  Itinerary, GateReadiness, OccurrenceDashboard, PostEventReport,
  CreateOccurrenceRequest, OrganisationRegistration, GateLease,
  WalletBundle, ApiError,
  OccurrenceId, BookingId, TicketId, CartId, OrganisationId,
} from "./types";

export interface ClientConfig {
  baseUrl: string;
  /** Called per request so a refreshed token is always picked up. */
  getToken?: () => string | null;
  /** Injected in tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Default 15s. Checkout uses 30s. */
  timeoutMs?: number;
}

/** Thrown for every non-2xx. Carries the server's error envelope. */
export class SwiftpassError extends Error {
  readonly code: ApiError["error"]["code"] | string;
  readonly status: number;
  readonly requestId: string;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;
  /** Localised message when the server supplied one. */
  readonly messageNe?: string;

  constructor(status: number, body: Partial<ApiError>) {
    const e = body?.error;
    super(e?.message ?? `Request failed with ${status}`);
    this.name = "SwiftpassError";
    this.status = status;
    this.code = e?.code ?? "unknown";
    this.requestId = e?.requestId ?? "";
    this.retryable = e?.retryable ?? false;
    this.details = e?.details;
    this.messageNe = e?.messageNe;
  }
}

const uuid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function createClient(config: ClientConfig) {
  const doFetch = config.fetchImpl ?? fetch;
  const timeoutMs = config.timeoutMs ?? 15_000;

  async function request<T>(
    method: string,
    path: string,
    opts: {
      body?: unknown;
      /** Pass a stable key to make a retry safe. Generated when omitted. */
      idempotencyKey?: string;
      timeoutMs?: number;
      query?: Record<string, string | number | boolean | undefined>;
    } = {}
  ): Promise<T> {
    const url = new URL(config.baseUrl + path, typeof location !== "undefined" ? location.origin : "http://localhost");
    if (opts.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { Accept: "application/json" };
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";

    const token = config.getToken?.();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    // Every mutating call gets a key. Retrying a checkout must never
    // produce a second booking — see idempotency_keys in schema.sql.
    if (method !== "GET") {
      headers["Idempotency-Key"] = opts.idempotencyKey ?? uuid();
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? timeoutMs);

    let res: Response;
    try {
      res = await doFetch(url.toString(), {
        method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: ctrl.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if ((err as Error).name === "AbortError") {
        throw new SwiftpassError(408, {
          error: {
            code: "rate_limited",
            message: "The server took too long to respond. Try again.",
            requestId: "",
            retryable: true,
          },
        });
      }
      throw err;
    }
    clearTimeout(timer);

    if (res.status === 204) return undefined as T;

    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) throw new SwiftpassError(res.status, json);
    return json as T;
  }

  return {
    // ── search ────────────────────────────────────────────────────────
    search: (body: SearchRequest) =>
      request<SearchResponse>("POST", "/search", { body }),

    searchStays: (body: StaySearchRequest) =>
      request<SearchResponse>("POST", "/search/stays", { body }),

    seatmap: (occurrenceId: OccurrenceId) =>
      request<SeatMapResponse>("GET", `/occurrences/${occurrenceId}/seatmap`),

    // ── holds ─────────────────────────────────────────────────────────
    createHold: (body: CreateHoldRequest, idempotencyKey?: string) =>
      request<Hold>("POST", "/holds", { body, idempotencyKey }),

    releaseHold: (holdId: string) =>
      request<void>("DELETE", `/holds/${holdId}`),

    createStayHold: (body: CreateStayHoldRequest, idempotencyKey?: string) =>
      request<{ stayHoldId: string; reservationId: string; expiresAt: string }>(
        "POST", "/stays/holds", { body, idempotencyKey }
      ),

    // ── cart & checkout ───────────────────────────────────────────────
    getCart: (cartId: CartId) => request<Cart>("GET", `/carts/${cartId}`),

    addCartItem: (cartId: CartId, body: Partial<CartItem> & { offerId: string; legIndex: number }) =>
      request<Cart>("POST", `/carts/${cartId}/items`, { body }),

    removeCartItem: (cartId: CartId, cartItemId: string) =>
      request<Cart>("DELETE", `/carts/${cartId}/items/${cartItemId}`),

    /**
     * Pass a STABLE idempotencyKey held in component state, not a fresh one.
     * A double-tap on Pay with the same key returns the original booking.
     */
    checkout: (body: CheckoutRequest, idempotencyKey: string) =>
      request<Booking & { payment: { redirectUrl: string } }>(
        "POST", "/bookings", { body, idempotencyKey, timeoutMs: 30_000 }
      ),

    getBooking: (bookingId: BookingId) =>
      request<Booking>("GET", `/bookings/${bookingId}`),

    getItinerary: (bookingId: BookingId) =>
      request<Itinerary>("GET", `/bookings/${bookingId}/itinerary`),

    // ── tickets & wallet ──────────────────────────────────────────────
    getCredential: (ticketId: TicketId, deviceId: string) =>
      request<TicketCredential>("GET", `/tickets/${ticketId}/credential`, {
        query: { deviceId },
      }),

    downloadWallet: (bookingId: BookingId, deviceId: string) =>
      request<WalletBundle>("POST", "/wallet/bundles", { body: { bookingId, deviceId } }),

    // ── gate operations ───────────────────────────────────────────────
    openScanSession: (occurrenceId: OccurrenceId, scanDeviceId: string) =>
      request<ScanManifest>("POST", "/scan/sessions", { body: { occurrenceId, scanDeviceId } }),

    syncRedemptions: (body: RedemptionSyncRequest) =>
      request<RedemptionSyncResponse>("POST", "/scan/redemptions:sync", { body }),

    claimGateLease: (gateServerId: string, occurrenceId: OccurrenceId, durationMinutes: number) =>
      request<GateLease>("POST", "/gate-leases", {
        body: { gateServerId, occurrenceId, durationMinutes },
      }),

    returnGateLease: (leaseId: string) =>
      request<{ status: string; redemptionsReplayed: number }>(
        "POST", `/gate-leases/${leaseId}/return`
      ),

    // ── organiser console ─────────────────────────────────────────────
    registerOrganisation: (body: OrganisationRegistration) =>
      request<{ organisationId: OrganisationId; status: string }>("POST", "/organisations", { body }),

    createOccurrence: (orgId: OrganisationId, body: CreateOccurrenceRequest) =>
      request<{ occurrenceId: OccurrenceId; publishUrl: string }>(
        "POST", `/organisations/${orgId}/occurrences`, { body }
      ),

    gateReadiness: (occurrenceId: OccurrenceId) =>
      request<GateReadiness>("GET", `/occurrences/${occurrenceId}/gate-readiness`),

    dashboard: (occurrenceId: OccurrenceId) =>
      request<OccurrenceDashboard>("GET", `/occurrences/${occurrenceId}/dashboard`),

    report: (occurrenceId: OccurrenceId) =>
      request<PostEventReport>("GET", `/occurrences/${occurrenceId}/report`),

    // ── agent ─────────────────────────────────────────────────────────
    startAgentSession: (body: AgentSessionRequest) =>
      request<{ sessionId: string }>("POST", "/agent/sessions", { body }),

    /**
     * The confirmation gate. acknowledgedTotal must equal the presented
     * total or the server refuses — the user never pays an unseen number.
     */
    confirmPlan: (planId: string, body: AgentConfirmRequest) =>
      request<Booking>("POST", `/agent/plans/${planId}/confirm`, { body }),

    getPlan: (planId: string) => request<AgentPlan>("GET", `/agent/plans/${planId}`),
  };
}

export type SwiftpassClient = ReturnType<typeof createClient>;

/**
 * Live scan feed for the operator board. Falls back to polling the
 * dashboard when the socket cannot connect — a venue on a hotspot will
 * lose the socket long before it loses HTTP.
 */
export function subscribeScanFeed(
  occurrenceId: OccurrenceId,
  handlers: {
    onScan: (e: unknown) => void;
    onStats?: (s: OccurrenceDashboard) => void;
    onTransport?: (mode: "socket" | "polling") => void;
  },
  config: ClientConfig
): () => void {
  let socket: WebSocket | null = null;
  let poll: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const startPolling = () => {
    if (closed || poll) return;
    handlers.onTransport?.("polling");
    const api = createClient(config);
    poll = setInterval(async () => {
      try {
        const stats = await api.dashboard(occurrenceId);
        handlers.onStats?.(stats);
      } catch {
        /* keep polling; the gate may be intermittently offline */
      }
    }, 5_000);
  };

  try {
    const wsUrl = config.baseUrl.replace(/^http/, "ws");
    socket = new WebSocket(`${wsUrl}/occurrences/${occurrenceId}/scan-feed`);
    socket.onopen = () => handlers.onTransport?.("socket");
    socket.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === "scan") handlers.onScan(msg.data);
      if (msg.type === "stats") handlers.onStats?.(msg.data);
    };
    socket.onerror = startPolling;
    socket.onclose = () => { if (!closed) startPolling(); };
  } catch {
    startPolling();
  }

  return () => {
    closed = true;
    socket?.close();
    if (poll) clearInterval(poll);
  };
}
