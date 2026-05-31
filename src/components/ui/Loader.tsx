'use client';

import { useEffect, useState } from 'react';

/**
 * M1: fake 0→100% progress so the loader shape, type, and timing are locked in.
 * M2: swap to drei's useProgress() to read real asset-load progress from the Canvas.
 */
export function Loader() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let id = 0;
    const tick = () => {
      setPct((p) => {
        if (p >= 100) return 100;
        const next = p + Math.max(0.4, (100 - p) * 0.04);
        return Math.min(100, next);
      });
      id = window.setTimeout(tick, 40);
    };
    tick();
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-void"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-bone">
        Booting lab
      </p>
      <div className="mt-6 h-px w-64 overflow-hidden bg-graphite">
        <div
          className="h-full bg-emerald-mid shadow-[0_0_8px_#10B981aa]"
          style={{ width: `${pct}%`, transition: 'width 80ms linear' }}
        />
      </div>
      <p className="mt-3 font-mono text-xs tabular-nums text-bone">
        {pct.toFixed(0).padStart(3, '0')}%
      </p>
    </div>
  );
}
