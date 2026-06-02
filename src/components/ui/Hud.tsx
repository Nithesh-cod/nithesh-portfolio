'use client';

import { useEffect, useState } from 'react';
import { AudioToggle } from '@/components/ui/AudioToggle';
import { content } from '@/lib/content';

/**
 * V7.0 — minimal HUD chrome. Center status bar, bottom-left waypoint
 * indicator, and bottom-right scroll hint are gone. What remains:
 * viewport corner brackets, wordmark top-left, sound toggle + clock
 * top-right.
 */
export function Hud() {
  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      <CornerBrackets />

      {/* Top-left wordmark. */}
      <div className="pointer-events-auto absolute left-6 top-6 flex items-center gap-3">
        <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-mid" />
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-bone">
          {content.hero.name}
        </span>
      </div>

      {/* Top-right cluster: clock + sound toggle. */}
      <div className="pointer-events-auto absolute right-6 top-6 flex items-center gap-4">
        <Clock />
        <AudioToggle />
      </div>
    </div>
  );
}

function CornerBrackets() {
  const arms = 'border-gold-accent/70';
  return (
    <>
      <span aria-hidden className={`absolute left-6 top-6 h-8 w-8 border-l border-t ${arms}`} />
      <span aria-hidden className={`absolute right-6 top-6 h-8 w-8 border-r border-t ${arms}`} />
      <span aria-hidden className={`absolute left-6 bottom-6 h-8 w-8 border-l border-b ${arms}`} />
      <span aria-hidden className={`absolute right-6 bottom-6 h-8 w-8 border-r border-b ${arms}`} />
    </>
  );
}

function Clock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const hh = String(d.getUTCHours()).padStart(2, '0');
      const mm = String(d.getUTCMinutes()).padStart(2, '0');
      const ss = String(d.getUTCSeconds()).padStart(2, '0');
      setNow(`${hh}:${mm}:${ss} UTC`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="hidden font-mono text-[11px] tabular-nums tracking-[0.15em] text-bone min-[480px]:inline">
      {now ?? '—:—:— UTC'}
    </span>
  );
}
