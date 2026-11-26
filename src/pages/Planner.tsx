import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useVoice } from '../context/VoiceContext';
import { CloseIcon, MicIcon, SendIcon } from '../components/icons';
import { Orb } from '../components/agent/VoiceMode';
import Wave from '../components/agent/Wave';
import SearchResults from '../components/agent/SearchResults';
import CartCard from '../components/agent/CartCard';
import ChatSidebar from '../components/agent/ChatSidebar';
import LiveMap from '../components/map/LiveMap';
import MyLocation from '../components/map/MyLocation';

const SUGGESTIONS = [
  'Plan a 3-day trip from Kathmandu to Pokhara under NPR 40,000',
  'Find a lake-view hotel in Pokhara for this weekend',
  'I need a hall for a wedding reception with 300 guests in Kathmandu',
  'Weekend jungle safari in Chitwan — resort and bus tickets',
];

interface PlannerProps {
  onSignIn: () => void;
  /** Arrived via a mic button: start listening right away. */
  autoStart?: boolean;
}

/** Full-screen chat with the booking concierge (same one as the voice orb). It only searches and holds seats — checkout stays manual. */
export default function Planner({ onSignIn, autoStart }: PlannerProps) {
  const { log, phase, active, cartId, trackId, closeTrack, showMe, closeMe, error, supported, start, stop, send, holdOffer, guestKey, reviewInCheckout, dismissCart } = useVoice();
  const [draft, setDraft] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  const endRef = useRef<HTMLDivElement>(null);
  const busy = phase === 'thinking' || phase === 'transcribing';
  const empty = log.length === 0;
  const cartEntry = log.reduce((n, e, i) => (e.cartId && e.cartId === cartId ? i : n), -1); // the message the live cart belongs to
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
    <div className="relative flex h-[calc(100dvh-57px)] bg-white text-navy-950">
      {sidebarOpen && (
        <>
          {/* Phones: the sidebar slides over the chat, tapping outside closes it. */}
          <div className="fixed inset-0 z-30 bg-navy-950/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-40 pt-[57px] lg:static lg:z-auto lg:pt-0">
            <ChatSidebar onClose={() => setSidebarOpen(false)} onSignIn={onSignIn} />
          </div>
        </>
      )}

      <div className="relative flex min-w-0 flex-1 flex-col">
        {!sidebarOpen && (
          <button onClick={() => setSidebarOpen(true)} aria-label="Show chats" title="Show chats" className="absolute left-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <path d="M9 4v16" />
            </svg>
          </button>
        )}
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
                  {i === lastSearch && entry.search && <SearchResults criteria={entry.search} onPick={holdOffer} />}
                  {i === cartEntry && cartId && <CartCard cartId={cartId} guestKey={guestKey()} onReview={reviewInCheckout} onDismiss={dismissCart} onSignIn={onSignIn} />}
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

              {cartId && cartEntry < 0 && <CartCard cartId={cartId} guestKey={guestKey()} onReview={reviewInCheckout} onDismiss={dismissCart} onSignIn={onSignIn} />}

              {showMe && <MyLocation onClose={closeMe} />}

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
    </div>
  );
}
