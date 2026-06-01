'use client';

import { useEffect, useState } from 'react';
import { AudioToggle } from '@/components/ui/AudioToggle';
import { usePortfolioStore } from '@/lib/store';
import { content, waypoints } from '@/lib/content';

/**
 * Global HUD chrome — viewport corner brackets, top status bar, live clock,
 * section indicator, and a slow scanline. Always visible; bone/ivory text on
 * the 70% neutral chrome budget. All pointer-events: none except controls.
 */
export function Hud() {
  const section = usePortfolioStore((s) => s.section);
  const total = waypoints.length;
  const current = waypoints[section] ?? waypoints[0]!;

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      {/* ── Viewport corner brackets ── */}
      <CornerBrackets />

      {/* ── Top-center status bar ── */}
      <div className="absolute left-1/2 top-8 flex -translate-x-1/2 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-bone">
        <span className="text-bone/70">NITHESH.OS</span>
        <span className="text-bone/30">{'//'}</span>
        <span className="text-bone/70">v1.0</span>
        <span className="text-bone/30">{'//'}</span>
        <span className="inline-flex items-center gap-1.5 text-emerald-glow">
          <span aria-hidden className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-hot shadow-[0_0_6px_#34F5A4]" />
          ONLINE
        </span>
      </div>

      {/* ── Top-left wordmark ── */}
      <div className="pointer-events-auto absolute left-6 top-6 flex items-center gap-3">
        <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-mid" />
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-bone">
          {content.hero.name}
        </span>
      </div>

      {/* ── Top-right cluster: audio toggle + live clock ── */}
      <div className="pointer-events-auto absolute right-6 top-6 flex items-center gap-4">
        <Clock />
        <AudioToggle />
      </div>

      {/* ── Bottom-left section indicator ── */}
      <div className="absolute bottom-6 left-6 font-mono text-[10px] uppercase tracking-[0.3em]">
        <span className="text-bone/50">WAYPOINT</span>
        <span className="ml-2 text-ivory">{String(section + 1).padStart(2, '0')}</span>
        <span className="mx-2 text-bone/40">{'//'}</span>
        <span className="text-emerald-glow">{current.label}</span>
        <span className="ml-3 text-bone/30">[ {String(section + 1).padStart(2, '0')} / {String(total).padStart(2, '0')} ]</span>
      </div>

      {/* ── Bottom-right scroll hint ── */}
      <div className="absolute bottom-6 right-6 font-mono text-[10px] uppercase tracking-[0.3em] text-bone/60">
        Scroll ↓
      </div>

      {/* ── Ambient scanline ── */}
      <Scanline />
    </div>
  );
}

/* ────────────────────────── Sub-components ────────────────────────── */

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
      // HH:MM:SS UTC
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
    <span className="hidden font-mono text-[11px] tabular-nums tracking-[0.15em] text-bone sm:inline">
      {now ?? '—:—:— UTC'}
    </span>
  );
}

function Scanline() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-0 right-0 h-px bg-emerald-glow/10"
      style={{ animation: 'hudScan 8s linear infinite' }}
    />
  );
}
