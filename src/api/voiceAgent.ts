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

/** POST a 16 kHz mono WAV to the SeamlessM4T STT endpoint; returns the transcript. */
export async function transcribeAudio(wav: Blob, lang = 'en'): Promise<string> {
  const res = await fetch(`/agent/stt?lang=${encodeURIComponent(lang)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'audio/wav' },
    body: wav,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.detail || 'Could not transcribe audio.');
  return (json.text as string) || '';
}

/** Synthesize `text` with SeamlessM4T TTS; returns a WAV blob. */
export async function synthesizeSpeech(text: string, lang = 'en'): Promise<Blob> {
  const res = await fetch('/agent/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, lang }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.detail || 'Could not synthesize speech.');
  }
  return res.blob();
}
