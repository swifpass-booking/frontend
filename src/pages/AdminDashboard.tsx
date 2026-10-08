import { useEffect, useState, type SVGProps } from 'react';
import { adminBookings, adminOccurrences, adminStats, adminUsers } from '../api/rest';
import { formatMoney, formatDate, formatTime } from '../lib/format';
import { ModeIcon, UsersIcon, TicketIcon, CalendarIcon, ClockIcon, MapPinIcon } from '../components/icons';
import LiveMap from '../components/map/LiveMap';
import type { AuthUser } from '../types/auth';
import type { AdminBookingRow, AdminDashboardData, AdminOccurrenceRow, AdminUserRow } from '../types/admin';
import type { TravelMode } from '../types/domain';

const MODE_LABEL: Record<TravelMode, string> = { air: 'Flights', bus: 'Buses', rail: 'Trains', event: 'Events' };

const OCCURRENCE_STATUS_STYLE: Record<string, string> = {
  scheduled: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-slate-100 text-slate-600',
};

const BOOKING_STATUS_STYLE: Record<string, string> = {
  pending_payment: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-slate-100 text-slate-600',
};

const PAYMENT_METHOD_LABEL: Record<string, string> = { esewa: 'eSewa', khalti: 'Khalti', fonepay: 'FonePay', card: 'Card' };

interface StatTileProps {
  icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
  label: string;
  value: string | number;
  sub?: string;
}

function StatTile({ icon: Icon, label, value, sub }: StatTileProps) {
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

function BookingsByMode({ rows }: { rows: { mode: TravelMode; count: number }[] }) {
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
              <div className="h-full rounded-full bg-brand-blue" style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
            <span className="w-6 shrink-0 text-right text-sm font-bold text-navy-950">{r.count}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function RecentBookings({ rows }: { rows: AdminBookingRow[] }) {
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

function BookingsTable({ rows }: { rows: AdminBookingRow[] }) {
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
                  <td className="py-2.5 pr-4 text-slate-600">{b.passengers.map((p) => p.fullName).join(', ')}</td>
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

function OccurrencesTable({ rows }: { rows: AdminOccurrenceRow[] }) {
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

function UsersTable({ rows }: { rows: AdminUserRow[] }) {
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

type Section = 'overview' | 'bookings' | 'trips' | 'users' | 'fleet';

const SECTIONS: { key: Section; label: string; icon: (props: SVGProps<SVGSVGElement>) => JSX.Element }[] = [
  { key: 'overview', label: 'Overview', icon: ClockIcon },
  { key: 'bookings', label: 'Bookings', icon: TicketIcon },
  { key: 'trips', label: 'Trips & events', icon: CalendarIcon },
  { key: 'fleet', label: 'Live fleet', icon: MapPinIcon },
  { key: 'users', label: 'Users', icon: UsersIcon },
];

function FleetView({ rows }: { rows: AdminOccurrenceRow[] }) {
  const vehicles = rows.filter((o) => o.mode !== 'event' && o.status === 'scheduled');
  const [selected, setSelected] = useState<string | null>(vehicles[0]?.id ?? null);
  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-card">
        <h2 className="px-2 pb-2 pt-1 text-base font-extrabold text-navy-950">Vehicles</h2>
        {vehicles.length === 0 && <p className="px-2 py-3 text-sm text-slate-400">No scheduled vehicles.</p>}
        <div className="flex max-h-[28rem] flex-col gap-1 overflow-y-auto">
          {vehicles.map((o) => (
            <button
              key={o.id}
              onClick={() => setSelected(o.id)}
              className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${selected === o.id ? 'bg-brand-blue/10' : 'hover:bg-slate-50'}`}
            >
              <ModeIcon mode={o.mode} className="h-4 w-4 shrink-0 text-navy-800" width={16} height={16} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-navy-950">{o.title}</span>
                <span className="block text-xs text-slate-400">
                  {formatDate(o.departsAt)} · {formatTime(o.departsAt)} · {o.providerName}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>
      <div>{selected ? <LiveMap key={selected} occurrenceId={selected} height={440} /> : <p className="text-sm text-slate-400">Select a vehicle.</p>}</div>
    </div>
  );
}

interface AdminAppProps {
  user: AuthUser;
  token: string | null;
  onSignOut: () => void;
}

/** The admin's own app: sidebar dashboard, separate from the traveller booking site. */
export default function AdminApp({ user, token, onSignOut }: AdminAppProps) {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<Section>('overview');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([adminStats(token), adminBookings(token), adminOccurrences(token), adminUsers(token)])
      .then(([stats, bookings, occurrences, users]) => {
        if (cancelled) return;
        setData({ stats, bookings: bookings.bookings, occurrences: occurrences.occurrences, users: users.users });
      })
      .catch((err) => !cancelled && setError((err as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const title = SECTIONS.find((s) => s.key === section)?.label ?? '';

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-navy-950">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-navy-950 p-4 text-white md:flex">
        <div className="mb-8 flex items-center gap-2 px-2 pt-1 text-lg font-extrabold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-blue">
            <TicketIcon className="h-4 w-4" width={18} height={18} />
          </span>
          Swiftpass <span className="text-xs font-semibold text-brand-amber">Admin</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${
                section === key ? 'bg-white/10 text-white' : 'text-navy-100/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" width={16} height={16} />
              {label}
            </button>
          ))}
        </nav>
        <div className="border-t border-white/10 pt-3">
          <p className="truncate px-2 text-sm font-semibold">{user.fullName}</p>
          <p className="truncate px-2 text-xs text-navy-100/60">{user.email || user.phoneE164}</p>
          <button onClick={onSignOut} className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-navy-100/80 hover:bg-white/10 hover:text-white">
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <span className="font-extrabold">Swiftpass Admin</span>
          <button onClick={onSignOut} className="text-sm font-semibold text-brand-blue">
            Sign out
          </button>
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:hidden">
          {SECTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${section === key ? 'bg-navy-950 text-white' : 'text-slate-600'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <h1 className="mb-6 text-xl font-extrabold text-navy-950">{title}</h1>

          {loading && <p className="text-sm text-slate-400">Loading…</p>}
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

          {data && section === 'overview' && (
            <div className="flex flex-col gap-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile icon={UsersIcon} label="Users" value={data.stats.totalUsers} />
                <StatTile icon={TicketIcon} label="Bookings" value={data.stats.totalBookings} />
                <StatTile icon={ClockIcon} label="Revenue" value={formatMoney(data.stats.totalRevenue)} sub="confirmed bookings" />
                <StatTile icon={CalendarIcon} label="Upcoming departures" value={data.stats.upcomingOccurrences} />
              </div>
              <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <BookingsByMode rows={data.stats.bookingsByMode} />
                <RecentBookings rows={data.stats.recentBookings} />
              </div>
            </div>
          )}
          {data && section === 'bookings' && <BookingsTable rows={data.bookings} />}
          {data && section === 'trips' && <OccurrencesTable rows={data.occurrences} />}
          {data && section === 'fleet' && <FleetView rows={data.occurrences} />}
          {data && section === 'users' && <UsersTable rows={data.users} />}
        </main>
      </div>
    </div>
  );
}
