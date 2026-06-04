'use client';

import { useEffect, useState } from 'react';
import { usePortfolioStore } from '@/lib/store';

/* V12.4 — MovementPad UI removed (Fix 4). Keyboard W A S D + Arrow
 * keys still drive the camera pan via the global key listener below.
 * Esc + H reset the view. The OrbitControls touch handler in
 * CameraRig handles mobile single-finger orbit + 2-finger pan natively.
 *
 * A brief first-visit hint surfaces the controls; auto-dismisses
 * after 6s and never reappears for the session. */

const STEP = 1.5;

const RESET_POS: [number, number, number] = [0, 3.0, 12];
const RESET_LOOK: [number, number, number] = [0, 1.5, 0];

const HINT_SHOWN_KEY = 'nr-portfolio-nav-hint-shown';

export function MovementPad() {
  const panCamera = usePortfolioStore((s) => s.panCamera);
  const focusOn = usePortfolioStore((s) => s.focusOn);
  const [showHint, setShowHint] = useState(false);

  // Decide whether to show the first-visit hint.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const seen = window.sessionStorage.getItem(HINT_SHOWN_KEY);
      if (!seen) {
        setShowHint(true);
        window.sessionStorage.setItem(HINT_SHOWN_KEY, '1');
        const t = window.setTimeout(() => setShowHint(false), 6500);
        return () => window.clearTimeout(t);
      }
    } catch {
      /* sessionStorage blocked — hint stays off, that's fine. */
    }
  }, []);

  // Global keyboard binding. UP / W = forward (toward scene); the
  // CameraRig's panCamera handler resolves (dx, dz) against the
  // current camera direction.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          e.preventDefault();
          panCamera(0, STEP);
          break;
        case 's':
        case 'arrowdown':
          e.preventDefault();
          panCamera(0, -STEP);
          break;
        case 'a':
        case 'arrowleft':
          e.preventDefault();
          panCamera(-STEP, 0);
          break;
        case 'd':
        case 'arrowright':
          e.preventDefault();
          panCamera(STEP, 0);
          break;
        case 'h':
        case 'escape':
          e.preventDefault();
          focusOn(RESET_POS, RESET_LOOK);
          break;
        default:
          return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panCamera, focusOn]);

  if (!showHint) return null;

  return (
    <div className="nav-hint" role="note" aria-label="Navigation help">
      USE  W  A  S  D  OR  ARROW  KEYS  TO  MOVE
      <span className="nav-hint-sep">·</span>
      DRAG  TO  LOOK
      <span className="nav-hint-sep">·</span>
      SCROLL  TO  ZOOM
    </div>
  );
}
