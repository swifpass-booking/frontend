'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const MyLocation = dynamic(() => import('./MyLocationImpl'), { ssr: false, loading: () => <Skeleton className="h-80" /> });
export default MyLocation;
