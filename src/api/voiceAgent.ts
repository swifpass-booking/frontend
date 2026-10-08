/**
 * Client for the voice concierge bridge in models/agent-project/server.py
 * (FastAPI in front of the LangGraph team in agents.py). This is a
 * different service from the Django backend — see vite.config.ts, which
 * proxies /agent to it separately from /v1.
 */
import type { VoiceTurnRequest, VoiceTurnResponse } from '../types/agent';

export async function postVoiceTurn(payload: VoiceTurnRequest): Promise<VoiceTurnResponse> {
  const res = await fetch('/agent/turns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.detail || 'Could not reach the voice concierge.');
  }
  return json as VoiceTurnResponse;
}
