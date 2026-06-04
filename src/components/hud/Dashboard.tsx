'use client';

import { useEffect, useState } from 'react';
import { content, taglineRoles } from '@/lib/content';

/* ───────────────────────────────────────────────────────────────────── *
 * V10.1 — only the top wordmark/clock/status bar stays as DOM.        *
 * Every content panel (LeftRail, RightRail, CapsuleOverlays,          *
 * ServicesStrip) is now mounted INSIDE the 3D scene via RoomPanels.   *
 * ───────────────────────────────────────────────────────────────────── */

export function TopBar() {
  return (
    <div className="pointer-events-auto fixed left-0 right-0 top-0 z-40 flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        {/* NR hex logo. */}
        <div className="flex h-10 w-10 items-center justify-center border border-neon-green/60 bg-bg-base/70 font-mono text-[12px] font-bold tracking-tight text-neon-bright [clip-path:polygon(25%_0%,75%_0%,100%_50%,75%_100%,25%_100%,0%_50%)]">
          NR
        </div>
        <div className="leading-tight">
          <div className="font-sans text-[15px] font-bold tracking-[0.2em] text-neon-bright">
            {content.hero.name.toUpperCase()}
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-text-sec">
            {taglineRoles.join('  |  ')}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Clock />
        <div className="flex items-center gap-2 rounded-sm border border-neon-green/60 bg-[rgba(0,255,136,0.06)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-neon-bright">
          <span aria-hidden className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-neon-bright shadow-[0_0_8px_#4DFFAA]" />
          SYSTEM ONLINE
        </div>
      </div>
    </div>
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
    <span className="hidden font-mono text-[11px] tabular-nums tracking-[0.15em] text-text-sec sm:inline">
      {now ?? '—:—:— UTC'}
    </span>
  );
}
