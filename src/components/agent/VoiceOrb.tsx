import { useEffect, useRef } from 'react';
import { useVoice, type VoicePhase } from '../../context/VoiceContext';
import { MicIcon } from '../icons';

const LABEL: Record<VoicePhase, string> = {
  idle: 'Tap to talk',
  listening: 'Listening…',
  transcribing: 'Got it…',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
};

export function phaseLabel(phase: VoicePhase) {
  return LABEL[phase];
}

interface VoiceOrbProps {
  size?: 'sm' | 'lg';
  onClick?: () => void;
}

/**
 * The mic button. Idle: plain mic. Listening: a ring that swells with your voice level.
 * Transcribing/thinking: spinner ring + bouncing dots. Speaking: equaliser bars.
 */
export default function VoiceOrb({ size = 'sm', onClick }: VoiceOrbProps) {
  const { phase, active, levelRef, start, stop, supported } = useVoice();
  const ringRef = useRef<HTMLSpanElement>(null);
  const dim = size === 'lg' ? 'h-16 w-16' : 'h-11 w-11';
  const icon = size === 'lg' ? 28 : 20;

  useEffect(() => {
    if (phase !== 'listening') return;
    let raf = 0;
    let smooth = 0;
    const loop = () => {
      smooth += (levelRef.current - smooth) * 0.35;
      if (ringRef.current) {
        ringRef.current.style.transform = `scale(${1 + smooth * 0.9})`;
        ringRef.current.style.opacity = String(0.25 + smooth * 0.6);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, levelRef]);

  const busy = phase === 'transcribing' || phase === 'thinking';
  const tone =
    phase === 'listening' ? 'bg-red-500 text-white' : phase === 'speaking' ? 'bg-emerald-500 text-white' : busy ? 'bg-brand-blue text-white' : 'bg-brand-blue text-white hover:bg-blue-700';

  return (
    <button
      type="button"
      onClick={onClick ?? (active ? stop : start)}
      disabled={!supported}
      title={supported ? (active ? 'Stop' : 'Talk to the booking assistant') : 'Voice input is not supported in this browser'}
      aria-label={active ? 'Stop voice assistant' : 'Start voice assistant'}
      className={`relative grid shrink-0 place-items-center rounded-full shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${dim} ${tone}`}
    >
      {phase === 'listening' && <span ref={ringRef} className="absolute inset-0 rounded-full bg-red-400 will-change-transform" />}
      {busy && (
        <span className="voice-spin absolute -inset-1 rounded-full border-2 border-brand-blue/20 border-t-brand-blue" />
      )}
      <span className="relative grid place-items-center">
        {phase === 'speaking' ? (
          <span className="flex h-5 items-center gap-[3px]">
            {[0, 0.15, 0.3, 0.1, 0.25].map((d, i) => (
              <span key={i} className="voice-bar block h-5 w-[3px] rounded-full bg-white" style={{ animationDelay: `${d}s` }} />
            ))}
          </span>
        ) : busy ? (
          <span className="flex items-center gap-1">
            {[0, 0.18, 0.36].map((d) => (
              <span key={d} className="voice-dot block h-1.5 w-1.5 rounded-full bg-white" style={{ animationDelay: `${d}s` }} />
            ))}
          </span>
        ) : (
          <MicIcon width={icon} height={icon} />
        )}
      </span>
    </button>
  );
}
