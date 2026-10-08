import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useVoice, type VoicePhase } from '../../context/VoiceContext';
import { CloseIcon, MicIcon, MicOffIcon, SendIcon } from '../icons';
import { phaseLabel } from './VoiceOrb';
import LiveMap from '../map/LiveMap';

/** Glowing sphere that reacts to the mic level (listening), breathes (thinking) and pulses (speaking). */
function Orb({ phase, size }: { phase: VoicePhase; size: number }) {
  const { levelRef } = useVoice();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let smooth = 0;
    const loop = (t: number) => {
      const target =
        phase === 'listening' ? levelRef.current : phase === 'speaking' ? 0.35 + 0.25 * Math.sin(t / 140) ** 2 : phase === 'idle' ? 0 : 0.12 + 0.1 * Math.sin(t / 260);
      smooth += (target - smooth) * 0.25;
      if (ref.current) ref.current.style.transform = `scale(${1 + smooth * 0.55})`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, levelRef]);

  const glow = phase === 'listening' ? 'rgba(99,102,241,0.55)' : phase === 'speaking' ? 'rgba(56,189,248,0.55)' : 'rgba(99,102,241,0.3)';
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <div
        ref={ref}
        className="rounded-full will-change-transform"
        style={{
          width: size,
          height: size,
          background: 'radial-gradient(circle at 50% 78%, #f1f5ff 0%, #a5b4fc 28%, #5b5df5 62%, #3b2fd9 100%)',
          boxShadow: `0 0 ${size * 0.5}px ${glow}`,
          opacity: phase === 'idle' ? 0.55 : 1,
        }}
      />
      {(phase === 'thinking' || phase === 'transcribing') && (
        <span className="voice-spin absolute rounded-full border-2 border-transparent border-t-white/70" style={{ width: size * 1.25, height: size * 1.25 }} />
      )}
    </div>
  );
}

export default function VoiceMode() {
  const { open, active, phase, log, cartId, trackId, closeTrack, error, start, stop, close, send, reviewInCheckout, dismissCart } = useVoice();
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const busy = phase === 'thinking' || phase === 'transcribing';

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [log, cartId, phase]);

  if (!open) return null;

  const recent = log.slice(-4);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() || busy) return;
    send(draft);
    setDraft('');
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {/* recent conversation, floating above the bar; older lines fade out */}
      <div className="pointer-events-none flex max-h-[45vh] w-full max-w-[44rem] flex-col justify-end gap-2 overflow-hidden">
        {recent.map((entry, i) => (
          <div
            key={log.length - recent.length + i}
            className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
            style={{ opacity: 0.45 + 0.55 * ((i + 1) / recent.length) }}
          >
            <div
              className={`pointer-events-auto max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-snug shadow-popover backdrop-blur ${
                entry.role === 'user' ? 'bg-brand-blue text-white' : 'bg-black/85 text-white ring-1 ring-white/10'
              }`}
            >
              {entry.text}
            </div>
          </div>
        ))}

        {trackId && (
          <div className="pointer-events-auto w-full max-w-xl self-start">
            <LiveMap occurrenceId={trackId} height={240} onClose={closeTrack} />
          </div>
        )}

        {busy && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl bg-black/85 px-4 py-3 ring-1 ring-white/10">
              {[0, 0.18, 0.36].map((d) => (
                <span key={d} className="voice-dot block h-2 w-2 rounded-full bg-white" style={{ animationDelay: `${d}s` }} />
              ))}
            </div>
          </div>
        )}

        {cartId && (
          <div className="pointer-events-auto w-full max-w-sm self-start rounded-2xl bg-black/90 p-4 ring-1 ring-white/10">
            <p className="text-xs font-bold uppercase tracking-wide text-sky-300">Trip held</p>
            <p className="mt-1 text-[13px] text-slate-300">Seats are held for a few minutes. Say "confirm" or review it in checkout — nothing is booked or charged yet.</p>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={dismissCart} className="rounded-full px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10">
                Dismiss
              </button>
              <button onClick={reviewInCheckout} className="rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-black hover:bg-slate-200">
                Review &amp; pay
              </button>
            </div>
          </div>
        )}

        {error && <p className="pointer-events-auto self-start rounded-xl bg-red-950/90 px-3 py-2 text-[13px] font-medium text-red-200">{error}</p>}
        <div ref={endRef} />
      </div>

      <div className="pointer-events-auto flex w-full max-w-[44rem] items-center gap-2">
        <div className="grid shrink-0 place-items-center rounded-full bg-black p-2 shadow-popover">
          <Orb phase={phase} size={44} />
        </div>
        <form onSubmit={submit} className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-[#1c1c1e] p-2 pl-5 shadow-popover ring-1 ring-white/10">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={active ? phaseLabel(phase) : 'Type'}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-slate-400"
          />
          {draft.trim() ? (
            <button type="submit" disabled={busy} className="grid h-10 w-10 place-items-center rounded-full text-white hover:bg-white/10 disabled:opacity-40" aria-label="Send">
              <SendIcon className="h-5 w-5" width={20} height={20} />
            </button>
          ) : (
            <button
              type="button"
              onClick={active ? stop : start}
              className={`grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 ${active ? 'text-white' : 'text-slate-400'}`}
              aria-label={active ? 'Mute microphone' : 'Unmute microphone'}
              title={active ? 'Mute microphone' : 'Start listening'}
            >
              {active ? <MicIcon className="h-5 w-5" width={20} height={20} /> : <MicOffIcon className="h-5 w-5" width={20} height={20} />}
            </button>
          )}
          <button type="button" onClick={close} className="grid h-11 w-11 place-items-center rounded-full bg-white text-black hover:bg-slate-200" aria-label="End voice mode">
            <CloseIcon className="h-5 w-5" width={20} height={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
