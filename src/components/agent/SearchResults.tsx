'use client';

import { useState } from 'react';
import OfferCard from '@/components/results/OfferCard';
import { InlineMessage } from '@/components/shared/InlineMessage';
import { Skeleton } from '@/components/ui/skeleton';
import { useOffers } from '@/hooks/useOffers';
import type { Offer, SearchCriteria, SeatPick } from '@/types/domain';

interface SearchResultsProps {
  criteria: SearchCriteria;
  onPick: (offer: Offer, qty: number, seats: SeatPick[]) => Promise<void>;
}

/** What the agent just searched for, as the same offer cards (with the seat picker) as the results page. */
export default function SearchResults({ criteria, onPick }: SearchResultsProps) {
  const { offers: all, loading } = useOffers(criteria);
  const [problem, setProblem] = useState('');

  const ids = criteria.offerIds;
  const named = ids ? ids.map((id) => all.find((x) => x.offerId === id)).filter((x): x is Offer => !!x) : [];
  const offers = (named.length ? named : all).slice(0, 3);

  async function pick(offer: Offer, qty?: number, seats: SeatPick[] = []) {
    setProblem('');
    try {
      await onPick(offer, qty ?? criteria.passengers ?? 1, seats);
    } catch (err) {
      setProblem((err as Error).message);
    }
  }

  if (loading) return <Skeleton className="h-24" />;
  if (!offers.length) return null;
  return (
    <div className="space-y-3">
      {offers.map((o) => <OfferCard key={o.offerId} offer={o} passengers={criteria.passengers || 1} onSelect={pick} />)}
      {problem && <InlineMessage tone="error">{problem}</InlineMessage>}
    </div>
  );
}
