import type { TravelMode } from '../types/domain';

export const MODES: { key: TravelMode; label: string }[] = [
  { key: 'air', label: 'Flights' },
  { key: 'bus', label: 'Buses' },
  { key: 'rail', label: 'Trains' },
  { key: 'event', label: 'Events' },
];
