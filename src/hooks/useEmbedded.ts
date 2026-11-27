'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;

/** True when the site is shown inside the admin panel's storefront frame. */
export const useEmbedded = () => useSyncExternalStore(subscribe, () => window.self !== window.top, () => false);
