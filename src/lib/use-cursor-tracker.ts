'use client';

import { useEffect } from 'react';

/**
 * V9.3 — writes the cursor position (normalised −1..+1 each axis) into
 * the `--cx` / `--cy` CSS custom properties on the document root. HUD
 * panels read these to drive their parallax + tilt transforms.
 */
export function useCursorTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      document.documentElement.style.setProperty('--cx', x.toString());
      document.documentElement.style.setProperty('--cy', y.toString());
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);
}
