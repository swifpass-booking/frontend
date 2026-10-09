import { useEffect, useMemo, useState } from 'react';
import SearchWidget from '../components/search/SearchWidget';
import OfferCard from '../components/results/OfferCard';
import { searchOffersApi } from '../api/rest';
import { ModeIcon } from '../components/icons';
import type { Offer, SearchCriteria, SeatPick } from '../types/domain';

const SORTS = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'price', label: 'Price: low to high' },
  { key: 'departure', label: 'Departure time' },
] as const;

type SortKey = (typeof SORTS)[number]['key'];

interface ResultsProps {
  criteria: SearchCriteria;
  onSearch: (criteria: SearchCriteria) => void;
  onSelect: (offer: Offer, passengers?: number, seats?: SeatPick[]) => void;
}

export default function Results({ criteria, onSearch, onSelect }: ResultsProps) {
  const [sort, setSort] = useState<SortKey>('recommended');
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    searchOffersApi(criteria)
      .then((list) => !cancelled && setOffers(list))
      .catch((e: Error) => {
        if (cancelled) return;
        setOffers([]);
        setError(e.message || 'Search failed.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [criteria]);

  const results = useMemo(() => {
    let list = offers;
    const ceiling = maxPrice ?? Infinity;
    list = list.filter((o) => o.price.amount / 100 <= ceiling);
    if (sort === 'price') list = [...list].sort((a, b) => a.price.amount - b.price.amount);
    if (sort === 'departure')
      list = [...list].sort((a, b) => new Date(a.departsAt).getTime() - new Date(b.departsAt).getTime());
    return list;
  }, [offers, sort, maxPrice]);

  const priceBounds = useMemo(() => {
    const all = offers.map((o) => o.price.amount / 100);
    if (!all.length) return { min: 0, max: 10000 };
    return { min: Math.min(...all), max: Math.max(...all) };
  }, [offers]);

  const routeLabel =
    criteria.mode === 'event'
      ? criteria.city || 'Anywhere'
      : `${criteria.from || 'Anywhere'} → ${criteria.to || 'Anywhere'}`;

  return (
    <div className="bg-slate-50">
      <div className="border-b border-slate-200 bg-white py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SearchWidget key={JSON.stringify(criteria)} initial={criteria} onSearch={onSearch} compact />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-navy-950/5 text-navy-800">
              <ModeIcon mode={criteria.mode} className="h-4.5 w-4.5" width={18} height={18} />
            </span>
            <div>
              <h1 className="text-lg font-extrabold text-navy-950">{routeLabel}</h1>
              <p className="text-xs text-slate-500">
                {loading ? 'Searching…' : `${results.length} result${results.length === 1 ? '' : 's'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-navy-950 outline-none focus:border-brand-blue"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-card lg:sticky lg:top-24">
            <p className="mb-3 text-sm font-bold text-navy-950">Filters</p>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Max price
            </label>
            <input
              type="range"
              min={Math.floor(priceBounds.min)}
              max={Math.ceil(priceBounds.max)}
              value={maxPrice ?? priceBounds.max}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="mt-2 w-full accent-brand-blue"
            />
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>NPR {Math.floor(priceBounds.min).toLocaleString()}</span>
              <span className="font-bold text-navy-950">
                NPR {Math.round(maxPrice ?? priceBounds.max).toLocaleString()}
              </span>
            </div>
            {maxPrice != null && (
              <button
                onClick={() => setMaxPrice(null)}
                className="mt-3 text-xs font-semibold text-brand-blue hover:underline"
              >
                Reset filter
              </button>
            )}
          </aside>

          <div className="flex flex-col gap-3">
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
            {loading && <div className="h-28 animate-pulse rounded-2xl bg-white shadow-card" />}
            {!loading && !error && results.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="font-bold text-navy-950">No matches for this search</p>
                <p className="mt-1 text-sm text-slate-500">
                  Try a different date, route, or clear the price filter.
                </p>
              </div>
            )}
            {results.map((o) => (
              <OfferCard key={o.offerId} offer={o} passengers={criteria.passengers || 1} onSelect={onSelect} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
