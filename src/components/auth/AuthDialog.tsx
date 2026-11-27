'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Logo } from '@/components/shared/Logo';
import { CredentialsForm } from './CredentialsForm';

type Mode = 'login' | 'register';
const AuthDialogContext = createContext<() => void>(() => undefined);

/** Call `useSignIn()()` from anywhere to open the sign-in dialog. */
export const useSignIn = () => useContext(AuthDialogContext);

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('login');
  return (
    <AuthDialogContext.Provider value={() => setOpen(true)}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <Logo href={null} className="mb-1 text-base" size={36} />
            <DialogTitle>{mode === 'login' ? 'Sign in to Swiftpass' : 'Create your account'}</DialogTitle>
            <DialogDescription>Manage bookings and speed up checkout</DialogDescription>
          </DialogHeader>
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="mb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="register">Create account</TabsTrigger>
            </TabsList>
          </Tabs>
          <CredentialsForm key={mode} mode={mode} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </AuthDialogContext.Provider>
  );
}
