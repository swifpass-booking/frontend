import { useEffect, useRef } from 'react';
import { useVoice } from '../../context/VoiceContext';

const BARS = 64;

/** Dotted level meter (ChatGPT-style): dots swell into bars as the mic level scrolls past. */
export default function Wave() {
  const { levelRef } = useVoice();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const hist = new Array<number>(BARS).fill(0);
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      if (t - last > 45) {
        last = t;
        hist.shift();
        hist.push(Math.min(1, levelRef.current * 1.6));
        box.current?.childNodes.forEach((n, i) => {
          const el = n as HTMLElement;
          el.style.height = `${4 + hist[i] * 26}px`;
          el.style.opacity = String(0.35 + hist[i] * 0.65);
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [levelRef]);
  return (
    <div ref={box} className="flex h-8 min-w-0 flex-1 items-center justify-between gap-[3px] overflow-hidden px-2">
      {Array.from({ length: BARS }, (_, i) => (
        <span key={i} className="w-[3px] shrink-0 rounded-full bg-slate-500 transition-[height] duration-100" style={{ height: 4, opacity: 0.35 }} />
      ))}
    </div>
  );
}
