import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useVoice } from '../context/VoiceContext';
import { useAuth } from '../context/AuthContext';
import { CloseIcon, MicIcon, SendIcon, TicketIcon } from '../components/icons';
import { Orb } from '../components/agent/VoiceMode';
import SearchResults from '../components/agent/SearchResults';
import CartCard from '../components/agent/CartCard';
import LiveMap from '../components/map/LiveMap';
import type { Page } from '../types/domain';

const BARS = 64;

/** Dotted level meter (ChatGPT-style): dots swell into bars as the mic level scrolls past. */
function Wave() {
  const { levelRef } = useVoice();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const hist = new Array<number>(BARS).fill(0);
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      if (t - last > 45) {
        last = t;
        hist.shift();
        hist.push(Math.min(1, levelRef.current * 1.6));
        box.current?.childNodes.forEach((n, i) => {
          const el = n as HTMLElement;
          el.style.height = `${4 + hist[i] * 26}px`;
          el.style.opacity = String(0.35 + hist[i] * 0.65);
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [levelRef]);
  return (
    <div ref={box} className="flex h-8 min-w-0 flex-1 items-center justify-between gap-[3px] overflow-hidden px-2">
      {Array.from({ length: BARS }, (_, i) => (
        <span key={i} className="w-[3px] shrink-0 rounded-full bg-slate-500 transition-[height] duration-100" style={{ height: 4, opacity: 0.35 }} />
      ))}
    </div>
  );
}

const SUGGESTIONS = [
  'Plan a 3-day trip from Kathmandu to Pokhara under NPR 40,000',
  'Find a lake-view hotel in Pokhara for this weekend',
  'I need a hall for a wedding reception with 300 guests in Kathmandu',
  'Weekend jungle safari in Chitwan — resort and bus tickets',
];

interface PlannerProps {
  onNavigate: (page: Page) => void;
  onSignIn: () => void;
  /** Arrived via a mic button: start listening right away. */
  autoStart?: boolean;
}

/** Full-screen chat with the booking concierge (same one as the voice orb). It only searches and holds seats — checkout stays manual. */
export default function Planner({ onNavigate, onSignIn, autoStart }: PlannerProps) {
  const { log, phase, active, cartId, trackId, closeTrack, error, supported, start, stop, send, holdOffer, reviewInCheckout, dismissCart, startOver } = useVoice();
  const { user } = useAuth();
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const busy = phase === 'thinking' || phase === 'transcribing';
  const empty = log.length === 0;
  const lastSearch = log.reduce((n, e, i) => (e.search ? i : n), -1); // only the newest search shows cards

  useEffect(() => {
    if (autoStart) start();
    return stop; // leaving the page must not leave the mic open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [log, cartId, phase]);

  function submit(e: FormEvent, text = draft) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    send(text.trim());
    setDraft('');
  }

  const listening = active && phase === 'listening';
  const iconBtn = 'grid h-10 w-10 shrink-0 place-items-center rounded-full transition active:scale-90';

  // Listening: the field turns into a live level meter so the user sees the mic has them.
  const composer = listening ? (
    <div className="flex animate-[composerIn_0.2s_ease-out] items-center gap-2 rounded-full bg-slate-100 py-2 pl-2 pr-2 ring-1 ring-slate-200">
      <button onClick={stop} aria-label="Cancel" className={`${iconBtn} bg-white text-navy-950 shadow-sm hover:bg-slate-50`}>
        <CloseIcon width={18} height={18} />
      </button>
      <Wave />
      <button onClick={stop} aria-label="Stop listening" className={`${iconBtn} bg-white text-navy-950 shadow-sm hover:bg-slate-50`}>
        <span className="block h-3.5 w-3.5 rounded-[3px] bg-navy-950" />
      </button>
    </div>
  ) : (
    <form onSubmit={submit} className="flex items-center gap-2 rounded-full bg-slate-100 py-2 pl-5 pr-2 ring-1 ring-slate-200">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Where do you want to go?"
        className="min-w-0 flex-1 bg-transparent text-[15px] text-navy-950 placeholder:text-slate-400 focus:outline-none"
      />
      {supported && (
        <button type="button" onClick={start} aria-label="Speak" className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:text-navy-950">
          <MicIcon className="h-5 w-5" width={20} height={20} />
        </button>
      )}
      <button
        disabled={!draft.trim() || busy}
        className="grid h-10 w-10 place-items-center rounded-full bg-navy-950 text-white transition active:scale-90 disabled:bg-slate-300 disabled:text-slate-100"
        aria-label="Send"
      >
        {busy ? <span className="voice-spin block h-4 w-4 rounded-full border-2 border-white/40 border-t-white" /> : <SendIcon className="h-5 w-5" width={20} height={20} />}
      </button>
    </form>
  );

  // Live voice session (listening aside): the orb sits above a "Type" field, and the blue X ends the session.
  const dock = active && !listening && (
    <div className="flex animate-[composerIn_0.25s_ease-out] flex-col items-center gap-4 pb-4">
      <Orb phase={phase} size={96} />
      <div className="flex w-full items-center gap-2 rounded-full bg-slate-100 py-2 pl-5 pr-2 ring-1 ring-slate-200">
        <form onSubmit={submit} className="min-w-0 flex-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type"
            className="w-full bg-transparent text-[15px] text-navy-950 placeholder:text-slate-400 focus:outline-none"
          />
        </form>
        <button onClick={stop} aria-label="End voice" className={`${iconBtn} bg-brand-blue text-white hover:bg-blue-700`}>
          <CloseIcon width={18} height={18} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen flex-col bg-white text-navy-950">
      <header className="flex items-center justify-between px-4 py-3 sm:px-6">
        <button onClick={() => onNavigate('home')} className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-navy-950">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-blue">
            <TicketIcon width={18} height={18} />
          </span>
          Swiftpass
        </button>
        <nav className="flex items-center gap-1 rounded-full bg-slate-100 p-1 text-sm font-medium">
          <span className="rounded-full bg-white px-4 py-1.5 text-navy-950 shadow-sm">AI planner</span>
          <button onClick={() => onNavigate('home')} className="rounded-full px-4 py-1.5 text-slate-500 hover:text-navy-950">
            Book a trip
          </button>
          <button onClick={() => onNavigate('tickets')} className="rounded-full px-4 py-1.5 text-slate-500 hover:text-navy-950">
            My tickets
          </button>
        </nav>
        <div className="flex items-center gap-2 text-sm">
          {!empty && (
            <button onClick={startOver} className="rounded-full px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100">
              New chat
            </button>
          )}
          {!user && (
            <button onClick={onSignIn} className="rounded-full bg-navy-950 px-4 py-1.5 font-semibold text-white">
              Sign in
            </button>
          )}
        </div>
      </header>

      {empty ? (
        <main className="flex flex-1 flex-col items-center justify-center px-4 pb-24">
          <Orb phase={phase} size={72} />
          <h1 className="mb-8 mt-8 text-center text-3xl font-medium text-navy-950">Where to next?</h1>
          <div className="w-full max-w-2xl">{composer}</div>
          <div className="mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50">
                {s}
              </button>
            ))}
          </div>
          {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
        </main>
      ) : (
        <>
          <main className="flex-1 overflow-y-auto px-4">
            <div className="mx-auto max-w-3xl space-y-5 py-6">
              {log.map((entry, i) => (
                <div key={i} className="space-y-3">
                  <div className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap text-[15px] leading-relaxed ${
                        entry.role === 'user' ? 'rounded-3xl bg-slate-100 px-5 py-2.5 text-navy-950' : 'text-slate-800'
                      }`}
                    >
                      {entry.text}
                    </div>
                  </div>
                  {i === lastSearch && entry.search && <SearchResults criteria={entry.search} onPick={holdOffer} onSignIn={onSignIn} signedIn={!!user} />}
                </div>
              ))}

              {busy && (
                <div className="flex items-center gap-1.5 py-1" aria-label="Thinking">
                  {[0, 0.18, 0.36].map((d) => (
                    <span key={d} className="voice-dot block h-2 w-2 rounded-full bg-slate-400" style={{ animationDelay: `${d}s` }} />
                  ))}
                </div>
              )}
              {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

              {cartId && <CartCard cartId={cartId} onReview={reviewInCheckout} onDismiss={dismissCart} />}

              {trackId && (
                <div className="rounded-2xl border border-slate-200 p-2 text-navy-950">
                  <LiveMap occurrenceId={trackId} onClose={closeTrack} />
                </div>
              )}
              <div ref={endRef} />
            </div>
          </main>
          <div className="mx-auto w-full max-w-3xl px-4 pb-5">{dock || composer}</div>
        </>
      )}
    </div>
  );
}
