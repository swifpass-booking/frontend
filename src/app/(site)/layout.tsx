import TravellerProviders from '@/components/layout/TravellerProviders';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <TravellerProviders>{children}</TravellerProviders>;
}
