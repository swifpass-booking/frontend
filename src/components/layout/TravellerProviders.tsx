'use client';

import { RoleGate } from '@/components/auth/RoleGate';
import { TripProvider, useTrip } from '@/context/TripContext';
import { VoiceProvider } from '@/context/VoiceContext';
import { useAuth } from '@/context/AuthContext';
import SiteShell from './SiteShell';

/** Voice state needs a way to open the checkout for an offer the agent held; that verb comes from the booking journey. */
function VoiceBridge({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const { select } = useTrip();
  return <VoiceProvider token={token} onReviewOffer={select}>{children}</VoiceProvider>;
}

/** Everything the traveller site shares: role redirects, the booking journey, the voice assistant, and the nav/footer shell. */
export default function TravellerProviders({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate>
      <TripProvider>
        <VoiceBridge>
          <SiteShell>{children}</SiteShell>
        </VoiceBridge>
      </TripProvider>
    </RoleGate>
  );
}
