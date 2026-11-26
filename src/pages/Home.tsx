import SearchWidget from '../components/search/SearchWidget';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { fetchFeatured } from '../api/rest';
import { formatMoney } from '../lib/format';
import { ModeIcon, ShieldIcon, ClockIcon, CheckIcon, MicIcon, SendIcon, CloseIcon } from '../components/icons';
import { Orb } from '../components/agent/VoiceMode';
import Wave from '../components/agent/Wave';
import { useVoice } from '../context/VoiceContext';
import type { Offer, SearchCriteria } from '../types/domain';

const PROMPTS = [
  'Plan a 3-day trip from Kathmandu to Pokhara under NPR 40,000',
  'Find a lake-view hotel in Pokhara this weekend',
  'Weekend jungle safari in Chitwan',
];

const HIGHLIGHTS = [
  { icon: ShieldIcon, title: 'Tamper-proof tickets', body: 'Every QR is server-signed and device-bound — screenshots and reshares are rejected at the gate.' },
  { icon: ClockIcon, title: 'Under 2-second gate scans', body: 'Offline-capable validation, even when the venue has no signal.' },
  { icon: CheckIcon, title: 'One checkout, every leg', body: 'Flights, buses, hotels, resorts, event halls and tickets — one booking, one QR per guest.' },
];

export default function Home({ onSearch, onPlan }: { onSearch: (criteria: SearchCriteria) => void; onPlan?: () => void }) {
  const [featured, setFeatured] = useState<Offer[]>([]);
  const [draft, setDraft] = useState('');
  const [homeVoice, setHomeVoice] = useState(false); // the mic was tapped here, so the first sentence is taken on this screen
  const { send, start, stop, startOver, supported, phase, log } = useVoice();
  const spoke = homeVoice && log.some((e) => e.role === 'user');

  // The planner page is where the conversation lives: begin a fresh chat there with what was asked here.
  function plan(text: string) {
    startOver();
    send(text);
    onPlan?.();
  }
  function ask(e: FormEvent) {
    e.preventDefault();
    if (draft.trim()) plan(draft.trim());
  }
  function toggleMic() {
    if (homeVoice) {
      stop();
      setHomeVoice(false);
      return;
    }
    startOver();
    setHomeVoice(true);
    start();
  }
  // The sentence was heard: carry the live conversation over to the planner, mic still open.
  useEffect(() => {
    if (spoke) onPlan?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spoke]);
  // Leaving before anything was said must not leave the mic open.
  const stillListening = useRef(false);
  stillListening.current = homeVoice && !spoke;
  useEffect(() => () => {
    if (stillListening.current) stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const hearing = homeVoice && (phase === 'listening' || phase === 'idle');
  const understanding = homeVoice && (phase === 'transcribing' || phase === 'thinking');
  useEffect(() => {
    let cancelled = false;
    fetchFeatured()
      .then((list) => !cancelled && setFeatured(list))
      .catch(() => !cancelled && setFeatured([]));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <section className="bg-white">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 pb-14 pt-12 sm:px-6 sm:pt-16">
          <Orb phase={homeVoice ? phase : 'idle'} size={64} />
          <h1 className="mb-7 mt-6 text-center text-3xl font-medium text-navy-950 sm:text-4xl">Where to next?</h1>

          {/* Suggestions float above the box. */}
          <div className="mb-5 flex flex-wrap justify-center gap-2.5">
            {PROMPTS.map((t, i) => (
              <button
                key={t}
                onClick={() => plan(t)}
                style={{ animation: `floaty ${5 + i * 0.7}s ease-in-out ${i * 0.5}s infinite` }}
                className="float-chip rounded-full bg-white px-4 py-2 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200/80 transition hover:text-navy-950 hover:ring-slate-300"
              >
                {t}
              </button>
            ))}
          </div>

          {/* One search: ask in words or by voice, or pick a kind of trip right under the box to reveal the exact fields. */}
          <div className="w-full rounded-[28px] bg-white p-3 shadow-card ring-1 ring-slate-200/80 sm:p-5">
            {homeVoice && hearing ? (
              // Same listening bar as the planner chat: cancel, live level meter, stop.
              <div className="flex w-full animate-[composerIn_0.2s_ease-out] items-center gap-2 rounded-full bg-slate-100 py-2 pl-2 pr-2 ring-1 ring-slate-200">
                <button onClick={toggleMic} aria-label="Cancel" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-navy-950 shadow-sm transition hover:bg-slate-50 active:scale-90">
                  <CloseIcon width={18} height={18} />
                </button>
                <Wave />
                <button onClick={toggleMic} aria-label="Stop listening" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-navy-950 shadow-sm transition hover:bg-slate-50 active:scale-90">
                  <span className="block h-3.5 w-3.5 rounded-[3px] bg-navy-950" />
                </button>
              </div>
            ) : (
            <form onSubmit={ask} className="flex w-full items-center gap-2 rounded-full bg-slate-100 py-2 pl-5 pr-2 ring-1 ring-slate-200">
              {homeVoice ? (
                <p className="min-w-0 flex-1 truncate text-[15px] text-slate-500" aria-live="polite">
                  {understanding ? 'Understanding…' : 'Connecting…'}
                </p>
              ) : (
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Ask the AI planner: flights, buses, hotels, events…"
                  className="min-w-0 flex-1 bg-transparent text-[15px] text-navy-950 placeholder:text-slate-400 focus:outline-none"
                />
              )}
              {supported && (
                <button
                  type="button"
                  onClick={toggleMic}
                  title={homeVoice ? 'Stop listening' : 'Speak your request'}
                  aria-label={homeVoice ? 'Stop listening' : 'Speak your request'}
                  className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:text-navy-950"
                >
                  <MicIcon width={20} height={20} />
                </button>
              )}
              <button disabled={!draft.trim() || homeVoice} aria-label="Send" className="grid h-10 w-10 place-items-center rounded-full bg-navy-950 text-white transition disabled:bg-slate-300 disabled:text-slate-100">
                <SendIcon width={20} height={20} />
              </button>
            </form>
            )}

            <SearchWidget bare collapsible onSearch={onSearch} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {HIGHLIGHTS.map((h) => (
            <div key={h.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue">
                <h.icon className="h-5 w-5" width={20} height={20} />
              </span>
              <p className="mt-3 text-[15px] font-bold text-navy-950">{h.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{h.body}</p>
            </div>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-navy-950">Coming up</h2>
            <p className="text-sm text-slate-500">Upcoming departures and events</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((o) => (
            <button
              key={o.offerId}
              onClick={() =>
                onSearch({
                  mode: o.mode,
                  from: o.origin?.city || '',
                  to: o.destination?.city || '',
                  city: o.venue?.city || '',
                  date: o.departsAt.slice(0, 10),
                  passengers: 1,
                })
              }
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-popover"
            >
              <div className="flex h-28 items-center justify-center bg-gradient-to-br from-navy-800 to-navy-950 text-white/90">
                <ModeIcon mode={o.mode} className="h-9 w-9" width={36} height={36} />
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-brand-blue">{o.provider.displayName}</p>
                <p className="mt-0.5 line-clamp-2 text-sm font-bold text-navy-950">{o.title}</p>
                <div className="mt-auto flex items-end justify-between pt-3">
                  <span className="text-xs text-slate-400">from</span>
                  <span className="text-base font-extrabold text-navy-950">{formatMoney(o.price)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
      )}
    </div>
  );
}
