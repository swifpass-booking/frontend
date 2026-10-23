import type { TravelMode } from '../types/domain';

export const MODES: { key: TravelMode; label: string }[] = [
  { key: 'air', label: 'Flights' },
  { key: 'bus', label: 'Buses' },
  { key: 'rail', label: 'Trains' },
  { key: 'event', label: 'Events' },
  { key: 'hotel', label: 'Hotels' },
  { key: 'resort', label: 'Resorts' },
  { key: 'hall', label: 'Event halls' },
];

export const MODE_LABEL: Record<TravelMode, string> = {
  air: 'Flights',
  bus: 'Buses',
  rail: 'Trains',
  event: 'Events',
  hotel: 'Hotels',
  resort: 'Resorts',
  hall: 'Event halls',
};

/** Modes booked at a single place ("city") rather than between two places. */
export const isVenueMode = (mode: TravelMode) => mode !== 'air' && mode !== 'bus' && mode !== 'rail';

/** Modes with no vehicle to follow on a map. */
export const isStayMode = (mode: TravelMode) => mode === 'hotel' || mode === 'resort' || mode === 'hall';
