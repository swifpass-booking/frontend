'use client';

import { useEffect, useRef } from 'react';
import { useVoice, type VoicePhase } from '@/context/VoiceContext';

/** Glowing sphere that reacts to the mic level (listening), breathes (thinking) and pulses (speaking). */
export function Orb({ phase, size }: { phase: VoicePhase; size: number }) {
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
