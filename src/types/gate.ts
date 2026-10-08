import type { TravelMode } from './domain';

export interface GateOccurrence {
  id: string;
  mode: TravelMode;
  title: string;
  providerName: string;
  departsAt: string;
}

export interface ScanCounts {
  issued: number;
  redeemed: number;
  void: number;
}

export interface ScanEvent {
  accepted: boolean;
  passengerName: string | null;
  tripTitle?: string;
  message?: string;
  scannedBy?: string;
  decidedAt: string;
  gate: string;
}

export type RejectReason = 'unknown_code' | 'wrong_occurrence' | 'revoked' | 'already_redeemed';

export interface ScanVerdict {
  accepted: boolean;
  reason: RejectReason | null;
  passengerName: string | null;
  message: string;
}
