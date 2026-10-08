import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { fetchCities } from '../../api/rest';
import { MODES } from '../../lib/offers';
import VoiceOrb, { phaseLabel } from '../agent/VoiceOrb';
import { useVoice } from '../../context/VoiceContext';
import { ModeIcon, SearchIcon, CalendarIcon, UsersIcon, MapPinIcon } from '../icons';
import type { SearchCriteria, TravelMode } from '../../types/domain';

interface SearchWidgetProps {
  initial?: Partial<SearchCriteria>;
  onSearch: (criteria: SearchCriteria) => void;
  compact?: boolean;
}

export default function SearchWidget({ initial, onSearch, compact = false }: SearchWidgetProps) {
  const [mode, setMode] = useState<TravelMode>(initial?.mode || 'air');
  const [from, setFrom] = useState(initial?.from || '');
  const [to, setTo] = useState(initial?.to || '');
  const [city, setCity] = useState(initial?.city || '');
  const [date, setDate] = useState(initial?.date || new Date().toISOString().slice(0, 10));
  const [passengers, setPassengers] = useState(initial?.passengers || 1);

  const { phase, active } = useVoice();
  const [loaded, setLoaded] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchCities(mode)
      .then((c) => !cancelled && setLoaded(c))
      .catch(() => !cancelled && setLoaded([]));
    return () => {
      cancelled = true;
    };
  }, [mode]);
  // Keep values set by the voice assistant selectable even before/without the city list loading.
  const cities = useMemo(() => [...new Set([...loaded, from, to, city].filter(Boolean))].map((c) => ({ city: c })), [loaded, from, to, city]);
  const isEvent = mode === 'event';

  function submit(e: FormEvent) {
    e.preventDefault();
    onSearch({ mode, from, to, city, date, passengers });
  }

  return (
    <div className={compact ? 'rounded-xl bg-white p-3 shadow-card ring-1 ring-navy-900/5' : 'rounded-2xl bg-white p-4 shadow-popover sm:p-6'}>
      <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-3 mb-4">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => {
              setMode(m.key);
              setFrom('');
              setTo('');
              setCity('');
            }}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              mode === m.key ? 'bg-navy-950 text-white' : 'text-navy-700 hover:bg-slate-100'
            }`}
          >
            <ModeIcon mode={m.key} className="h-4 w-4" width={16} height={16} />
            {m.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className={`grid gap-3 ${isEvent ? 'sm:grid-cols-[1.4fr_1fr_1fr_auto]' : 'sm:grid-cols-[1.2fr_1.2fr_1fr_0.8fr_auto]'}`}>
        {isEvent ? (
          <Field label="City / venue" icon={MapPinIcon}>
            <select value={city} onChange={(e) => setCity(e.target.value)} className="field-input">
              <option value="">Anywhere</option>
              {cities.map((c) => (
                <option key={c.city} value={c.city}>
                  {c.city}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <>
            <Field label="From" icon={MapPinIcon}>
              <select value={from} onChange={(e) => setFrom(e.target.value)} className="field-input">
                <option value="">Any origin</option>
                {cities.map((c) => (
                  <option key={c.city} value={c.city}>
                    {c.city}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="To" icon={MapPinIcon}>
              <select value={to} onChange={(e) => setTo(e.target.value)} className="field-input">
                <option value="">Any destination</option>
                {cities.map((c) => (
                  <option key={c.city} value={c.city}>
                    {c.city}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}

        <Field label="Date" icon={CalendarIcon}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field-input" />
        </Field>

        <Field label="Travellers" icon={UsersIcon}>
          <select value={passengers} onChange={(e) => setPassengers(Number(e.target.value))} className="field-input">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'traveller' : 'travellers'}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex items-center gap-2 sm:mt-[22px]">
          <div className="flex flex-col items-center">
            <VoiceOrb />
            {active && <span className="mt-0.5 text-[10px] font-semibold text-navy-700/70">{phaseLabel(phase)}</span>}
          </div>
          <button
            type="submit"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-blue px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
          >
            <SearchIcon className="h-4 w-4" width={16} height={16} />
            Search
          </button>
        </div>
      </form>
    </div>
  );
}

interface FieldProps {
  label: string;
  icon: (props: { className?: string; width?: number; height?: number }) => JSX.Element;
  children: ReactNode;
}

function Field({ label, icon: Icon, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-navy-700/70">
        <Icon className="h-3.5 w-3.5" width={14} height={14} />
        {label}
      </span>
      {children}
    </label>
  );
}
