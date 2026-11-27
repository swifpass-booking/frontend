'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchFeatured } from '@/api/rest';
import SearchWidget from '@/components/search/SearchWidget';
import ChatComposer from '@/components/agent/ChatComposer';
import { Orb } from '@/components/agent/Orb';
import { FeatureCard } from '@/components/home/FeatureCard';
import { FeaturedOffer } from '@/components/home/FeaturedOffer';
import { PageContainer } from '@/components/shared/PageContainer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckIcon, ClockIcon, ShieldIcon } from '@/components/icons';
import { useAsync } from '@/hooks/useAsync';
import { useVoice } from '@/context/VoiceContext';
import { useTrip } from '@/context/TripContext';

const PROMPTS = [
  'Plan a 3-day trip from Kathmandu to Pokhara under NPR 40,000',
  'Find a lake-view hotel in Pokhara this weekend',
  'Weekend jungle safari in Chitwan',
];

const HIGHLIGHTS = [
  { icon: ShieldIcon, title: 'Tamper-proof tickets', body: 'Every QR is server-signed and device-bound — screenshots and reshares are rejected at the gate.' },
  { icon: ClockIcon, title: 'Under 2-second gate scans', body: 'Offline-capable validation, even when the venue has no signal.' },
  { icon: CheckIcon, title: 'One checkout, every leg', body: 'Flights, buses, hotels, resorts, event halls and tickets — one booking, one QR per guest.' },
];

export default function HomeView() {
  const { search, openPlanner } = useTrip();
  const { send, start, stop, startOver, supported, phase, log } = useVoice();
  const { data: featured } = useAsync(() => fetchFeatured().catch(() => []), []);
  const [draft, setDraft] = useState('');
  const [homeVoice, setHomeVoice] = useState(false); // the mic was tapped here, so the first sentence is taken on this screen
  const spoke = homeVoice && log.some((e) => e.role === 'user');

  // The planner page is where the conversation lives: begin a fresh chat there with what was asked here.
  function plan(text: string) {
    startOver();
    send(text);
    openPlanner();
  }
  function toggleMic() {
    if (homeVoice) {
      stop();
      setHomeVoice(false);
      return;
    }
    startOver();
    setHomeVoice(true);
    start();
  }
  // The sentence was heard: carry the live conversation over to the planner, mic still open.
  useEffect(() => {
    if (spoke) openPlanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spoke]);
  // Leaving before anything was said must not leave the mic open.
  const stillListening = useRef(false);
  stillListening.current = homeVoice && !spoke;
  useEffect(() => () => { if (stillListening.current) stop(); }, [stop]);

  const hearing = homeVoice && (phase === 'listening' || phase === 'idle');
  const understanding = homeVoice && (phase === 'transcribing' || phase === 'thinking');

  return (
    <>
      <section className="bg-white">
        <PageContainer width="lg" className="flex flex-col items-center pb-14 pt-12 sm:pt-16">
          <Orb phase={homeVoice ? phase : 'idle'} size={64} />
          <h1 className="mb-7 mt-6 text-center text-3xl font-medium text-navy-950 sm:text-4xl">Where to next?</h1>

          {/* Suggestions float above the box. */}
          <div className="mb-5 flex flex-wrap justify-center gap-2.5">
            {PROMPTS.map((t, i) => (
              <Button key={t} variant="outline" onClick={() => plan(t)} style={{ animation: `floaty ${5 + i * 0.7}s ease-in-out ${i * 0.5}s infinite` }} className="float-chip h-auto rounded-full px-4 py-2 font-normal text-slate-600 shadow-sm">
                {t}
              </Button>
            ))}
          </div>

          {/* One search: ask in words or by voice, or pick a kind of trip right under the box to reveal the exact fields. */}
          <Card className="w-full rounded-[28px] p-3 sm:p-5">
            <ChatComposer
              draft={draft}
              onDraft={setDraft}
              onSubmit={plan}
              listening={homeVoice && hearing}
              onMic={toggleMic}
              onStop={toggleMic}
              supported={supported}
              placeholder="Ask the AI planner: flights, buses, hotels, events…"
              status={homeVoice ? (understanding ? 'Understanding…' : 'Connecting…') : undefined}
            />
            <SearchWidget bare collapsible onSearch={search} />
          </Card>
        </PageContainer>
      </section>

      <PageContainer width="full" className="py-12">
        <div className="grid gap-4 sm:grid-cols-3">{HIGHLIGHTS.map((h) => <FeatureCard key={h.title} {...h} />)}</div>
      </PageContainer>

      {!!featured?.length && (
        <PageContainer width="full" className="pb-16 pt-0">
          <div className="mb-5">
            <h2 className="text-xl font-extrabold text-navy-950">Coming up</h2>
            <p className="text-sm text-slate-500">Upcoming departures and events</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{featured.map((o) => <FeaturedOffer key={o.offerId} offer={o} onSearch={search} />)}</div>
        </PageContainer>
      )}
    </>
  );
}
