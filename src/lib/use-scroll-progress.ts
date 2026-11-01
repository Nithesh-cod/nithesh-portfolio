'use client';

import { useEffect, useState } from 'react';

const RANGE = 2400; // "pixels" of virtual scroll from t=0 to t=1.
const TOUCH_SPEED = 2.0;

/**
 * Reports a normalized scroll progress in [0..1].
 *
 * Proving slice: ignores document scroll entirely (the canvas is inside a
 * .hud-stage with CSS `perspective`, which turns it into a containing
 * block and breaks `position: fixed` under window scroll). Instead,
 * accumulates wheel deltas + touch drag into a virtual value. Swap for
 * Lenis + a real scroll container when the slice earns its keep.
 */
export function useScrollProgress() {
  const [t, setT] = useState(0);

  useEffect(() => {
    let v = 0;
    let lastTouchY: number | null = null;

    const push = (dy: number) => {
      v = Math.max(0, Math.min(RANGE, v + dy));
      setT(v / RANGE);
    };

    const onWheel = (e: WheelEvent) => push(e.deltaY);
    const onTouchStart = (e: TouchEvent) => {
      lastTouchY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? null;
      if (y != null && lastTouchY != null) push((lastTouchY - y) * TOUCH_SPEED);
      lastTouchY = y;
    };
    const onTouchEnd = () => { lastTouchY = null; };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  return t;
}
