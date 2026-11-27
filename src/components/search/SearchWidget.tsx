'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { fetchCities } from '@/api/rest';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { FormField } from '@/components/shared/FormField';
import { SearchIcon } from '@/components/icons';
import { ModeChips } from './ModeChips';
import { useAsync } from '@/hooks/useAsync';
import { isVenueMode } from '@/lib/offers';
import { cn } from '@/lib/utils';
import type { SearchCriteria, TravelMode } from '@/types/domain';

interface SearchWidgetProps {
  initial?: Partial<SearchCriteria>;
  onSearch: (criteria: SearchCriteria) => void;
  compact?: boolean;
  /** No card of its own: it sits inside another card (the home page's combined search). */
  bare?: boolean;
  /** Only the mode chips show until one is picked; picking it reveals the fields, picking it again hides them. */
  collapsible?: boolean;
}

const COUNTS = [1, 2, 3, 4, 5, 6];

/** A city dropdown: the From / To / City fields differ only in label and placeholder. */
function CityField({ label, empty, value, cities, onChange }: { label: string; empty: string; value: string; cities: string[]; onChange: (v: string) => void }) {
  return (
    <FormField label={label}>
      <NativeSelect value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{empty}</option>
        {cities.map((c) => <option key={c} value={c}>{c}</option>)}
      </NativeSelect>
    </FormField>
  );
}

export default function SearchWidget({ initial, onSearch, compact = false, bare = false, collapsible = false }: SearchWidgetProps) {
  const [mode, setMode] = useState<TravelMode>(initial?.mode || 'air');
  const [from, setFrom] = useState(initial?.from || '');
  const [to, setTo] = useState(initial?.to || '');
  const [city, setCity] = useState(initial?.city || '');
  const [date, setDate] = useState(initial?.date || new Date().toISOString().slice(0, 10));
  const [passengers, setPassengers] = useState(initial?.passengers || 1);
  const [fieldsOpen, setFieldsOpen] = useState(!collapsible);

  const { data: loaded } = useAsync(() => fetchCities(mode).catch(() => [] as string[]), [mode]);
  // Keep values set by the voice assistant selectable even before/without the city list loading.
  const cities = useMemo(() => [...new Set([...(loaded ?? []), from, to, city].filter(Boolean))], [loaded, from, to, city]);

  function pickMode(key: TravelMode) {
    if (collapsible && key === mode && fieldsOpen) return setFieldsOpen(false);
    setFieldsOpen(true);
    if (key === mode) return;
    setMode(key);
    setFrom('');
    setTo('');
    setCity('');
  }

  const venue = isVenueMode(mode);
  const stay = mode === 'hotel' || mode === 'resort';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSearch({ mode, from, to, city, date, passengers });
  };

  return (
    <div className={bare ? '' : compact ? 'rounded-xl bg-white p-3 shadow-card ring-1 ring-navy-900/5' : 'rounded-2xl bg-white p-4 shadow-popover sm:p-6'}>
      <ModeChips
        value={mode}
        onPick={pickMode}
        highlight={fieldsOpen}
        outlined={collapsible}
        className={cn(collapsible ? `mt-4 justify-center ${fieldsOpen ? 'mb-4 border-b border-slate-100 pb-4' : ''}` : 'mb-4 border-b border-slate-100 pb-3')}
      />

      {fieldsOpen && (
        <form onSubmit={submit} className={cn('grid animate-[composerIn_0.2s_ease-out] gap-3', venue ? 'sm:grid-cols-[1.4fr_1fr_1fr_auto]' : 'sm:grid-cols-[1.2fr_1.2fr_1fr_0.8fr_auto]')}>
          {venue ? (
            <CityField label={stay ? 'Destination' : 'City / venue'} empty="Anywhere" value={city} cities={cities} onChange={setCity} />
          ) : (
            <>
              <CityField label="From" empty="Any origin" value={from} cities={cities} onChange={setFrom} />
              <CityField label="To" empty="Any destination" value={to} cities={cities} onChange={setTo} />
            </>
          )}
          <FormField label={stay ? 'Check-in' : 'Date'}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
          <FormField label={mode === 'hall' ? 'Guests' : stay ? 'Rooms' : 'Travellers'}>
            <NativeSelect value={passengers} onChange={(e) => setPassengers(Number(e.target.value))}>
              {COUNTS.map((n) => <option key={n} value={n}>{n} {n === 1 ? 'traveller' : 'travellers'}</option>)}
            </NativeSelect>
          </FormField>
          <Button type="submit" variant="brand" className="h-10 rounded-xl px-6 sm:mt-[22px]">
            <SearchIcon className="size-4" width={16} height={16} />
            Search
          </Button>
        </form>
      )}
    </div>
  );
}
