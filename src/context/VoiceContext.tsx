/**
 * Hands-free voice conversation with the booking agent, ChatGPT-voice style:
 *   one open websocket (lib/voiceStream.ts); the mic never closes between turns, and talking
 *   over the reply cuts it off and starts a new turn.
 * The mic button lives in the search card; VoiceMode.tsx renders this state.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { getCart, heldSeats, holdInCart, toOffer } from '../api/rest';
import { postVoiceTurn } from '../api/voiceAgent';
import { openVoiceStream, type VoiceStream } from '../lib/voiceStream';
import { isVenueMode } from '../lib/offers';
import type { VoiceSearch } from '../types/agent';
import type { Offer, SearchCriteria, SeatPick, TravelMode } from '../types/domain';

export type VoicePhase = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking';

interface LogEntry {
  role: 'user' | 'assistant';
  text: string;
  /** True for replies that arrived this page load — they get the typing animation. */
  live?: boolean;
  /** The search the agent ran for this reply: the chat shows its results as cards. */
  search?: SearchCriteria;
}

const STORE_KEY = 'swiftpass-voice-chat-v1';

function loadChat(): { log: LogEntry[]; sessionId: string | null } {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (raw && Array.isArray(raw.log)) return { log: raw.log.map((e: LogEntry) => ({ ...e, live: false })), sessionId: raw.sessionId ?? null };
  } catch {
    /* storage unavailable or corrupt — start fresh */
  }
  return { log: [], sessionId: null };
}

/** Map the agent's search onto the form. The backend matches cities case-insensitively. */
function toCriteria(s: VoiceSearch): SearchCriteria {
  const mode: TravelMode = s.mode ?? 'bus';
  const match = (v: string | null) => (v ? v.trim().replace(/\b\w/g, (c) => c.toUpperCase()) : '');
  return {
    mode,
    from: isVenueMode(mode) ? '' : match(s.from),
    to: isVenueMode(mode) ? '' : match(s.to),
    city: isVenueMode(mode) ? match(s.to || s.from) : '',
    date: s.date || new Date().toISOString().slice(0, 10),
    passengers: s.passengers || 1,
  };
}

interface VoiceValue {
  open: boolean;
  active: boolean;
  phase: VoicePhase;
  /** Live mic loudness 0..1, read by animations (a ref so it doesn't re-render per frame). */
  levelRef: MutableRefObject<number>;
  log: LogEntry[];
  cartId: string | null;
  trackId: string | null;
  closeTrack: () => void;
  error: string | null;
  supported: boolean;
  start: () => void;
  stop: () => void;
  close: () => void;
  send: (text: string) => void;
  /** Hold the picked seats from a result card and show the cart in the chat. Throws if not signed in. */
  holdOffer: (offer: Offer, qty: number, seats: SeatPick[]) => Promise<void>;
  reviewInCheckout: () => void;
  dismissCart: () => void;
  startOver: () => void;
}

const VoiceContext = createContext<VoiceValue | null>(null);

const REVIEW_WORDS = /\b(confirm|yes|go ahead|checkout|check out|review|pay|book it)\b/i;
const DISMISS_WORDS = /\b(cancel|no thanks|never mind|not now)\b/i;

let speakToken = 0; // bumped whenever browser speech is stopped or restarted

let speakingAudio: HTMLAudioElement | null = null;

