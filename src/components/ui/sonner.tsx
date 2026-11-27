'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';

/** The app's single toast outlet. Call `toast.success(...)` from 'sonner' anywhere. */
export const Toaster = (props: ToasterProps) => (
  <Sonner position="top-right" richColors closeButton duration={6000} toastOptions={{ classNames: { toast: '!rounded-2xl !shadow-popover' } }} {...props} />
);
