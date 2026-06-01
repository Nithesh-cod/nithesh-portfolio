'use client';

import { useEffect, useState } from 'react';

const HARD_TIMEOUT_MS = 8000;

/**
 * Loader: fake 0→100% progress, dismisses itself after 8 s no matter what.
 *
 * V2.3.1 — added the hard timeout. Loader is mounted by next/dynamic as
 * `loading={() => <Loader />}` for the canvas chunk; if that chunk fails
 * to resolve or the Canvas suspends on a bad asset, the loader could
 * hang indefinitely. Returning `null` after the timeout leaves an empty
 * fallback area so any other UI (HUD, etc.) keeps working.
 */
export function Loader() {
  const [pct, setPct] = useState(0);
  const [dismissed, setDismissed] = useState(false);

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

  useEffect(() => {
    const t = window.setTimeout(() => {
      // eslint-disable-next-line no-console
      console.warn('[Loader] 8 s hard timeout reached — dismissing loader.');
      setDismissed(true);
    }, HARD_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, []);

  if (dismissed) return null;

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
