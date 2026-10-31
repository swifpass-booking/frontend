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

/** POST a 16 kHz mono WAV to the SeamlessM4T STT endpoint; returns the transcript. */
export async function transcribeAudio(wav: Blob, lang = 'en'): Promise<string> {
  const res = await agentPost(`/stt?lang=${encodeURIComponent(lang)}`, 'audio/wav', wav, 'Could not transcribe audio.');
  const json = await res.json().catch(() => ({}));
  return (json.text as string) || '';
}

/** Synthesize `text` with SeamlessM4T TTS; returns a WAV blob. */
export async function synthesizeSpeech(text: string, lang = 'en'): Promise<Blob> {
  const res = await agentPost('/tts', 'application/json', JSON.stringify({ text, lang }), 'Could not synthesize speech.');
  return res.blob();
}
