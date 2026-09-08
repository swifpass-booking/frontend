import SearchWidget from './SearchWidget.jsx';
import { OFFERS, formatMoney } from './data.js';
import { ModeIcon, ShieldIcon, ClockIcon, CheckIcon } from './icons.jsx';

const HIGHLIGHTS = [
  { icon: ShieldIcon, title: 'Tamper-proof tickets', body: 'Every QR is server-signed and device-bound — screenshots and reshares are rejected at the gate.' },
  { icon: ClockIcon, title: 'Under 2-second gate scans', body: 'Offline-capable validation, even when the venue has no signal.' },
  { icon: CheckIcon, title: 'One checkout, every leg', body: 'Flight, connecting bus and event tickets — paid once, confirmed together.' },
];

export default function Home({ onSearch }) {
  const featured = pickFeatured();

  return (
    <div>
      <section className="relative overflow-hidden bg-navy-950">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(60% 60% at 15% 10%, rgba(26,86,219,0.55), transparent), radial-gradient(50% 50% at 90% 30%, rgba(245,166,35,0.25), transparent)',
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <p className="mb-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white/80">
            Flights · Buses · Trains · Events — one booking
          </p>
          <h1 className="max-w-2xl text-3xl font-extrabold leading-tight text-white sm:text-5xl">
            Go anywhere in Nepal. <span className="text-brand-amber">Book it once.</span>
          </h1>
          <p className="mt-3 max-w-xl text-[15px] text-navy-100/80">
            Search every mode of transport and live event in one place, hold your
            seat instantly, and carry one secure ticket through the whole trip.
          </p>

          <div className="mt-8">
            <SearchWidget onSearch={onSearch} />
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

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-navy-950">Popular right now</h2>
            <p className="text-sm text-slate-500">Trending across all four modes this week</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((o) => (
            <button
              key={o.offerId}
              onClick={() => onSearch({ mode: o.mode, from: o.origin?.city || '', to: o.destination?.city || '', city: o.venue?.city || '', date: o.departsAt.slice(0, 10), passengers: 1 })}
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
    </div>
  );
}

function pickFeatured() {
  const seen = new Set();
  const out = [];
  for (const o of OFFERS) {
    if (seen.has(o.mode)) continue;
    seen.add(o.mode);
    out.push(o);
  }
  for (const o of OFFERS) {
    if (out.length >= 4) break;
    if (!out.includes(o)) out.push(o);
  }
  return out.slice(0, 4);
}
