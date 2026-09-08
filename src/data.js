import mock from './mock-data.json';

const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));

const places = byId(mock.places);
const providers = byId(mock.providers);
const services = byId(mock.services);

const zonesByOccurrence = mock.inventoryZones.reduce((acc, z) => {
  (acc[z.occurrenceId] ||= []).push(z);
  return acc;
}, {});

function minutesBetween(a, b) {
  if (!a || !b) return null;
  return Math.round((new Date(b) - new Date(a)) / 60000);
}

function money(minor) {
  return { amount: minor, currency: 'NPR' };
}

export const MODES = [
  { key: 'air', label: 'Flights', icon: 'plane' },
  { key: 'bus', label: 'Buses', icon: 'bus' },
  { key: 'rail', label: 'Trains', icon: 'train' },
  { key: 'event', label: 'Events', icon: 'ticket' },
];

/** Build one Offer per occurrence, joining service/provider/place/zone data. */
export const OFFERS = mock.occurrences.map((occ) => {
  const service = services[occ.serviceId];
  const provider = providers[service.providerId];
  const origin = service.originPlaceId ? places[service.originPlaceId] : null;
  const destination = service.destPlaceId ? places[service.destPlaceId] : null;
  const venue = service.venuePlaceId ? places[service.venuePlaceId] : null;
  const zones = (zonesByOccurrence[occ.id] || []).map((z) => ({
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
    zones: zones.length ? zones : [{ id: `${occ.id}_ga`, code: 'GA', label: 'General', price: money(occ.basePriceMinor), seatsAvailable: occ.capacity - occ.seatsSold, isReservedSeating: false }],
    attributes: service.attributes || {},
    status: occ.status,
  };
});

export function formatMoney({ amount, currency }) {
  const major = amount / 100;
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency,
    maximumFractionDigits: major % 1 === 0 ? 0 : 2,
  }).format(major);
}

export function formatTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatDuration(mins) {
  if (mins == null) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m ? `${m}m` : ''}`.trim() : `${m}m`;
}

/** Distinct city options per mode, for the search widget's From/To/Where pickers. */
export function citiesForMode(mode) {
  const relevant = OFFERS.filter((o) => o.mode === mode);
  const set = new Map();
  relevant.forEach((o) => {
    [o.origin, o.destination, o.venue].forEach((p) => {
      if (p) set.set(p.city, p);
    });
  });
  return [...set.values()];
}

export function searchOffers({ mode, from, to, city }) {
  return OFFERS.filter((o) => {
    if (mode && o.mode !== mode) return false;
    if (mode === 'event') {
      if (city && o.venue?.city !== city) return false;
      return true;
    }
    if (from && o.origin?.city !== from) return false;
    if (to && o.destination?.city !== to) return false;
    return true;
  }).sort((a, b) => new Date(a.departsAt) - new Date(b.departsAt));
}

export function getOffer(offerId) {
  return OFFERS.find((o) => o.offerId === offerId) || null;
}
