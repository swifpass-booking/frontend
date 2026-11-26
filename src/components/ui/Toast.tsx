import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

type Kind = 'success' | 'error' | 'info';
interface ToastItem { id: number; kind: Kind; title: string; body?: string }
type Notify = (kind: Kind, title: string, body?: string) => void;

const ToastContext = createContext<Notify>(() => undefined);
export const useToast = () => useContext(ToastContext);

const STYLE: Record<Kind, string> = {
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  info: 'bg-brand-blue',
};

/** Small corner notifications. Any screen calls `useToast()(kind, title, body)`; each one clears itself after 6 s. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(0);
  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const notify = useCallback<Notify>((kind, title, body) => {
    const id = ++next.current;
    setItems((l) => [...l, { id, kind, title, body }]);
    window.setTimeout(() => dismiss(id), 6000);
  }, [dismiss]);
  const value = useMemo(() => notify, [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} role="status" className="pointer-events-auto flex animate-[composerIn_0.25s_ease-out] items-start gap-3 rounded-2xl bg-white p-3.5 shadow-popover ring-1 ring-slate-200">
            <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${STYLE[t.kind]}`}>{t.kind === 'success' ? '✓' : t.kind === 'error' ? '!' : 'i'}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-navy-950">{t.title}</p>
              {t.body && <p className="mt-0.5 text-sm text-slate-600">{t.body}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-slate-400 hover:text-navy-950">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
