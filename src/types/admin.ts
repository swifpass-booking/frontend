import type { Money, TravelMode } from './domain';

export interface AdminBookingRow {
  bookingId: string;
  reference: string;
  mode: TravelMode;
  title: string;
  passengers: { fullName: string }[];
  contact: { phoneE164: string; email?: string };
  payment: { method: string };
  total: Money;
  status: string;
  createdAt: string;
}

export interface AdminOccurrenceRow {
  id: string;
  mode: TravelMode;
  title: string;
  departsAt: string;
  providerName: string;
  seatsSold: number;
  capacity: number;
  status: string;
}

export interface AdminUserRow {
  id: string;
  fullName: string;
  email?: string;
  phoneE164?: string;
  role: string;
  bookingCount: number;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalBookings: number;
  totalRevenue: Money;
  upcomingOccurrences: number;
  bookingsByMode: { mode: TravelMode; count: number }[];
  recentBookings: AdminBookingRow[];
}

export interface AdminDashboardData {
  stats: AdminStats;
  bookings: AdminBookingRow[];
  occurrences: AdminOccurrenceRow[];
  users: AdminUserRow[];
}
