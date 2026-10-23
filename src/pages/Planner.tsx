import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useVoice } from '../context/VoiceContext';
import { MicIcon, SendIcon } from '../components/icons';
import LiveMap from '../components/map/LiveMap';

const SUGGESTIONS = [
  'Plan a 3-day trip from Kathmandu to Pokhara under NPR 40,000',
  'Find a lake-view hotel in Pokhara for this weekend',
  'I need a hall for a wedding reception with 300 guests in Kathmandu',
  'Weekend jungle safari in Chitwan — resort and bus tickets',
];

/** Text chat with the same booking concierge as the voice orb. It only searches and holds seats — checkout stays manual. */
export default function Planner() {
  const { log, phase, cartId, trackId, closeTrack, error, supported, start, send, reviewInCheckout, dismissCart, startOver } = useVoice();
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const busy = phase === 'thinking' || phase === 'transcribing';

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [log, cartId, phase]);

  function submit(e: FormEvent, text = draft) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    send(text.trim());
    setDraft('');
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-3xl flex-col px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-950">AI trip planner</h1>
          <p className="text-sm text-slate-500">
            Describe your trip. I search flights, buses, trains, hotels, resorts, halls and events, and hold seats for you to review.
          </p>
        </div>
        {log.length > 0 && (
          <button onClick={startOver} className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white">
            New plan
          </button>
        )}
      </div>

      <div className="flex-1 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        {log.length === 0 && (
          <div className="py-6">
            <p className="mb-3 text-sm font-semibold text-slate-500">Try asking:</p>
            <div className="grid gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-left text-sm font-medium text-navy-900 transition hover:border-brand-blue hover:bg-brand-blue/5"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {log.map((entry, i) => (
          <div key={i} className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[14px] leading-snug ${
                entry.role === 'user' ? 'bg-brand-blue text-white' : 'bg-slate-100 text-navy-950'
              }`}
            >
              {entry.text}
            </div>
          </div>
        ))}

        {busy && <p className="text-sm text-slate-400">Planning…</p>}
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

        {cartId && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
            <span className="font-semibold">Your plan is held.</span>
            <button onClick={reviewInCheckout} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">
              Review &amp; pay
            </button>
            <button onClick={dismissCart} className="text-xs font-semibold text-emerald-700 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {trackId && <LiveMap occurrenceId={trackId} onClose={closeTrack} />}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Where do you want to go?"
          className="field-input flex-1"
        />
        {supported && (
          <button type="button" onClick={start} aria-label="Speak" className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-navy-900 hover:bg-slate-50">
            <MicIcon className="h-5 w-5" width={20} height={20} />
          </button>
        )}
        <button
          disabled={!draft.trim() || busy}
          className="grid h-11 w-11 place-items-center rounded-xl bg-brand-blue text-white hover:bg-blue-700 disabled:opacity-50"
          aria-label="Send"
        >
          <SendIcon className="h-5 w-5" width={20} height={20} />
        </button>
      </form>
    </div>
  );
}
