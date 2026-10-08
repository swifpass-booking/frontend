import mock from './mock-data.json';
import type { Money, Offer, Place, SearchCriteria, TravelMode, Zone } from '../types/domain';

interface RawPlace {
  id: string;
  kind: Place['kind'];
  code: string | null;
  name: string;
  nameNe: string | null;
  city: string;
  country: string;
  timezone: string;
}

interface RawProvider {
  id: string;
  displayName: string;
  isSelfServe: boolean;
}

interface RawService {
  id: string;
  providerId: string;
  mode: TravelMode;
  code: string | null;
  title: string;
  originPlaceId: string | null;
  destPlaceId: string | null;
  venuePlaceId: string | null;
  attributes: Record<string, unknown>;
}

interface RawOccurrence {
  id: string;
  serviceId: string;
  mode: TravelMode;
  departsAt: string;
  arrivesAt: string | null;
  status: string;
  basePriceMinor: number;
  capacity: number;
  seatsSold: number;
}

interface RawZone {
  id: string;
  occurrenceId: string;
  code: string;
  label: string;
  priceMinor: number;
  capacity: number;
  isReservedSeating: boolean;
}

function byId<T extends { id: string }>(list: T[]): Record<string, T> {
  return Object.fromEntries(list.map((x) => [x.id, x]));
}

const places = byId(mock.places as RawPlace[]);
const providers = byId(mock.providers as RawProvider[]);
const services = byId(mock.services as RawService[]);

const zonesByOccurrence = (mock.inventoryZones as RawZone[]).reduce<Record<string, RawZone[]>>((acc, z) => {
  (acc[z.occurrenceId] ||= []).push(z);
  return acc;
}, {});

function minutesBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
}

function money(minor: number): Money {
  return { amount: minor, currency: 'NPR' };
}

export const MODES: { key: TravelMode; label: string }[] = [
  { key: 'air', label: 'Flights' },
  { key: 'bus', label: 'Buses' },
  { key: 'rail', label: 'Trains' },
  { key: 'event', label: 'Events' },
];

/** Build one Offer per occurrence, joining service/provider/place/zone data. */
export const OFFERS: Offer[] = (mock.occurrences as RawOccurrence[]).map((occ) => {
  const service = services[occ.serviceId];
  const provider = providers[service.providerId];
  const origin = service.originPlaceId ? places[service.originPlaceId] : null;
  const destination = service.destPlaceId ? places[service.destPlaceId] : null;
  const venue = service.venuePlaceId ? places[service.venuePlaceId] : null;
  const rawZones = zonesByOccurrence[occ.id] || [];
  const zones: Zone[] = rawZones.map((z) => ({
    id: z.id,
    code: z.code,
    label: z.label,
    price: money(z.priceMinor),
    seatsAvailable: z.capacity,
    isReservedSeating: z.isReservedSeating,
  }));

  return {
    offerId: `off_${occ.id}`,
    occurrenceId: occ.id,
    mode: occ.mode,
    title: service.title,
    code: service.code,
    provider: { id: provider.id, displayName: provider.displayName, isSelfServe: provider.isSelfServe },
    origin,
    destination,
    venue,
    departsAt: occ.departsAt,
    arrivesAt: occ.arrivesAt,
    durationMinutes: minutesBetween(occ.departsAt, occ.arrivesAt),
    price: money(occ.basePriceMinor),
    fees: money(Math.round(occ.basePriceMinor * 0.02)),
    seatsAvailable: occ.capacity - occ.seatsSold,
    capacity: occ.capacity,
    hasReservedSeating: zones.some((z) => z.isReservedSeating),
    zones: zones.length
      ? zones
      : [
          {
            id: `${occ.id}_ga`,
            code: 'GA',
            label: 'General',
            price: money(occ.basePriceMinor),
            seatsAvailable: occ.capacity - occ.seatsSold,
            isReservedSeating: false,
          },
        ],
    attributes: service.attributes || {},
    status: occ.status,
  };
});

/** Distinct city options per mode, for the search widget's From/To/Where pickers. */
export function citiesForMode(mode: TravelMode): Place[] {
  const relevant = OFFERS.filter((o) => o.mode === mode);
  const set = new Map<string, Place>();
  relevant.forEach((o) => {
    [o.origin, o.destination, o.venue].forEach((p) => {
      if (p) set.set(p.city, p);
    });
  });
  return [...set.values()];
}

export function searchOffers({ mode, from, to, city }: SearchCriteria): Offer[] {
  return OFFERS.filter((o) => {
    if (mode && o.mode !== mode) return false;
    if (mode === 'event') {
      if (city && o.venue?.city !== city) return false;
      return true;
    }
    if (from && o.origin?.city !== from) return false;
    if (to && o.destination?.city !== to) return false;
    return true;
  }).sort((a, b) => new Date(a.departsAt).getTime() - new Date(b.departsAt).getTime());
}

export function getOffer(offerId: string): Offer | null {
  return OFFERS.find((o) => o.offerId === offerId) || null;
}
