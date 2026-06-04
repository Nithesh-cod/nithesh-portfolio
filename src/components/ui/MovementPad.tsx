'use client';

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Home } from 'lucide-react';
import { useEffect } from 'react';
import { usePortfolioStore } from '@/lib/store';
import { play } from '@/lib/audio';

/* V12.0 — physical-movement pad. 4 arrow buttons (forward / back /
 * left / right) plus a centre HOME reset. Global keyboard binding for
 * W A S D + arrow keys. */

const STEP = 1.5; // world units per move

const RESET_POS: [number, number, number] = [0, 3.0, 12];
const RESET_LOOK: [number, number, number] = [0, 1.5, 0];

export function MovementPad() {
  const panCamera = usePortfolioStore((s) => s.panCamera);
  const focusOn = usePortfolioStore((s) => s.focusOn);

  const reset = () => focusOn(RESET_POS, RESET_LOOK);

  // Global keyboard binding (skipped when a modal is open or an input
  // is focused — but we keep it simple and just check tag.).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          e.preventDefault();
          panCamera(0, -STEP);
          break;
        case 's':
        case 'arrowdown':
          e.preventDefault();
          panCamera(0, STEP);
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
          e.preventDefault();
          reset();
          break;
        default:
          return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panCamera]);

  const button = (
    onClick: () => void,
    cls: string,
    children: React.ReactNode,
    label: string,
  ) => (
    <button
      type="button"
      className={`movement-arrow ${cls}`}
      onClick={() => {
        play('click_primary');
        onClick();
      }}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );

  return (
    <div className="movement-pad" aria-label="Camera movement controls">
      {button(() => panCamera(0, -STEP), 'mp-up', <ChevronUp size={16} />, 'Move forward (W)')}
      <div className="movement-row">
        {button(() => panCamera(-STEP, 0), 'mp-left', <ChevronLeft size={16} />, 'Move left (A)')}
        {button(reset, 'mp-home', <Home size={14} />, 'Reset view (H)')}
        {button(() => panCamera(STEP, 0), 'mp-right', <ChevronRight size={16} />, 'Move right (D)')}
      </div>
      {button(() => panCamera(0, STEP), 'mp-down', <ChevronDown size={16} />, 'Move back (S)')}
    </div>
  );
}
