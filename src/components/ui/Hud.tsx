'use client';

import { AudioToggle } from '@/components/ui/AudioToggle';
import { usePortfolioStore } from '@/lib/store';
import { content, waypoints } from '@/lib/content';

/**
 * Top-layer DOM HUD: bone/ivory typography, 1px emerald-mid/40 dividers.
 * The HUD is part of the 70% neutral zone — no emerald fills on chrome text.
 */
export function Hud() {
  const section = usePortfolioStore((s) => s.section);
  const total = waypoints.length;

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      {/* Top-left wordmark */}
      <div className="pointer-events-auto absolute left-6 top-6 flex items-center gap-3">
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-mid"
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-bone">
          {content.hero.name}
        </span>
      </div>

      {/* Top-right controls */}
      <div className="pointer-events-auto absolute right-6 top-6 flex items-center gap-3">
        <AudioToggle />
      </div>

      {/* Bottom-left section indicator */}
      <div className="pointer-events-none absolute bottom-6 left-6 font-mono text-[10px] uppercase tracking-[0.3em]">
        <span className="text-ivory">{String(section + 1).padStart(2, '0')}</span>
        <span className="mx-2 text-bone/40">/</span>
        <span className="text-bone">{String(total).padStart(2, '0')}</span>
      </div>

      {/* Bottom-right scroll hint */}
      <div className="pointer-events-none absolute bottom-6 right-6 font-mono text-[10px] uppercase tracking-[0.3em] text-bone">
        Scroll
      </div>
    </div>
  );
}
