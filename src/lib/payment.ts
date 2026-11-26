import type { PaymentGateway } from '../api/rest';
import type { BookingDraft } from '../types/domain';

const KEY = 'swiftpass-pending-checkout';

/** What the traveller entered, kept across the gateway redirect so the confirmation page can be rebuilt. */
export function savePendingCheckout(draft: Omit<BookingDraft, 'tickets' | 'reference'> & { reference: string }) {
  try {
    // Passport numbers are never kept in the browser across the redirect; the server holds them.
    const { passports: _passports, ...safe } = draft;
    sessionStorage.setItem(KEY, JSON.stringify(safe));
  } catch {
    /* storage unavailable — confirmation falls back to server data */
  }
}

export function takePendingCheckout(): (Omit<BookingDraft, 'tickets'> & { reference: string }) | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Only https gateways (or this site's own dev simulator) may receive the browser. */
function safeGatewayUrl(raw: string): string {
  const u = new URL(raw, window.location.origin);
  const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  if (u.protocol === 'https:' || u.origin === window.location.origin || (local && u.protocol === 'http:')) return u.toString();
  throw new Error('Payment gateway address was rejected.');
}

/** Send the browser to eSewa (auto-submitted form POST) or Khalti (plain redirect). */
export function redirectToGateway(g: PaymentGateway) {
  const url = safeGatewayUrl(g.url);
  if (g.method === 'GET') {
    window.location.assign(url);
    return;
  }
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = url;
  Object.entries(g.fields ?? {}).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}
