/**
 * Hands-free voice conversation with the booking agent, ChatGPT-voice style:
 *   listen -> (silence) -> transcribe -> agent thinks -> speak reply -> listen again
 * The mic button lives in the search card; VoiceMode.tsx renders this state.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { getCart, toOffer } from '../api/rest';
import { postVoiceTurn, synthesizeSpeech, transcribeAudio } from '../api/voiceAgent';
import { startRecording, type Recorder } from '../lib/recorder';
import type { VoiceSearch } from '../types/agent';
import type { Offer, SearchCriteria, TravelMode } from '../types/domain';

export type VoicePhase = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking';

export interface LogEntry {
  role: 'user' | 'assistant';
  text: string;
  /** True for replies that arrived this page load — they get the typing animation. */
  live?: boolean;
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
    from: mode === 'event' ? '' : match(s.from),
    to: mode === 'event' ? '' : match(s.to),
    city: mode === 'event' ? match(s.to || s.from) : '',
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
  reviewInCheckout: () => void;
  dismissCart: () => void;
  startOver: () => void;
}

const VoiceContext = createContext<VoiceValue | null>(null);

const REVIEW_WORDS = /\b(confirm|yes|go ahead|checkout|check out|review|pay|book it)\b/i;
const DISMISS_WORDS = /\b(cancel|no thanks|never mind|not now)\b/i;
const MAX_EMPTY_LISTENS = 2; // give up hands-free mode after this many silent rounds

let currentAudio: HTMLAudioElement | null = null;
let speakToken = 0; // bumped whenever speech is stopped or restarted

function stopSpeaking() {
  speakToken++;
  currentAudio?.pause();
  currentAudio = null;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

function playBlob(blob: Blob): Promise<void> {
  return new Promise<void>((resolve) => {
    const audio = new Audio(URL.createObjectURL(blob));
    const done = () => {
      URL.revokeObjectURL(audio.src);
      resolve();
    };
    audio.onended = done;
    audio.onerror = done;
    currentAudio = audio;
    audio.play().catch(done);
  });
}

function browserSpeak(text: string): Promise<void> {
  return new Promise<void>((resolve) => {
    if (!('speechSynthesis' in window)) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

/**
 * Speaks the reply sentence by sentence: the first sentence starts playing as soon as it is
 * synthesized, while the rest are fetched in the background. Resolves when playback ends.
 * Falls back to the browser voice if the TTS server fails.
 */
async function speak(text: string): Promise<void> {
  stopSpeaking();
  const token = speakToken;
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g)?.map((x) => x.trim()).filter(Boolean) ?? [text];
  const pending = sentences.map((x) => synthesizeSpeech(x));
  pending.forEach((p) => p.catch(() => undefined)); // handled below; avoid unhandled-rejection noise
  for (let i = 0; i < pending.length; i++) {
    if (token !== speakToken) return;
    try {
      await playBlob(await pending[i]);
    } catch {
      await browserSpeak(sentences.slice(i).join(' '));
      return;
    }
  }
}

interface ProviderProps {
  token: string | null;
  onReviewOffer: (offer: Offer, passengers: number) => void;
  onSearch: (criteria: SearchCriteria) => void;
  children: ReactNode;
}

export function VoiceProvider({ token, onReviewOffer, onSearch, children }: ProviderProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [log, setLog] = useState<LogEntry[]>(() => loadChat().log);
  const [cartId, setCartId] = useState<string | null>(null);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const levelRef = useRef(0);
  const recorderRef = useRef<Recorder | null>(null);
  const sessionRef = useRef<string | null>(loadChat().sessionId);
  const runRef = useRef(0); // bumped on stop/restart so stale async work is dropped
  const activeRef = useRef(false);
  const emptyRef = useRef(0);
  const cartRef = useRef<string | null>(null);
  const reviewRef = useRef(onReviewOffer);
  reviewRef.current = onReviewOffer;
  const searchRef = useRef(onSearch);
  searchRef.current = onSearch;
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

  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

  const halt = useCallback(() => {
    runRef.current++;
    activeRef.current = false;
    recorderRef.current?.cancel();
    recorderRef.current = null;
    stopSpeaking();
    levelRef.current = 0;
    setActive(false);
    setPhase('idle');
  }, []);

  useEffect(() => halt, [halt]);

  const listen = useCallback(async () => {
    const run = ++runRef.current;
    setError(null);
    try {
      const recorder = await startRecording({
        onLevel: (l) => (levelRef.current = l),
        onSilence: () => void finishListening(run),
        onNoSpeech: () => {
          if (run !== runRef.current) return;
          recorderRef.current?.cancel();
          recorderRef.current = null;
          halt();
        },
      });
      if (run !== runRef.current) return recorder.cancel();
      recorderRef.current = recorder;
      setPhase('listening');
    } catch {
      setError('Microphone access was blocked — allow it in the browser, or type instead.');
      halt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [halt]);

  async function finishListening(run: number) {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (!recorder || run !== runRef.current) return;
    setPhase('transcribing');
    try {
      const text = await transcribeAudio(await recorder.stop());
      if (run !== runRef.current) return;
      if (text) {
        emptyRef.current = 0;
        void handleUtterance(text, run);
      } else if (++emptyRef.current > MAX_EMPTY_LISTENS) {
        halt();
      } else {
        void listen();
      }
    } catch (err) {
      if (run !== runRef.current) return;
      setError((err as Error).message || 'Could not transcribe audio.');
      halt();
    }
  }

  async function handleUtterance(raw: string, run = ++runRef.current) {
    const text = raw.trim();
    if (!text) return;
    setLog((l) => [...l, { role: 'user', text }]);

    let reply: string;
    if (cartRef.current && DISMISS_WORDS.test(text)) {
      setCartId(null);
      reply = "Okay, I've put that aside. What would you like to do instead?";
      setLog((l) => [...l, { role: 'assistant', text: reply, live: true }]);
    } else if (cartRef.current && REVIEW_WORDS.test(text)) {
      void reviewInCheckout();
      return;
    } else {
      setPhase('thinking');
      try {
        const result = await postVoiceTurn({ sessionId: sessionRef.current, message: text, token: tokenRef.current });
        if (run !== runRef.current) return;
        sessionRef.current = result.sessionId;
        reply = result.reply;
        if (result.cartId) setCartId(result.cartId);
        if (result.trackOccurrenceId) setTrackId(result.trackOccurrenceId);
        if (result.search) {
          searchRef.current(toCriteria(result.search));
        }
      } catch (err) {
        if (run !== runRef.current) return;
        reply = (err as Error).message || 'Something went wrong talking to the assistant.';
        setError(reply);
      }
      setLog((l) => [...l, { role: 'assistant', text: reply, live: true }]);
    }

    setPhase('speaking');
    await speak(reply);
    if (run !== runRef.current) return;
    if (activeRef.current) void listen();
    else setPhase('idle');
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
      reviewRef.current(toOffer(first.offer), first.qty);
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
        emptyRef.current = 0;
        setActive(true);
        setOpen(true);
        stopSpeaking();
        void listen();
      },
      stop: halt,
      close: () => {
        halt();
        setOpen(false);
      },
      send: (text) => {
        recorderRef.current?.cancel();
        recorderRef.current = null;
        stopSpeaking();
        void handleUtterance(text);
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
    [open, active, phase, log, cartId, trackId, error, supported, halt, listen],
  );

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice(): VoiceValue {
  const v = useContext(VoiceContext);
  if (!v) throw new Error('useVoice must be used inside <VoiceProvider>');
  return v;
}
