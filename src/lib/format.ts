import type { Money } from '../types/domain';

export function formatMoney({ amount, currency }: Money): string {
  const major = amount / 100;
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency,
    maximumFractionDigits: major % 1 === 0 ? 0 : 2,
  }).format(major);
}

// Every trip and event is in Nepal: show Nepal's clock, not the visitor's browser's (a London visitor would see 05:15 for an 11:00 flight).
const TIME_ZONE = 'Asia/Kathmandu';

export function formatTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TIME_ZONE });
}

export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: TIME_ZONE });
}

export function formatDuration(mins: number | null | undefined): string | null {
  if (mins == null) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m ? `${m}m` : ''}`.trim() : `${m}m`;
}
