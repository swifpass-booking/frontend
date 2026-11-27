'use client';

import { useEffect, useRef, useState } from 'react';
import { PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CloseIcon } from '@/components/icons';
import { InlineMessage } from '@/components/shared/InlineMessage';
import { Orb } from '@/components/agent/Orb';
import ChatComposer from '@/components/agent/ChatComposer';
import SearchResults from '@/components/agent/SearchResults';
import CartCard from '@/components/agent/CartCard';
import ChatSidebar from '@/components/agent/ChatSidebar';
import LiveMap from '@/components/map/LiveMap';
import MyLocation from '@/components/map/MyLocation';
import { useVoice } from '@/context/VoiceContext';
import { useTrip } from '@/context/TripContext';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  'Plan a 3-day trip from Kathmandu to Pokhara under NPR 40,000',
  'Find a lake-view hotel in Pokhara for this weekend',
  'I need a hall for a wedding reception with 300 guests in Kathmandu',
  'Weekend jungle safari in Chitwan — resort and bus tickets',
];

/** The agent's answer or the traveller's words, as a chat bubble. */
function Message({ role, children }: { role: 'user' | 'assistant'; children: React.ReactNode }) {
  const user = role === 'user';
  return (
    <div className={cn('flex', user ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[85%] whitespace-pre-wrap text-[15px] leading-relaxed', user ? 'rounded-3xl bg-slate-100 px-5 py-2.5 text-navy-950' : 'text-slate-800')}>{children}</div>
    </div>
  );
}

export default function PlannerView() {
  const { log, phase, active, cartId, trackId, closeTrack, showMe, closeMe, error, supported, start, stop, send, holdOffer, guestKey, reviewInCheckout, dismissCart } = useVoice();
  const { voiceStart } = useTrip();
  const [draft, setDraft] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  const endRef = useRef<HTMLDivElement>(null);
  const busy = phase === 'thinking' || phase === 'transcribing';
  const empty = log.length === 0;
  const listening = active && phase === 'listening';
  const cartEntry = log.reduce((n, e, i) => (e.cartId && e.cartId === cartId ? i : n), -1); // the message the live cart belongs to
  const lastSearch = log.reduce((n, e, i) => (e.search ? i : n), -1); // only the newest search shows cards

  useEffect(() => {
    if (voiceStart) start();
    return stop; // leaving the page must not leave the mic open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [log, cartId, phase]);

  const cart = <CartCard cartId={cartId ?? ''} guestKey={guestKey()} onReview={reviewInCheckout} onDismiss={dismissCart} />;
  const composer = (
    <ChatComposer draft={draft} onDraft={setDraft} onSubmit={send} listening={listening} onMic={start} onStop={stop} supported={supported} busy={busy} />
  );
  // Live voice session (listening aside): the orb sits above a "Type" field, and the blue X ends the session.
  const dock = active && !listening && (
    <div className="flex animate-[composerIn_0.25s_ease-out] flex-col items-center gap-4 pb-4">
      <Orb phase={phase} size={96} />
      <div className="flex w-full items-center gap-2 rounded-full bg-slate-100 py-2 pl-5 pr-2 ring-1 ring-slate-200">
        <form onSubmit={(e) => { e.preventDefault(); if (draft.trim() && !busy) { send(draft.trim()); setDraft(''); } }} className="min-w-0 flex-1">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type" className="w-full bg-transparent text-[15px] text-navy-950 placeholder:text-slate-400 focus:outline-none" />
        </form>
        <Button variant="brand" size="icon" onClick={stop} aria-label="End voice"><CloseIcon width={18} height={18} /></Button>
      </div>
    </div>
  );

  return (
    <div className="relative flex h-[calc(100dvh-57px)] bg-white text-navy-950">
      {sidebarOpen && (
        <>
          {/* Phones: the sidebar slides over the chat, tapping outside closes it. */}
          <div className="fixed inset-0 z-30 bg-navy-950/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-40 pt-[57px] lg:static lg:z-auto lg:pt-0"><ChatSidebar onClose={() => setSidebarOpen(false)} /></div>
        </>
      )}

      <div className="relative flex min-w-0 flex-1 flex-col">
        {!sidebarOpen && <Button variant="ghost" size="icon-sm" onClick={() => setSidebarOpen(true)} aria-label="Show chats" title="Show chats" className="absolute left-3 top-3 z-10 rounded-lg"><PanelLeft className="size-5" /></Button>}

        {empty ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 pb-24">
            <Orb phase={phase} size={72} />
            <h1 className="mb-8 mt-8 text-center text-3xl font-medium text-navy-950">Where to next?</h1>
            <div className="w-full max-w-2xl">{composer}</div>
            <div className="mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => <Button key={s} variant="outline" onClick={() => send(s)} className="h-auto rounded-full px-4 py-2 font-normal text-slate-600">{s}</Button>)}
            </div>
            {error && <InlineMessage tone="error" className="mt-4">{error}</InlineMessage>}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4">
              <div className="mx-auto max-w-3xl space-y-5 py-6">
                {log.map((entry, i) => (
                  <div key={i} className="space-y-3">
                    <Message role={entry.role}>{entry.text}</Message>
                    {i === lastSearch && entry.search && <SearchResults criteria={entry.search} onPick={holdOffer} />}
                    {i === cartEntry && cartId && cart}
                  </div>
                ))}
                {busy && (
                  <div className="flex items-center gap-1.5 py-1" aria-label="Thinking">
                    {[0, 0.18, 0.36].map((d) => <span key={d} className="voice-dot block size-2 rounded-full bg-slate-400" style={{ animationDelay: `${d}s` }} />)}
                  </div>
                )}
                {error && <InlineMessage tone="error">{error}</InlineMessage>}
                {cartId && cartEntry < 0 && cart}
                {showMe && <MyLocation onClose={closeMe} />}
                {trackId && <div className="rounded-2xl border border-slate-200 p-2"><LiveMap occurrenceId={trackId} onClose={closeTrack} /></div>}
                <div ref={endRef} />
              </div>
            </div>
            <Separator className="opacity-0" />
            <div className="mx-auto w-full max-w-3xl px-4 pb-5">{dock || composer}</div>
          </>
        )}
      </div>
    </div>
  );
}
