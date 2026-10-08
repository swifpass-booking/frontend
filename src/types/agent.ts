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
}
