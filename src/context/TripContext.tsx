'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { BookingDraft, Offer, SearchCriteria, SeatPick } from '@/types/domain';

interface Trip {
  criteria: SearchCriteria | null;
  offer: Offer | null;
  passengers: number;
  seats: SeatPick[];
  zoneId: string;
  booking: BookingDraft | null;
  /** The planner was opened from a mic button: it should begin listening. */
  voiceStart: boolean;
}

interface TripApi extends Trip {
  search: (c: SearchCriteria) => void;
  select: (offer: Offer, passengers?: number, seats?: SeatPick[], zoneId?: string) => void;
  confirm: (booking: BookingDraft) => void;
  openPlanner: (voice?: boolean) => void;
  reset: () => void;
}

const EMPTY: Trip = { criteria: null, offer: null, passengers: 1, seats: [], zoneId: '', booking: null, voiceStart: false };
const TripContext = createContext<TripApi | null>(null);

/** The booking journey (search → offer → checkout → confirmation) lives here; every page reads it and moves with these verbs. */
export function TripProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [trip, setTrip] = useState<Trip>(EMPTY);
  const go = useCallback((path: string) => {
    router.push(path);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [router]);

  const api = useMemo<TripApi>(() => ({
    ...trip,
    search: (c) => { setTrip((t) => ({ ...t, criteria: c, passengers: c.passengers || 1 })); go('/results'); },
    select: (offer, passengers, seats, zoneId) => { setTrip((t) => ({ ...t, offer, seats: seats ?? [], zoneId: zoneId ?? '', passengers: passengers ?? t.passengers })); go('/checkout'); },
    confirm: (booking) => { setTrip((t) => ({ ...t, booking })); go('/confirmation'); },
    openPlanner: (voice = false) => { setTrip((t) => ({ ...t, voiceStart: voice })); go('/planner'); },
    reset: () => setTrip(EMPTY),
  }), [trip, go]);

  return <TripContext.Provider value={api}>{children}</TripContext.Provider>;
}

export function useTrip(): TripApi {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrip must be used inside <TripProvider>');
  return ctx;
}
