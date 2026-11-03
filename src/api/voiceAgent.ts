/**
 * Client for the voice concierge bridge in models/agent-project/server.py
 * (FastAPI in front of the LangGraph team in agents.py). This is a
 * different service from the Django backend — see vite.config.ts, which
 * proxies /agent to it separately from /v1.
 */
import type { VoiceTurnRequest, VoiceTurnResponse } from '../types/agent';

/** POST to the agent service; throws the server's `detail` (or `fallback`) on a non-2xx reply. */
async function agentPost(path: string, contentType: string, body: BodyInit, fallback: string): Promise<Response> {
  const res = await fetch(`/agent${path}`, { method: 'POST', headers: { 'Content-Type': contentType }, body });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.detail || fallback);
  }
  return res;
}

export async function postVoiceTurn(payload: VoiceTurnRequest): Promise<VoiceTurnResponse> {
  const res = await agentPost('/turns', 'application/json', JSON.stringify(payload), 'Could not reach the voice concierge.');
  return (await res.json().catch(() => ({}))) as VoiceTurnResponse;
}
