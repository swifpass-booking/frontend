'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { locate } from '@/lib/geolocate';

const youIcon = L.divIcon({
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: '<span style="display:block;width:18px;height:18px;border-radius:50%;background:#0b63e5;border:3px solid #fff;box-shadow:0 0 0 8px rgba(11,99,229,.22),0 1px 4px rgba(0,0,0,.4)"></span>',
});

/** "Where am I": the traveller's position on an OpenStreetMap map. */
export default function MyLocation({ onClose }: { onClose: () => void }) {
  const el = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Finding you…');

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current).setView([28.0, 84.5], 6);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(m);
    locate(
      (p, acc) => {
        L.circle(p, { radius: acc, color: '#0b63e5', weight: 1, fillOpacity: 0.08 }).addTo(m);
        L.marker(p, { icon: youIcon }).addTo(m).bindTooltip('You are here', { permanent: true, direction: 'top', offset: [0, -10] });
        m.setView(p, 14);
        setStatus(`${p[0].toFixed(4)}, ${p[1].toFixed(4)} · accurate to about ${Math.round(acc)} m`);
      },
      setStatus,
    );
    return () => void m.remove();
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-navy-950">Your location</p>
          <p className="text-xs text-slate-500">{status}</p>
        </div>
        <button onClick={onClose} className="rounded-full px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100" aria-label="Close map">
          Close
        </button>
      </div>
      <div ref={el} style={{ height: 320 }} className="relative z-0 w-full bg-slate-100" />
    </div>
  );
}
