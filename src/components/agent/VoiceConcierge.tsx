import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getCart, toOffer } from '../../api/rest';
import { postVoiceTurn } from '../../api/voiceAgent';
import { CloseIcon, MicIcon, SendIcon, TicketIcon } from '../icons';
import type { Offer } from '../../types/domain';

interface LogEntry {
  role: 'user' | 'assistant';
  text: string;
}

const REVIEW_WORDS = /\b(confirm|yes|go ahead|checkout|check out|review|pay|book it)\b/i;
const DISMISS_WORDS = /\b(cancel|no thanks|never mind|not now)\b/i;

function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

function getRecognitionCtor(): { new (): SpeechRecognition } | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

interface VoiceConciergeProps {
  token: string | null;
  onReviewOffer: (offer: Offer, passengers: number) => void;
}

export default function VoiceConcierge({ token, onReviewOffer }: VoiceConciergeProps) {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [log, setLog] = useState<LogEntry[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cartId, setCartId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const speechSupported = getRecognitionCtor() !== null;

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log, cartId]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  async function runTurn(text: string) {
    setBusy(true);
    setError(null);
    try {
      const result = await postVoiceTurn({ sessionId, message: text, token });
      setSessionId(result.sessionId);
      setLog((l) => [...l, { role: 'assistant', text: result.reply }]);
      speak(result.reply);
      if (result.cartId) setCartId(result.cartId);
    } catch (err) {
      const msg = (err as Error).message || 'Something went wrong talking to the assistant.';
      setError(msg);
      setLog((l) => [...l, { role: 'assistant', text: msg }]);
      speak(msg);
    } finally {
      setBusy(false);
    }
  }

  async function reviewInCheckout() {
    if (!cartId) return;
    setBusy(true);
    setError(null);
    try {
      const cart = await getCart(cartId, token);
      const first = cart.items[0];
      if (!first) {
        setError("That trip isn't held anymore — ask me to search again.");
        return;
      }
      onReviewOffer(toOffer(first.offer), first.qty);
      setOpen(false);
    } catch (err) {
      setError((err as Error).message || 'Could not load that trip.');
    } finally {
      setBusy(false);
    }
  }

  function handleUtterance(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;
    setLog((l) => [...l, { role: 'user', text }]);
    setDraft('');

    if (cartId) {
      if (REVIEW_WORDS.test(text)) return void reviewInCheckout();
      if (DISMISS_WORDS.test(text)) {
        setCartId(null);
        const msg = "Okay, I've put that aside. What would you like to do instead?";
        setLog((l) => [...l, { role: 'assistant', text: msg }]);
        speak(msg);
        return;
      }
    }
    void runTurn(text);
  }

  function startListening() {
    const Ctor = getRecognitionCtor();
    if (!Ctor || busy) return;
    const recognition = new Ctor();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e) => handleUtterance(e.results[0]?.[0]?.transcript || '');
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  function submitDraft(e: FormEvent) {
    e.preventDefault();
    handleUtterance(draft);
  }

  function startOver() {
    setSessionId(null);
    setLog([]);
    setCartId(null);
    setError(null);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue text-white shadow-popover transition hover:bg-blue-700"
        aria-label="Open booking concierge"
      >
        <MicIcon className="h-6 w-6" width={24} height={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex h-[32rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-popover">
      <div className="flex items-center justify-between border-b border-slate-100 bg-navy-950 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/10">
            <TicketIcon className="h-4 w-4" width={16} height={16} />
          </span>
          <div>
            <p className="text-sm font-bold leading-tight">Booking concierge</p>
            <p className="text-[11px] text-navy-100/70">Say where you want to go</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={startOver} className="rounded-md px-2 py-1 text-[11px] font-semibold text-navy-100/80 hover:bg-white/10">
            New
          </button>
          <button onClick={() => setOpen(false)} className="grid h-7 w-7 place-items-center rounded-md hover:bg-white/10" aria-label="Close">
            <CloseIcon className="h-4 w-4" width={16} height={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-3 py-3">
        {log.length === 0 && (
          <p className="mt-6 text-center text-xs text-slate-400">
            Try: "Book a bus from Pokhara to Beni on the 15th for two people."
          </p>
        )}
        {log.map((entry, i) => (
          <div key={i} className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-snug ${
                entry.role === 'user' ? 'bg-brand-blue text-white' : 'bg-white text-navy-950 shadow-card ring-1 ring-slate-100'
              }`}
            >
              {entry.text}
            </div>
          </div>
        ))}

        {cartId && (
          <div className="rounded-2xl border border-brand-blue/30 bg-white p-3 shadow-card">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-blue">Trip held</p>
            <p className="mt-1 text-[12px] text-slate-500">
              Seats are held for a few minutes. Review it in checkout to pay and confirm — nothing is
              booked yet.
            </p>
            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={() => setCartId(null)}
                disabled={busy}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              >
                Dismiss
              </button>
              <button
                onClick={reviewInCheckout}
                disabled={busy}
                className="rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-40"
              >
                Review &amp; pay
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-[12px] font-medium text-red-600">{error}</p>}
        <div ref={logEndRef} />
      </div>

      <form onSubmit={submitDraft} className="flex items-center gap-2 border-t border-slate-100 bg-white p-2.5">
        <button
          type="button"
          onClick={listening ? stopListening : startListening}
          disabled={!speechSupported || busy}
          title={speechSupported ? 'Speak' : 'Voice input not supported in this browser — type instead'}
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-30 ${
            listening ? 'animate-pulse bg-red-500 text-white' : 'bg-slate-100 text-navy-800 hover:bg-slate-200'
          }`}
        >
          <MicIcon className="h-4 w-4" width={16} height={16} />
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={busy ? 'Thinking…' : listening ? 'Listening…' : 'Type or tap the mic…'}
          disabled={busy}
          className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-brand-blue focus:bg-white disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-blue text-white disabled:opacity-40"
          aria-label="Send"
        >
          <SendIcon className="h-4 w-4" width={16} height={16} />
        </button>
      </form>
    </div>
  );
}
