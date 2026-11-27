'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;

/** A URL query parameter, read on the client only (the page itself is exported statically). */
export const useQueryParam = (name: string) => useSyncExternalStore(subscribe, () => new URLSearchParams(window.location.search).get(name) ?? '', () => '');
