import QRCode from 'qrcode';
import type { Ticket } from '@/types/domain';

export interface TicketMeta {
  title: string;
  providerName: string;
  date: string | null;
  time: string | null;
  reference: string;
}

/** Renders one ticket (details + QR) to a PNG data URL for download. */
async function ticketToDataUrl(ticket: Ticket, meta: TicketMeta): Promise<string> {
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
  const ctx = canvas.getContext('2d')!;

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
  if (ticket.seatLabel) {
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('SEAT', 260, 172);
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#0A1730';
    ctx.fillText(ticket.seatLabel, 260, 194);
  }

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

export function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}


/** Save one PNG per ticket. */
export async function downloadTickets(tickets: Ticket[], meta: TicketMeta) {
  for (const t of tickets) {
    const safeName = t.passengerName.trim().toLowerCase().replace(/\s+/g, '-') || 'traveller';
    triggerDownload(await ticketToDataUrl(t, meta), `swiftpass-${meta.reference}-${safeName}.png`);
  }
}
