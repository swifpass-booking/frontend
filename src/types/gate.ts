export interface ScanCounts {
  issued: number;
  redeemed: number;
  void: number;
}

export interface ScanEvent {
  accepted: boolean;
  passengerName: string | null;
  tripTitle?: string;
  zoneLabel?: string | null;
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
  /** Count-based zone the ticket was bought in (VIP...); null for the standard fare. */
  zoneLabel?: string | null;
  message: string;
}
