'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Leaflet needs the browser's window, so the map only loads on the client.
const LiveMap = dynamic(() => import('./LiveMapImpl'), { ssr: false, loading: () => <Skeleton className="h-80" /> });
export default LiveMap;
