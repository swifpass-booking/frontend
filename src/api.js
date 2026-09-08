/** Thin fetch wrapper for the real (non-mock) backend endpoints: auth, bookings, admin. */
async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/v1${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || 'Something went wrong. Try again.');
  }
  return json;
}

export const createBooking = (payload, token) => request('/bookings', { method: 'POST', body: payload, token });

export const adminStats = (token) => request('/admin/stats', { token });
export const adminUsers = (token) => request('/admin/users', { token });
export const adminOccurrences = (token) => request('/admin/occurrences', { token });
export const adminBookings = (token) => request('/admin/bookings', { token });

export const scanRedeem = (code, occurrenceId, gate, token) =>
  request('/scan/redeem', { method: 'POST', body: { code, occurrenceId, gate }, token });

export const scanStats = (occurrenceId, token) =>
  request(`/scan/stats?occurrenceId=${encodeURIComponent(occurrenceId)}`, { token });
