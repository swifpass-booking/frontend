import SearchWidget from '../components/search/SearchWidget';
import { useEffect, useState, type FormEvent } from 'react';
import { fetchFeatured } from '../api/rest';
import { formatMoney } from '../lib/format';
import { ModeIcon, ShieldIcon, ClockIcon, CheckIcon, MicIcon, SendIcon } from '../components/icons';
import { Orb } from '../components/agent/VoiceMode';
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

export default function Home({ onSearch, onPlan, onVoice }: { onSearch: (criteria: SearchCriteria) => void; onPlan?: () => void; onVoice?: () => void }) {
  const [featured, setFeatured] = useState<Offer[]>([]);
  const [draft, setDraft] = useState('');
  const { send } = useVoice();

  // The planner page is where the conversation lives: hand the question over and go there.
  function plan(text: string) {
    send(text);
    onPlan?.();
  }
  function ask(e: FormEvent) {
    e.preventDefault();
    if (draft.trim()) plan(draft.trim());
  }
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
        <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pb-10 pt-14 sm:px-6 sm:pt-20">
          <Orb phase="idle" size={64} />
          <h1 className="mb-8 mt-7 text-center text-3xl font-medium text-navy-950 sm:text-4xl">Where to next?</h1>

          <form onSubmit={ask} className="flex w-full items-center gap-2 rounded-full bg-slate-100 py-2 pl-5 pr-2 ring-1 ring-slate-200">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask the AI planner — flights, buses, hotels, events…"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-navy-950 placeholder:text-slate-400 focus:outline-none"
            />
            <button type="button" onClick={onVoice} title="Talk to the booking assistant" aria-label="Open the AI planner" className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:text-navy-950">
              <MicIcon width={20} height={20} />
            </button>
            <button disabled={!draft.trim()} aria-label="Send" className="grid h-10 w-10 place-items-center rounded-full bg-navy-950 text-white transition disabled:bg-slate-300 disabled:text-slate-100">
              <SendIcon width={20} height={20} />
            </button>
          </form>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {PROMPTS.map((t) => (
              <button key={t} onClick={() => plan(t)} className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50">
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
          <p className="mb-3 text-center text-sm font-semibold text-slate-400">Or search directly</p>
          <SearchWidget onSearch={onSearch} onVoice={onVoice} />
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
