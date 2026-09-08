import { useEffect, useState } from 'react';
import { adminBookings, adminOccurrences, adminStats, adminUsers } from './api.js';
import { formatMoney, formatDate, formatTime } from './data.js';
import { ModeIcon, UsersIcon, TicketIcon, CalendarIcon, ClockIcon } from './icons.jsx';

const MODE_LABEL = { air: 'Flights', bus: 'Buses', rail: 'Trains', event: 'Events' };

const OCCURRENCE_STATUS_STYLE = {
  scheduled: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-slate-100 text-slate-600',
};

const BOOKING_STATUS_STYLE = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-slate-100 text-slate-600',
};

const PAYMENT_METHOD_LABEL = { esewa: 'eSewa', khalti: 'Khalti', fonepay: 'FonePay', card: 'Card' };

function StatTile({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="h-4 w-4" width={16} height={16} />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-extrabold text-navy-950">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function BookingsByMode({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="mb-4 text-base font-extrabold text-navy-950">Bookings by mode</h2>
      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.mode} className="flex items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-navy-950/5 text-navy-800">
              <ModeIcon mode={r.mode} className="h-4 w-4" width={16} height={16} />
            </span>
            <span className="w-16 shrink-0 text-sm font-semibold text-navy-950">{MODE_LABEL[r.mode]}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-blue"
                style={{ width: `${(r.count / max) * 100}%` }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-sm font-bold text-navy-950">{r.count}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function RecentBookings({ rows }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="mb-4 text-base font-extrabold text-navy-950">Recent bookings</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">No bookings yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-slate-100">
          {rows.map((b) => (
            <div key={b.bookingId} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-navy-950/5 text-navy-800">
                <ModeIcon mode={b.mode} className="h-4 w-4" width={16} height={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-navy-950">{b.title}</p>
                <p className="truncate text-xs text-slate-400">
                  {b.reference} · {b.passengers.length} pax · {b.contact.phoneE164}
                </p>
              </div>
              <span className="shrink-0 text-sm font-bold text-navy-950">{formatMoney(b.total)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function BookingsTable({ rows }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="mb-4 text-base font-extrabold text-navy-950">All bookings</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">No bookings yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="pb-2 pr-4">Reference</th>
                <th className="pb-2 pr-4">Trip</th>
                <th className="pb-2 pr-4">Traveller(s)</th>
                <th className="pb-2 pr-4">Contact</th>
                <th className="pb-2 pr-4">Payment</th>
                <th className="pb-2 pr-4">Total</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2">Booked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((b) => (
                <tr key={b.bookingId}>
                  <td className="py-2.5 pr-4 font-mono text-xs font-bold text-navy-950">{b.reference}</td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <ModeIcon mode={b.mode} className="h-4 w-4 text-navy-800" width={16} height={16} />
                      <span className="font-semibold text-navy-950">{b.title}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 text-slate-600">
                    {b.passengers.map((p) => p.fullName).join(', ')}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-600">
                    <div>{b.contact.phoneE164}</div>
                    {b.contact.email && <div className="text-xs text-slate-400">{b.contact.email}</div>}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-600">
                    {PAYMENT_METHOD_LABEL[b.payment.method] || b.payment.method}
                  </td>
                  <td className="py-2.5 pr-4 font-bold text-navy-950">{formatMoney(b.total)}</td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${BOOKING_STATUS_STYLE[b.status] || 'bg-slate-100 text-slate-600'}`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-600">
                    {formatDate(b.createdAt)} · {formatTime(b.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function OccurrencesTable({ rows }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="mb-4 text-base font-extrabold text-navy-950">Occurrences</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="pb-2 pr-4">Title</th>
              <th className="pb-2 pr-4">Departs</th>
              <th className="pb-2 pr-4">Provider</th>
              <th className="pb-2 pr-4">Seats</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((o) => (
              <tr key={o.id}>
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    <ModeIcon mode={o.mode} className="h-4 w-4 text-navy-800" width={16} height={16} />
                    <span className="font-semibold text-navy-950">{o.title}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-4 text-slate-600">
                  {formatDate(o.departsAt)} · {formatTime(o.departsAt)}
                </td>
                <td className="py-2.5 pr-4 text-slate-600">{o.providerName}</td>
                <td className="py-2.5 pr-4 text-slate-600">
                  {o.seatsSold}/{o.capacity}
                </td>
                <td className="py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${OCCURRENCE_STATUS_STYLE[o.status] || 'bg-slate-100 text-slate-600'}`}
                  >
                    {o.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UsersTable({ rows }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="mb-4 text-base font-extrabold text-navy-950">Users</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Contact</th>
              <th className="pb-2 pr-4">Role</th>
              <th className="pb-2 pr-4">Bookings</th>
              <th className="pb-2">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((u) => (
              <tr key={u.id}>
                <td className="py-2.5 pr-4 font-semibold text-navy-950">{u.fullName}</td>
                <td className="py-2.5 pr-4 text-slate-600">{u.email || u.phoneE164}</td>
                <td className="py-2.5 pr-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.role === 'admin' ? 'bg-brand-blue/10 text-brand-blue' : 'bg-slate-100 text-slate-600'}`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-slate-600">{u.bookingCount}</td>
                <td className="py-2.5 text-slate-600">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function AdminDashboard({ user, token, onBack, onSignIn }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([adminStats(token), adminBookings(token), adminOccurrences(token), adminUsers(token)])
      .then(([stats, bookings, occurrences, users]) => {
        if (cancelled) return;
        setData({ stats, bookings: bookings.bookings, occurrences: occurrences.occurrences, users: users.users });
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isAdmin, token]);

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-lg font-extrabold text-navy-950">Admin access required</p>
        <p className="mt-2 text-sm text-slate-500">
          {user ? "Your account doesn't have admin access." : 'Sign in with an admin account to view this page.'}
        </p>
        <button
          onClick={user ? onBack : onSignIn}
          className="mt-5 rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
        >
          {user ? 'Back to booking site' : 'Sign in'}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="border-b border-navy-800 bg-navy-950 px-4 py-2.5 sm:px-6">
        <button onClick={onBack} className="text-sm font-semibold text-navy-100/80 hover:text-white">
          ← Back to booking site
        </button>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-xl font-extrabold text-navy-950">Admin dashboard</h1>

        {loading && <p className="text-sm text-slate-400">Loading…</p>}
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

        {data && (
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile icon={UsersIcon} label="Users" value={data.stats.totalUsers} />
              <StatTile icon={TicketIcon} label="Bookings" value={data.stats.totalBookings} />
              <StatTile
                icon={ClockIcon}
                label="Revenue"
                value={formatMoney(data.stats.totalRevenue)}
                sub="confirmed bookings"
              />
              <StatTile
                icon={CalendarIcon}
                label="Upcoming departures"
                value={data.stats.upcomingOccurrences}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              <BookingsByMode rows={data.stats.bookingsByMode} />
              <RecentBookings rows={data.stats.recentBookings} />
            </div>

            <BookingsTable rows={data.bookings} />
            <OccurrencesTable rows={data.occurrences} />
            <UsersTable rows={data.users} />
          </div>
        )}
      </div>
    </div>
  );
}
