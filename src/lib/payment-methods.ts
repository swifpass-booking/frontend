import type { PaymentMethod } from '@/types/domain';

// The demo card form only works against a backend started with DEMO_INSTANT_PAYMENT (see docker-compose.yml).
export const DEMO_CARD = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_DEMO_CARD === '1';

export const PAYMENT_LABEL: Record<PaymentMethod, string> = { esewa: 'eSewa', khalti: 'Khalti', fonepay: 'FonePay', stripe: 'Stripe', card: 'Card' };

/** Gateways that take the browser to the provider's own page and back. */
export const GATEWAY_METHODS: PaymentMethod[] = ['esewa', 'khalti', 'fonepay', 'stripe'];
export const PAYMENT_METHODS: PaymentMethod[] = [...GATEWAY_METHODS, ...(DEMO_CARD ? (['card'] as const) : [])];

