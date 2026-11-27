'use client';

import { useEffect, useState, type DependencyList } from 'react';

interface AsyncState<T> { data: T | null; error: string | null; loading: boolean }

/** Run an async loader whenever `deps` change. A stale answer from an earlier run is ignored, so fast typing or navigation never shows old data. */
export function useAsync<T>(load: () => Promise<T>, deps: DependencyList, enabled = true): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: enabled });
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setState((s) => ({ ...s, error: null, loading: true }));
    load()
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((e: Error) => !cancelled && setState({ data: null, error: e.message || 'Something went wrong.', loading: false }));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled]);
  return state;
}
