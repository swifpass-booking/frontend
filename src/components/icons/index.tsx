// Small inline SVG icon set — no external icon package needed.
import type { SVGProps } from 'react';
import type { TravelMode } from '../../types/domain';

type IconProps = SVGProps<SVGSVGElement>;

const base: IconProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function PlaneIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M10.5 20.5l1.5-4.5-7-2.5 1-2 8 1 3.5-6.5c.4-.7 1.4-.9 2.1-.4.5.4.7 1.1.4 1.7L16.5 14.5l1 8-2-1-2-4-3 3v0z" />
    </svg>
  );
}
export function BusIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <rect x="4" y="4" width="16" height="12" rx="2" />
      <path d="M4 12h16M8 16v2M16 16v2" />
      <circle cx="8" cy="18.5" r="1.2" />
      <circle cx="16" cy="18.5" r="1.2" />
    </svg>
  );
}
export function TrainIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <rect x="6" y="3" width="12" height="14" rx="3" />
      <path d="M6 12h12M9 17l-2 4M15 17l2 4" />
      <circle cx="9.5" cy="8.5" r="0.6" fill="currentColor" />
      <circle cx="14.5" cy="8.5" r="0.6" fill="currentColor" />
    </svg>
  );
}
export function TicketIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M3 9a2 2 0 002-2V6a1 1 0 011-1h12a1 1 0 011 1v1a2 2 0 000 4v1a2 2 0 000 4v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-1a2 2 0 002-2" />
      <path d="M9 5v14" strokeDasharray="2.5 2.5" />
    </svg>
  );
}
export function SearchIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
export function CalendarIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}
export function UsersIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 8a3 3 0 110-6M14 14c2.7 0 6 1.6 6 4.5V20" />
    </svg>
  );
}
export function CheckIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
export function ChevronRightIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
export function ShieldIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
export function ClockIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}
export function MapPinIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M12 21s7-6.6 7-11.5A7 7 0 105 9.5C5 14.4 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  );
}
export function MenuIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
export function CloseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0014 0M12 18v3M9 21h6" />
    </svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M4 12l16-8-6 8 6 8-16-8z" />
    </svg>
  );
}

const MODE_ICONS: Record<TravelMode, (props: IconProps) => JSX.Element> = {
  air: PlaneIcon,
  bus: BusIcon,
  rail: TrainIcon,
  event: TicketIcon,
};

export function ModeIcon({ mode, ...props }: { mode: TravelMode } & IconProps) {
  const Cmp = MODE_ICONS[mode] || TicketIcon;
  return <Cmp {...props} />;
}

export function MicOffIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M9 9v2a3 3 0 005.1 2.1M15 9.3V6a3 3 0 00-5.9-.8M5 11a7 7 0 0011.2 5.6M19 11a7 7 0 01-.6 2.8M12 18v3M9 21h6M3 3l18 18" />
    </svg>
  );
}
