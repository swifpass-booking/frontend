import { useEffect, useMemo, useRef } from 'react';
import QRCode from 'qrcode';
import { formatMoney, formatTime, formatDate } from './data.js';
import { CheckIcon, ModeIcon } from './icons.jsx';

function reference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'SWP-';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/** A real, scannable QR encoding the server-issued ticket credential. */
function TicketQr({ code }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && code) {
      QRCode.toCanvas(canvasRef.current, code, {
        width: 160,
        margin: 1,
        color: { dark: '#0A1730', light: '#FFFFFF' },
      });
    }
  }, [code]);

  return <canvas ref={canvasRef} className="rounded-lg shadow-sm ring-1 ring-slate-200" />;
}

/** Renders one ticket (details + QR) to a PNG data URL for download. */
async function ticketToDataUrl(ticket, meta) {
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, ticket.code, {
    width: 200,
    margin: 1,
    color: { dark: '#0A1730', light: '#FFFFFF' },
  });

  const W = 640;
  const H = 300;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#0A1730';
  ctx.fillRect(0, 0, W, 64);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Swiftpass', 24, 30);
  ctx.font = '13px sans-serif';
  ctx.fillText(meta.providerName, 24, 50);

  ctx.fillStyle = '#0A1730';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(meta.title, 24, 104);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText(`${meta.date} · ${meta.time}`, 24, 128);

  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('PASSENGER', 24, 172);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#0A1730';
  ctx.fillText(ticket.passengerName, 24, 194);

  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('REFERENCE', 24, 232);
  ctx.font = '16px monospace';
  ctx.fillStyle = '#0A1730';
  ctx.fillText(meta.reference, 24, 254);

  ctx.strokeStyle = '#E2E8F0';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(410, 16);
  ctx.lineTo(410, H - 16);
  ctx.stroke();

  ctx.drawImage(qrCanvas, 440, 50, 180, 180);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.textAlign = 'center';
  ctx.fillText('Show this at the gate', 530, 254);
  ctx.textAlign = 'left';

  return canvas.toDataURL('image/png');
}

function triggerDownload(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function Confirmation({ booking, onDone }) {
  const fallbackRef = useMemo(reference, []);
  const ref = booking?.reference || fallbackRef;

  if (!booking) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="font-bold text-navy-950">No booking to show</p>
        <button onClick={onDone} className="mt-3 text-sm font-semibold text-brand-blue hover:underline">
          Back to home
        </button>
      </div>
    );
  }

  const { offer, names, total, tickets } = booking;

  async function handleDownload() {
    if (!tickets?.length) return;
    const meta = {
      title: offer.title,
      providerName: offer.provider.displayName,
      date: formatDate(offer.departsAt),
      time: formatTime(offer.departsAt),
      reference: ref,
    };
    for (const t of tickets) {
      const dataUrl = await ticketToDataUrl(t, meta);
      const safeName = t.passengerName.trim().toLowerCase().replace(/\s+/g, '-') || 'traveller';
      triggerDownload(dataUrl, `swiftpass-${ref}-${safeName}.png`);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckIcon className="h-7 w-7" width={28} height={28} />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold text-navy-950">Booking confirmed</h1>
        <p className="mt-1 text-sm text-slate-500">
          Reference <span className="font-mono font-bold text-navy-950">{ref}</span> · sent to your phone
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex items-center gap-3 bg-navy-950 px-5 py-4 text-white">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/10">
            <ModeIcon mode={offer.mode} className="h-4.5 w-4.5" width={18} height={18} />
          </span>
          <div>
            <p className="text-sm font-bold">{offer.title}</p>
            <p className="text-xs text-navy-100/70">{offer.provider.displayName}</p>
          </div>
        </div>

        <div className="grid gap-6 p-5 sm:grid-cols-[1fr_auto] sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Date</p>
                <p className="font-bold text-navy-950">{formatDate(offer.departsAt)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Time</p>
                <p className="font-bold text-navy-950">{formatTime(offer.departsAt)}</p>
              </div>
              {offer.origin && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">From</p>
                  <p className="font-bold text-navy-950">{offer.origin.name}</p>
                </div>
              )}
              {offer.destination && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">To</p>
                  <p className="font-bold text-navy-950">{offer.destination.name}</p>
                </div>
              )}
              {offer.venue && (
                <div className="col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Venue</p>
                  <p className="font-bold text-navy-950">{offer.venue.name}, {offer.venue.city}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Travellers</p>
              <ul className="mt-1 space-y-0.5">
                {names.map((n, i) => (
                  <li key={i} className="text-sm font-medium text-navy-950">
                    {n || `Traveller ${i + 1}`}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-4">
              <span className="text-sm font-bold text-navy-950">Total paid</span>
              <span className="text-lg font-extrabold text-navy-950">{formatMoney(total)}</span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 rounded-xl bg-slate-50 p-4">
            {tickets?.length ? (
              tickets.map((t) => (
                <div key={t.ticketId} className="flex flex-col items-center gap-1.5">
                  <TicketQr code={t.code} />
                  <p className="text-center text-xs font-bold text-navy-950">{t.passengerName}</p>
                  <p className="text-center text-[11px] text-slate-400">Show this at the gate</p>
                </div>
              ))
            ) : (
              <p className="max-w-[10rem] text-center text-xs text-slate-400">
                Ticket QR unavailable for this booking.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={onDone}
          className="rounded-xl bg-brand-blue px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
        >
          Book another trip
        </button>
        <button
          onClick={handleDownload}
          disabled={!tickets?.length}
          className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-bold text-navy-950 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Download ticket
        </button>
      </div>
    </div>
  );
}
