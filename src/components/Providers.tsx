'use client';

import { AuthProvider } from '@/context/AuthContext';
import { AuthDialogProvider } from '@/components/auth/AuthDialog';
import { Toaster } from '@/components/ui/sonner';

/** Everything every page may rely on. Booking-journey and voice state are added by the traveller layout. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthDialogProvider>
        {children}
        <Toaster />
      </AuthDialogProvider>
    </AuthProvider>
  );
}