function stopSpeaking() {
  speakToken++;
  speakingAudio?.pause();
  speakingAudio = null;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

/** Fallback voice, used when the server has no TTS (or for typed messages while the mic is muted). */
function browserSpeak(text: string): Promise<void> {
  return new Promise<void>((resolve) => {
    if (!('speechSynthesis' in window)) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

/** The server's TTS voice (Orpheus) when it has one; otherwise the browser voice. */
async function serverSpeak(text: string, token: number): Promise<void> {
  try {
    const res = await fetch('/agent/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, lang: 'en' }) });
    if (!res.ok) throw new Error('no server tts');
    const url = URL.createObjectURL(await res.blob());
    if (token !== speakToken) return URL.revokeObjectURL(url); // the user talked over it while it rendered
    const audio = new Audio(url);
    speakingAudio = audio;
    await new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.onpause = () => resolve();
      void audio.play().catch(() => resolve());
    });
    URL.revokeObjectURL(url);
  } catch {
    if (token === speakToken) await browserSpeak(text);
  }
}

interface ProviderProps {
  token: string | null;
  onReviewOffer: (offer: Offer, passengers: number, seats?: SeatPick[], zoneId?: string) => void;
  children: ReactNode;
}

export function VoiceProvider({ token, onReviewOffer, children }: ProviderProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [log, setLog] = useState<LogEntry[]>(() => loadChat().log);
  const [cartId, setCartId] = useState<string | null>(null);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const levelRef = useRef(0);
  const streamRef = useRef<VoiceStream | null>(null);
  const sessionRef = useRef<string | null>(loadChat().sessionId);
  const activeRef = useRef(false);
  const cartRef = useRef<string | null>(null);
  const lastReplyRef = useRef('');
  const reviewRef = useRef(onReviewOffer);
  reviewRef.current = onReviewOffer;
  const tokenRef = useRef(token);
  tokenRef.current = token;
  cartRef.current = cartId;

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ log: log.slice(-60), sessionId: sessionRef.current }));
    } catch {
      /* ignore */
    }
  }, [log]);

  const supported =
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof AudioWorkletNode !== 'undefined' && typeof WebSocket !== 'undefined';

  const halt = useCallback(() => {
    activeRef.current = false;
    streamRef.current?.close();
    streamRef.current = null;
    stopSpeaking();
    levelRef.current = 0;
    setActive(false);
    setPhase('idle');
  }, []);

  useEffect(() => halt, [halt]);

  // Signing out, or another traveller signing in: the chat and the agent session belong to the previous one.
  const prevToken = useRef(token);
  useEffect(() => {
    const was = prevToken.current;
    prevToken.current = token;
    if (!was || was === token) return;
    halt();
    sessionRef.current = null;
    setCartId(null);
    setTrackId(null);
    setLog([]);
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {
      /* ignore */
    }
  }, [token, halt]);

  /** Speak a canned line locally and return to listening, unless the user talks over it. */
  function sayLocally(text: string) {
    stopSpeaking();
    const token = speakToken;
    setPhase('speaking');
    void serverSpeak(text, token).then(() => {
      if (token === speakToken) setPhase(activeRef.current ? 'listening' : 'idle');
    });
  }

  /** Shared by spoken and typed input. Returns true if the utterance was handled locally. */
  function handleLocally(text: string): boolean {
    if (cartRef.current && DISMISS_WORDS.test(text)) {
      streamRef.current?.cancel();
      setCartId(null);
      const reply = "Okay, I've put that aside. What would you like to do instead?";
      setLog((l) => [...l, { role: 'assistant', text: reply, live: true }]);
      sayLocally(reply);
      return true;
    }
    if (cartRef.current && REVIEW_WORDS.test(text)) {
      streamRef.current?.cancel();
      void reviewInCheckout();
      return true;
    }
    return false;
  }

  const connect = useCallback(async () => {
    setError(null);
    try {
      const stream = await openVoiceStream(
        { sessionId: sessionRef.current, getToken: () => tokenRef.current },
        {
          onLevel: (l) => (levelRef.current = l),
          onSpeechStart: () => {
            stopSpeaking();
            setPhase('listening');
          },
          onSpeechEnd: () => setPhase('transcribing'),
          onTranscript: (text) => {
            setLog((l) => [...l, { role: 'user', text }]);
            if (!handleLocally(text)) setPhase('thinking');
          },
          onEmpty: () => setPhase('listening'),
          onReply: (r) => {
            sessionRef.current = r.sessionId;
            lastReplyRef.current = r.reply;
            if (r.cartId) setCartId(r.cartId);
            if (r.trackOccurrenceId) setTrackId(r.trackOccurrenceId);
            setLog((l) => [...l, { role: 'assistant', text: r.reply, live: true, search: r.search ? toCriteria(r.search) : undefined }]);
          },
          onPlaybackStart: () => setPhase('speaking'),
          onPlaybackEnd: () => setPhase('listening'),
          onAudioUnavailable: () => sayLocally(lastReplyRef.current),
          onError: (detail) => {
            setError(detail);
            setPhase('listening');
          },
          onClose: () => {
            if (!activeRef.current) return;
            setError('Voice connection lost.');
            halt();
          },
        },
      );
      if (!activeRef.current) return stream.close();
      streamRef.current = stream;
      setPhase('listening');
    } catch (err) {
      setError(
        (err as Error).message === 'busy'
          ? 'Voice is busy right now — try again in a moment, or type instead.'
          : 'Could not start voice — allow the microphone in the browser, or type instead.',
      );
      halt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [halt]);

  async function sendTyped(raw: string) {
    const text = raw.trim();
    if (!text) return;
    setLog((l) => [...l, { role: 'user', text }]);
    if (handleLocally(text)) return;
    setPhase('thinking');
    const stream = streamRef.current;
    if (stream) return stream.sendText(text);
    // Mic muted: no socket, so use the plain HTTP turn and the browser voice.
    let reply: string;
    let search: SearchCriteria | undefined;
    try {
      const r = await postVoiceTurn({ sessionId: sessionRef.current, message: text, token: tokenRef.current });
      sessionRef.current = r.sessionId;
      reply = r.reply;
      if (r.cartId) setCartId(r.cartId);
      if (r.trackOccurrenceId) setTrackId(r.trackOccurrenceId);
      search = r.search ? toCriteria(r.search) : undefined;
    } catch (err) {
      reply = (err as Error).message || 'Something went wrong talking to the assistant.';
      setError(reply);
    }
    setLog((l) => [...l, { role: 'assistant', text: reply, live: true, search }]);
    sayLocally(reply);
  }

  async function reviewInCheckout() {
    const id = cartRef.current;
    if (!id) return;
    halt();
    try {
      const cart = await getCart(id, tokenRef.current);
      const first = cart.items[0];
      if (!first) {
        setError("That trip isn't held anymore — ask me to search again.");
        return;
      }
      // Hand over exactly what was held and quoted: the seats, or the count-based zone.
      const seats = await heldSeats(first);
      reviewRef.current(toOffer(first.offer), first.qty, seats, seats ? undefined : first.zoneId);
      setOpen(false);
    } catch (err) {
      setError((err as Error).message || 'Could not load that trip.');
    }
  }

  const value = useMemo<VoiceValue>(
    () => ({
      open,
      active,
      phase,
      levelRef,
      log,
      cartId,
      trackId,
      closeTrack: () => setTrackId(null),
      error,
      supported,
      start: () => {
        if (!supported) return;
        activeRef.current = true;
        setActive(true);
        stopSpeaking();
        void connect();
      },
      stop: halt,
      close: () => {
        halt();
        setOpen(false);
      },
      send: (text) => {
        stopSpeaking();
        void sendTyped(text);
      },
      holdOffer: async (offer, qty, seats) => {
        if (!tokenRef.current) throw new Error('Sign in to hold seats.');
        setCartId(await holdInCart(offer, qty, seats, tokenRef.current));
      },
      reviewInCheckout: () => void reviewInCheckout(),
      dismissCart: () => setCartId(null),
      startOver: () => {
        halt();
        sessionRef.current = null;
        setLog([]);
        try {
          localStorage.removeItem(STORE_KEY);
        } catch {
          /* ignore */
        }
        setCartId(null);
        setTrackId(null);
        setError(null);
      },
    }),
    // handlers close over refs/stable setters only
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, active, phase, log, cartId, trackId, error, supported, halt, connect],
  );

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice(): VoiceValue {
  const v = useContext(VoiceContext);
  if (!v) throw new Error('useVoice must be used inside <VoiceProvider>');
  return v;
}
