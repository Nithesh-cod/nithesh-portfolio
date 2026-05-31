'use client';

import { useEffect, useRef, useState } from 'react';
import { usePortfolioStore } from '@/lib/store';

/**
 * Custom cursor reticle.
 * - Movement: rAF loop reading last-known pointer position. Avoids the cost +
 *   coarse timing of running React renders on every mousemove (or worse,
 *   throttling/debouncing, which adds visible lag to a cursor).
 * - States: 'idle' (small dot) · 'interactive' (corner-bracket reticle with gold
 *   inner ring) · 'pressed' (shrunken).
 * - Disabled on touch and reduced-motion devices. On those we let the system
 *   cursor do its job and skip rendering entirely.
 */
export function Cursor() {
  const cursorState = usePortfolioStore((s) => s.cursorState);
  const ref = useRef<HTMLDivElement | null>(null);
  const pos = useRef({ x: -100, y: -100 });
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setEnabled(fine && !reduced);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onMove = (e: PointerEvent) => {
      pos.current.x = e.clientX;
      pos.current.y = e.clientY;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    let rafId = 0;
    const tick = () => {
      if (ref.current) {
        ref.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0) translate(-50%, -50%)`;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(rafId);
    };
  }, [enabled]);

  if (!enabled) return null;

  const sizeByState = {
    idle: 8,
    interactive: 32,
    pressed: 18,
  } as const;
  const size = sizeByState[cursorState];

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[60] mix-blend-screen"
      style={{ willChange: 'transform' }}
    >
      <div
        className="relative transition-[width,height,opacity] duration-150 ease-out"
        style={{ width: size, height: size }}
      >
        {/* Centre dot — always visible. */}
        <span
          className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-hot shadow-[0_0_8px_#34F5A4]"
        />

        {/* Ring + corner brackets — visible only when interactive. */}
        <div
          className="absolute inset-0 rounded-sm border border-emerald-hot/80 transition-opacity duration-150"
          style={{ opacity: cursorState === 'interactive' ? 1 : 0 }}
        >
          {(
            [
              ['top-0 left-0', 'border-t border-l'],
              ['top-0 right-0', 'border-t border-r'],
              ['bottom-0 left-0', 'border-b border-l'],
              ['bottom-0 right-0', 'border-b border-r'],
            ] as const
          ).map(([pos, sides]) => (
            <span
              key={pos}
              className={`absolute h-2 w-2 ${pos} ${sides} border-gold-accent`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
