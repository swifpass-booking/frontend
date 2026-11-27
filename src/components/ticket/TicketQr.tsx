'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

/** A real, scannable QR encoding the server-issued ticket credential. */
export function TicketQr({ code }: { code: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current && code) QRCode.toCanvas(ref.current, code, { width: 160, margin: 1, color: { dark: '#0A1730', light: '#FFFFFF' } });
  }, [code]);
  return <canvas ref={ref} className="rounded-lg shadow-sm ring-1 ring-slate-200" />;
}
