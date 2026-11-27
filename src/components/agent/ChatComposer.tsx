'use client';

import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/shared/Spinner';
import { CloseIcon, MicIcon, SendIcon } from '@/components/icons';
import Wave from './Wave';
import { cn } from '@/lib/utils';

interface ChatComposerProps {
  draft: string;
  onDraft: (v: string) => void;
  onSubmit: (text: string) => void;
  /** The mic is open and hearing the traveller: the field turns into a live level meter. */
  listening: boolean;
  /** Tap the mic to start; the cancel / stop buttons end the session. */
  onMic: () => void;
  onStop: () => void;
  supported: boolean;
  busy?: boolean;
  placeholder?: string;
  /** Replaces the input with a line of text (e.g. "Understanding…") while voice is working. */
  status?: string;
  className?: string;
}

const RING = 'rounded-full bg-slate-100 ring-1 ring-slate-200';

/** The one message bar for the whole app (home page and planner): type + send, mic, and the listening meter. */
export default function ChatComposer({ draft, onDraft, onSubmit, listening, onMic, onStop, supported, busy = false, placeholder = 'Where do you want to go?', status, className }: ChatComposerProps) {
  if (listening) {
    return (
      <div className={cn('flex animate-[composerIn_0.2s_ease-out] items-center gap-2 p-2', RING, className)}>
        <Button variant="outline" size="icon" onClick={onStop} aria-label="Cancel" className="border-0 shadow-sm"><CloseIcon width={18} height={18} /></Button>
        <Wave />
        <Button variant="outline" size="icon" onClick={onStop} aria-label="Stop listening" className="border-0 shadow-sm"><span className="block size-3.5 rounded-[3px] bg-navy-950" /></Button>
      </div>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (draft.trim() && !busy) {
      onSubmit(draft.trim());
      onDraft('');
    }
  };

  return (
    <form onSubmit={submit} className={cn('flex items-center gap-2 py-2 pl-5 pr-2', RING, className)}>
      {status ? (
        <p className="min-w-0 flex-1 truncate text-[15px] text-slate-500" aria-live="polite">{status}</p>
      ) : (
        <input value={draft} onChange={(e) => onDraft(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-[15px] text-navy-950 placeholder:text-slate-400 focus:outline-none" />
      )}
      {supported && <Button type="button" variant="ghost" size="icon" onClick={onMic} aria-label="Speak"><MicIcon className="size-5" width={20} height={20} /></Button>}
      <Button size="icon" disabled={!draft.trim() || busy || !!status} aria-label="Send">
        {busy ? <Spinner /> : <SendIcon className="size-5" width={20} height={20} />}
      </Button>
    </form>
  );
}
