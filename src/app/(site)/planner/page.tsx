'use client';

import dynamic from 'next/dynamic';

// The chat restores itself from the browser's storage, so it only renders on the client.
const PlannerView = dynamic(() => import('@/views/PlannerView'), { ssr: false });

export default function Page() {
  return <PlannerView />;
}
