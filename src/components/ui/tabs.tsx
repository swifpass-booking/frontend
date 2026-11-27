'use client';

import * as React from 'react';
import { Tabs as TabsPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;
const TabsList = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List className={cn('inline-flex items-center gap-1 rounded-full bg-slate-100 p-1', className)} {...props} />
);
const TabsTrigger = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) => (
  <TabsPrimitive.Trigger className={cn('rounded-full px-4 py-1.5 text-sm font-semibold text-slate-500 transition hover:text-navy-950 data-[state=active]:bg-white data-[state=active]:text-navy-950 data-[state=active]:shadow-sm', className)} {...props} />
);
const TabsContent = TabsPrimitive.Content;

export { Tabs, TabsList, TabsTrigger, TabsContent };
