/**
 * Contract for the voice concierge bridge in models/agent-project/server.py
 * (a FastAPI wrapper around the LangGraph supervisor/worker team in
 * agents.py). That team can never charge the traveller — present_plan only
 * holds seats and prices a cart; turning it into a real booking still goes
 * through the normal manual Checkout page, same as every other booking.
 */
export interface VoiceTurnRequest {
  sessionId: string | null;
  message: string;
  token?: string | null;
  spendCeilingMinor?: number;
}

export interface VoiceTurnResponse {
  sessionId: string;
  reply: string;
  /** Set once the booking agent has held at least one item this conversation. */
  cartId: string | null;
  /** Set when this turn ran a search — fill the search form and open results. */
  search?: VoiceSearch | null;
  /** Set when the agent tracked a vehicle this turn — show it on a live map. */
  trackOccurrenceId?: string | null;
}

/** Search the agent just ran, in the same shape as the frontend's SearchCriteria. */
export interface VoiceSearch {
  mode: 'air' | 'bus' | 'rail' | 'event' | null;
  from: string | null;
  to: string | null;
  date: string | null;
  passengers: number;
}
