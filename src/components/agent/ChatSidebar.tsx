import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useVoice } from '../../context/VoiceContext';
import { CloseIcon, SearchIcon } from '../icons';

/** Left rail of the AI planner: start a chat, search the past ones, reopen or delete them. */
export default function ChatSidebar({ onClose, onSignIn }: { onClose: () => void; onSignIn: () => void }) {
  const { chats, activeChatId, log, startOver, openChat, deleteChat } = useVoice();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const closeSearch = () => {
    setSearching(false);
    setQuery('');
  };
  const [recentsOpen, setRecentsOpen] = useState(true);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? chats.filter((c) => c.title.toLowerCase().includes(q)) : chats;
  }, [chats, query]);
  const initials = user?.fullName
    ?.split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-50 text-navy-950">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <span className="text-xl font-bold tracking-tight">AI planner</span>
        <div className="flex items-center gap-1 text-slate-500">
          <button onClick={() => (searching ? closeSearch() : setSearching(true))} aria-label="Search chats" aria-pressed={searching} className={`grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-200/70 ${searching ? 'bg-slate-200/70 text-navy-950' : ''}`}>
            <SearchIcon className="h-[18px] w-[18px]" width={18} height={18} />
          </button>
          <button onClick={onClose} aria-label="Hide sidebar" title="Hide sidebar" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-200/70">
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <path d="M9 4v16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-3 pb-1">
        {searching && (
          <label className="mb-1 flex animate-[composerIn_0.15s_ease-out] items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-slate-200">
            <SearchIcon className="h-4 w-4 shrink-0 text-slate-400" width={16} height={16} />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && closeSearch()} placeholder="Search chats" className="min-w-0 flex-1 bg-transparent text-navy-950 placeholder:text-slate-400 focus:outline-none" />
          </label>
        )}
        <button
          onClick={startOver}
          disabled={log.length === 0}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition hover:bg-slate-200/60 disabled:cursor-default disabled:text-slate-400 disabled:hover:bg-transparent"
        >
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-5" />
            <path d="m17.5 3.5 3 3L12 15l-4 1 1-4z" />
          </svg>
          New chat
        </button>
      </div>

      <button onClick={() => setRecentsOpen((v) => !v)} className="flex items-center gap-1.5 px-5 pb-1 pt-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600" aria-expanded={recentsOpen}>
        Recents
        <svg className={`h-3.5 w-3.5 transition ${recentsOpen ? '' : '-rotate-90'}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m5 8 5 5 5-5" />
        </svg>
      </button>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {recentsOpen &&
          (shown.length === 0 ? (
            <p className="px-3 py-3 text-sm text-slate-400">{query ? 'No chats match.' : 'Your conversations will show up here.'}</p>
          ) : (
            shown.map((c) => (
              <div key={c.id} className={`group flex items-center rounded-lg ${c.id === activeChatId ? 'bg-slate-200/70' : 'hover:bg-slate-200/50'}`}>
                <button onClick={() => openChat(c.id)} className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm" title={c.title}>
                  {c.title}
                </button>
                <button onClick={() => deleteChat(c.id)} aria-label={`Delete chat ${c.title}`} className="mr-1 hidden h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-white hover:text-red-600 group-hover:grid">
                  <CloseIcon width={14} height={14} />
                </button>
              </div>
            ))
          ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        {user ? (
          <div className="flex items-center gap-3 px-1">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-amber text-xs font-bold text-navy-950">{initials || 'U'}</span>
            <span className="min-w-0 truncate text-sm font-semibold">{user.fullName}</span>
          </div>
        ) : (
          <button onClick={onSignIn} className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-200/60">
            Sign in to keep your chats with your account
          </button>
        )}
      </div>
    </aside>
  );
}
