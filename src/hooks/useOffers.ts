'use client';

import { searchOffersApi } from '@/api/rest';
import { useAsync } from './useAsync';
import type { SearchCriteria } from '@/types/domain';

/** Offers for a search: shared by the results page and the planner's in-chat results. */
export function useOffers(criteria: SearchCriteria) {
  const { data, error, loading } = useAsync(() => searchOffersApi(criteria), [JSON.stringify(criteria)]);
  return { offers: data ?? [], error, loading };
}
