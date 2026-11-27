'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, PanelLeft, Search, SquarePen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { useVoice } from '@/context/VoiceContext';
import { useSignIn } from '@/components/auth/AuthDialog';
import { cn } from '@/lib/utils';

/** Left rail of the AI planner: start a chat, search the past ones, reopen or delete them. */
export default function ChatSidebar({ onClose }: { onClose: () => void }) {
  const { chats, activeChatId, log, startOver, openChat, deleteChat } = useVoice();
  const { user } = useAuth();
  const signIn = useSignIn();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [recentsOpen, setRecentsOpen] = useState(true);

  const closeSearch = () => { setSearching(false); setQuery(''); };
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? chats.filter((c) => c.title.toLowerCase().includes(q)) : chats;
  }, [chats, query]);
  const initials = user?.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-50 text-navy-950">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <span className="text-xl font-bold tracking-tight">AI planner</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Search chats" aria-pressed={searching} className={cn('rounded-lg', searching && 'bg-slate-200/70 text-navy-950')} onClick={() => (searching ? closeSearch() : setSearching(true))}><Search className="size-[18px]" /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Hide sidebar" title="Hide sidebar" className="rounded-lg" onClick={onClose}><PanelLeft className="size-[18px]" /></Button>
        </div>
      </div>

      <div className="px-3 pb-1">
        {searching && <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && closeSearch()} placeholder="Search chats" className="mb-1 rounded-xl bg-white" />}
        <Button variant="ghost" onClick={startOver} disabled={log.length === 0} className="w-full justify-start gap-3 rounded-xl px-3 text-[15px] font-medium text-navy-950 hover:bg-slate-200/60 disabled:bg-transparent disabled:text-slate-400">
          <SquarePen className="size-[18px]" /> New chat
        </Button>
      </div>

      <button onClick={() => setRecentsOpen((v) => !v)} aria-expanded={recentsOpen} className="flex items-center gap-1.5 px-5 pb-1 pt-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600">
        Recents <ChevronDown className={cn('size-3.5 transition', !recentsOpen && '-rotate-90')} />
      </button>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {recentsOpen && (shown.length === 0 ? (
          <p className="px-3 py-3 text-sm text-slate-400">{query ? 'No chats match.' : 'Your conversations will show up here.'}</p>
        ) : shown.map((c) => (
          <div key={c.id} className={cn('group flex items-center rounded-lg', c.id === activeChatId ? 'bg-slate-200/70' : 'hover:bg-slate-200/50')}>
            <button onClick={() => openChat(c.id)} className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm" title={c.title}>{c.title}</button>
            <Button variant="ghost" size="icon-sm" aria-label={`Delete chat ${c.title}`} className="mr-1 hidden size-7 rounded-md hover:text-red-600 group-hover:grid" onClick={() => deleteChat(c.id)}><X className="size-3.5" /></Button>
          </div>
        )))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        {user ? (
          <div className="flex items-center gap-3 px-1">
            <span className="grid size-8 place-items-center rounded-full bg-brand-amber text-xs font-bold text-navy-950">{initials || 'U'}</span>
            <span className="min-w-0 truncate text-sm font-semibold">{user.fullName}</span>
          </div>
        ) : (
          <Button variant="ghost" onClick={signIn} className="h-auto w-full justify-start whitespace-normal rounded-xl px-3 py-2 text-left text-sm font-normal">Sign in to keep your chats with your account</Button>
        )}
      </div>
    </aside>
  );
}
