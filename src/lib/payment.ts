import type { PaymentGateway } from '../api/rest';
import type { BookingDraft } from '../types/domain';

const KEY = 'swiftpass-pending-checkout';

/** What the traveller entered, kept across the gateway redirect so the confirmation page can be rebuilt. */
export function savePendingCheckout(draft: Omit<BookingDraft, 'tickets' | 'reference'> & { reference: string }) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft));
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

/** Send the browser to eSewa (auto-submitted form POST) or Khalti (plain redirect). */
export function redirectToGateway(g: PaymentGateway) {
  if (g.method === 'GET') {
    window.location.assign(g.url);
    return;
  }
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = g.url;
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
