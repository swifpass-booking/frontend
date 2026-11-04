import { useEffect, useState } from 'react';
import { searchOffersApi } from '../../api/rest';
import OfferCard from '../results/OfferCard';
import type { Offer, SearchCriteria, SeatPick } from '../../types/domain';

interface SearchResultsProps {
  criteria: SearchCriteria;
  onPick: (offer: Offer, qty: number, seats: SeatPick[]) => Promise<void>;
  onSignIn: () => void;
  signedIn: boolean;
}

/** What the agent just searched for, as the same offer cards (with the seat picker) as the results page. */
export default function SearchResults({ criteria, onPick, onSignIn, signedIn }: SearchResultsProps) {
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [problem, setProblem] = useState('');
  const key = JSON.stringify(criteria);

  useEffect(() => {
    let cancelled = false;
    setOffers(null);
    searchOffersApi(criteria)
      .then((o) => !cancelled && setOffers(o.slice(0, 3)))
      .catch(() => !cancelled && setOffers([]));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function pick(offer: Offer, qty?: number, seats: SeatPick[] = []) {
    setProblem('');
    if (!signedIn) {
      setProblem('Sign in to hold seats.');
      return onSignIn();
    }
    try {
      await onPick(offer, qty ?? criteria.passengers ?? 1, seats);
    } catch (err) {
      setProblem((err as Error).message);
    }
  }

  if (offers === null) return <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />;
  if (!offers.length) return null;
  return (
    <div className="space-y-3">
      {offers.map((o) => (
        <OfferCard key={o.offerId} offer={o} passengers={criteria.passengers || 1} onSelect={pick} />
      ))}
      {problem && <p className="text-sm font-semibold text-red-600">{problem}</p>}
    </div>
  );
}
