import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getTracking, type Tracking } from '../../api/rest';

const POLL_MS = 5000;

const dot = (color: string, size = 14) =>
  L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
  });

const vehicleIcon = (heading: number | null) =>
  L.divIcon({
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `<span style="display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#1a56db;border:3px solid #fff;box-shadow:0 0 0 6px rgba(26,86,219,.25),0 2px 6px rgba(0,0,0,.4)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" style="transform:rotate(${heading ?? 0}deg)"><path d="M12 2l7 18-7-4-7 4z"/></svg></span>`,
  });

const STATUS_LABEL: Record<Tracking['status'], string> = {
  not_started: 'Not departed yet',
  en_route: 'On the way',
  arrived: 'Arrived',
};

function eta(min: number | null): string {
  if (min == null) return '—';
  if (min < 1) return 'now';
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
}

interface LiveMapProps {
  occurrenceId: string;
  height?: number;
  onClose?: () => void;
}

/** Live position of a bus/train/flight on an OpenStreetMap map, refreshed every few seconds. */
export default function LiveMap({ occurrenceId, height = 320, onClose }: LiveMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<{ vehicle?: L.Marker; done?: L.Polyline; todo?: L.Polyline }>({});
  const fitted = useRef(false);
  const [data, setData] = useState<Tracking | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { zoomControl: true, attributionControl: true }).setView([28.0, 84.5], 7);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      layers.current = {};
      fitted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      getTracking(occurrenceId)
        .then((d) => {
          if (cancelled) return;
          setData(d);
          setError(null);
        })
        .catch((e: Error) => !cancelled && setError(e.message));
    load();
    const id = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [occurrenceId]);

  useEffect(() => {
    const m = map.current;
    if (!m || !data) return;
    const o: L.LatLngTuple = [data.origin.lat, data.origin.lng];
    const d: L.LatLngTuple = [data.destination.lat, data.destination.lng];
    const p: L.LatLngTuple = [data.position.lat, data.position.lng];

    if (!fitted.current) {
      L.marker(o, { icon: dot('#16a34a') }).addTo(m).bindTooltip(data.origin.city, { permanent: true, direction: 'top', offset: [0, -8] });
      L.marker(d, { icon: dot('#dc2626') }).addTo(m).bindTooltip(data.destination.city, { permanent: true, direction: 'top', offset: [0, -8] });
      m.fitBounds(L.latLngBounds(data.route).pad(0.15));
      fitted.current = true;
    }
    layers.current.todo?.remove();
    layers.current.done?.remove();
    // Route vertices are evenly spaced by distance, so progress maps straight onto an index.
    const idx = Math.min(data.route.length - 1, Math.max(0, Math.round(data.progress * (data.route.length - 1))));
    const done: L.LatLngTuple[] = [...data.route.slice(0, idx + 1), p];
    const todo: L.LatLngTuple[] = [p, ...data.route.slice(idx + 1)];
    layers.current.todo = L.polyline(todo, { color: '#94a3b8', weight: 4, dashArray: data.routeSource === 'road' ? undefined : '8 8' }).addTo(m);
    layers.current.done = L.polyline(done, { color: '#1a56db', weight: 5 }).addTo(m);
    if (layers.current.vehicle) {
      layers.current.vehicle.setLatLng(p).setIcon(vehicleIcon(data.position.heading));
    } else {
      layers.current.vehicle = L.marker(p, { icon: vehicleIcon(data.position.heading), zIndexOffset: 1000 }).addTo(m);
    }
  }, [data]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-navy-950">{data?.title ?? 'Live location'}</p>
          <p className="text-xs text-slate-500">
            {data ? `${STATUS_LABEL[data.status]} · ${Math.round(data.progress * 100)}% of ${data.totalKm} km${data.routeSource === 'road' ? ' by road' : ''}` : error ?? 'Locating…'}
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-full px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100" aria-label="Close map">
            Close
          </button>
        )}
      </div>

      <div ref={el} style={{ height }} className="relative z-0 w-full bg-slate-100" />

      {data && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-xs">
          <span className="font-semibold text-navy-950">
            {data.status === 'arrived' ? 'Arrived' : `Arrives in ${eta(data.etaMinutes)}`}
            {data.position.speedKmh ? ` · ${Math.round(data.position.speedKmh)} km/h` : ''}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 font-bold ${data.position.source === 'gps' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
            title={data.position.source === 'gps' ? 'Reported by the vehicle tracker' : 'No GPS fix from the operator — position estimated from the timetable'}
          >
            {data.position.source === 'gps' ? 'Live GPS' : 'Estimated from timetable'}
          </span>
        </div>
      )}
    </div>
  );
}
