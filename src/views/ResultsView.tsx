'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import SearchWidget from '@/components/search/SearchWidget';
import OfferCard from '@/components/results/OfferCard';
import { ModeIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { InlineMessage } from '@/components/shared/InlineMessage';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageContainer } from '@/components/shared/PageContainer';
import { useOffers } from '@/hooks/useOffers';
import { useTrip } from '@/context/TripContext';
import { isVenueMode } from '@/lib/offers';
import type { SearchCriteria } from '@/types/domain';

const SORTS = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'price', label: 'Price: low to high' },
  { key: 'departure', label: 'Departure time' },
] as const;
type SortKey = (typeof SORTS)[number]['key'];

function Results({ criteria }: { criteria: SearchCriteria }) {
  const { search, select } = useTrip();
  const { offers, loading, error } = useOffers(criteria);
  const [sort, setSort] = useState<SortKey>('recommended');
  const [ceiling, setCeiling] = useState<number | null>(null);

  const results = useMemo(() => {
    const list = offers.filter((o) => o.price.amount / 100 <= (ceiling ?? Infinity));
    if (sort === 'price') return [...list].sort((a, b) => a.price.amount - b.price.amount);
    if (sort === 'departure') return [...list].sort((a, b) => new Date(a.departsAt).getTime() - new Date(b.departsAt).getTime());
    return list;
  }, [offers, sort, ceiling]);

  const bounds = useMemo(() => {
    const all = offers.map((o) => o.price.amount / 100);
    return all.length ? { min: Math.min(...all), max: Math.max(...all) } : { min: 0, max: 10000 };
  }, [offers]);

  const route = isVenueMode(criteria.mode) ? criteria.city || 'Anywhere' : `${criteria.from || 'Anywhere'} → ${criteria.to || 'Anywhere'}`;

  return (
    <>
      <div className="border-b border-slate-200 bg-white py-4">
        <PageContainer width="full" className="py-0">
          <SearchWidget key={JSON.stringify(criteria)} initial={criteria} onSearch={search} compact />
        </PageContainer>
      </div>

      <PageContainer width="full" className="py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg bg-navy-950/5 text-navy-800"><ModeIcon mode={criteria.mode} className="size-[18px]" width={18} height={18} /></span>
            <div>
              <h1 className="text-lg font-extrabold text-navy-950">{route}</h1>
              <p className="text-xs text-slate-500">{loading ? 'Searching…' : `${results.length} result${results.length === 1 ? '' : 's'}`}</p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-500">
            Sort
            <NativeSelect value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-9 w-auto bg-white">
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </NativeSelect>
          </label>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <Card className="h-fit lg:sticky lg:top-24">
            <CardContent className="p-4">
              <p className="mb-3 text-sm font-bold text-navy-950">Filters</p>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Max price</label>
              <input type="range" min={Math.floor(bounds.min)} max={Math.ceil(bounds.max)} value={ceiling ?? bounds.max} onChange={(e) => setCeiling(Number(e.target.value))} className="mt-2 w-full accent-brand-blue" />
              <div className="mt-1 flex justify-between text-xs text-slate-500">
                <span>NPR {Math.floor(bounds.min).toLocaleString()}</span>
                <span className="font-bold text-navy-950">NPR {Math.round(ceiling ?? bounds.max).toLocaleString()}</span>
              </div>
              {ceiling != null && <Button variant="link" size="sm" onClick={() => setCeiling(null)} className="mt-3 h-auto text-xs">Reset filter</Button>}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            {error && <InlineMessage tone="error">{error}</InlineMessage>}
            {loading && <Skeleton className="h-28 bg-white shadow-card" />}
            {!loading && !error && results.length === 0 && (
              <Card className="border-dashed"><EmptyState title="No matches for this search" className="py-10">Try a different date, route, or clear the price filter.</EmptyState></Card>
            )}
            {results.map((o) => <OfferCard key={o.offerId} offer={o} passengers={criteria.passengers || 1} onSelect={select} />)}
          </div>
        </div>
      </PageContainer>
    </>
  );
}

/** No search yet (a reload, or a direct link): send the traveller back to the search form. */
export default function ResultsView() {
  const { criteria } = useTrip();
  const router = useRouter();
  if (!criteria) return <EmptyState title="Start a search first" action={<Button variant="brand" onClick={() => router.push('/')}>Back to search</Button>} />;
  return <Results criteria={criteria} />;
}
