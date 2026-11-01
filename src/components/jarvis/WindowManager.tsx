'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Minus, Square, X } from 'lucide-react';
import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { AppContent } from '@/components/jarvis/apps/AppContent';
import { APPS } from '@/components/jarvis/apps/registry';
import { play } from '@/lib/audio';
import { DUR, EASE_IN, EASE_OUT } from '@/lib/jarvis/motion';
import { useOS, type OSWindowState } from '@/lib/jarvis/osStore';

const MIN_W = 360;
const MIN_H = 260;
const TOP_SAFE = 70;
const BOTTOM_SAFE = 96;

export function WindowManager() {
  const windows = useOS((s) => s.windows);
  const close = useOS((s) => s.close);

  // Esc closes the front-most window (unless a modal / input is handling it).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      const visible = useOS.getState().windows.filter((w) => !w.minimized);
      if (!visible.length) return;
      const top = visible.reduce((a, b) => (b.z > a.z ? b : a));
      play('click_secondary');
      close(top.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  return (
    <div className="jos-wm">
      <AnimatePresence>
        {windows
          .filter((w) => !w.minimized)
          .map((w) => (
            <OSWindow key={w.id} win={w} />
          ))}
      </AnimatePresence>
    </div>
  );
}

function OSWindow({ win }: { win: OSWindowState }) {
  const { focus, close, minimize, toggleMaximize, setRect } = useOS.getState();
  const isTop = useOS((s) => s.windows.every((w) => w.minimized || w.z <= win.z));
  const drag = useRef<{ kind: 'move' | 'resize'; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number } | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // Keyboard users land inside a window when it opens (unless the app already
  // focused its own input, e.g. Terminal).
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const el = sectionRef.current;
      if (el && !el.contains(document.activeElement)) el.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, []);
  const app = APPS[win.id];

  const begin = (kind: 'move' | 'resize') => (e: ReactPointerEvent) => {
    if (win.maximized || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { kind, sx: e.clientX, sy: e.clientY, ox: win.x, oy: win.y, ow: win.w, oh: win.h };
  };
  const moveTo = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (d.kind === 'move') {
      setRect(win.id, {
        x: Math.min(window.innerWidth - 120, Math.max(-win.w + 160, d.ox + dx)),
        y: Math.min(window.innerHeight - BOTTOM_SAFE, Math.max(TOP_SAFE - 8, d.oy + dy)),
      });
    } else {
      setRect(win.id, {
        w: Math.max(MIN_W, Math.min(window.innerWidth - d.ox - 8, d.ow + dx)),
        h: Math.max(MIN_H, Math.min(window.innerHeight - d.oy - 8, d.oh + dy)),
      });
    }
  };
  const end = () => {
    drag.current = null;
  };

  const rect = win.maximized
    ? { left: 12, top: TOP_SAFE, width: 'calc(100vw - 24px)', height: `calc(100vh - ${TOP_SAFE + BOTTOM_SAFE}px)` }
    : { left: win.x, top: win.y, width: win.w, height: win.h };

  return (
    <motion.section
      className={isTop ? 'jos-window is-top' : 'jos-window'}
      ref={sectionRef}
      tabIndex={-1}
      role="dialog"
      aria-label={app.title}
      style={{ ...rect, zIndex: win.z }}
      initial={{ opacity: 0, scale: 0.94, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: DUR.standard, ease: EASE_OUT } }}
      exit={{ opacity: 0, scale: 0.96, y: 10, transition: { duration: DUR.quick, ease: EASE_IN } }}
      onPointerDown={() => !isTop && focus(win.id)}
    >
      <header
        className="jos-window-bar"
        onPointerDown={begin('move')}
        onPointerMove={moveTo}
        onPointerUp={end}
        onPointerCancel={end}
        onDoubleClick={() => toggleMaximize(win.id)}
      >
        <span className="jos-window-icon">
          <app.Icon size={16} />
        </span>
        <strong>{app.title}</strong>
        <span className="jos-window-sub">{app.subtitle}</span>
        <div className="jos-window-ctrls">
          <button type="button" aria-label="Minimise" onClick={() => minimize(win.id)}>
            <Minus size={15} />
          </button>
          <button type="button" aria-label={win.maximized ? 'Restore' : 'Maximise'} onClick={() => toggleMaximize(win.id)}>
            {win.maximized ? <Copy size={13} /> : <Square size={13} />}
          </button>
          <button
            type="button"
            aria-label="Close"
            className="is-close"
            onClick={() => {
              play('click_secondary');
              close(win.id);
            }}
          >
            <X size={15} />
          </button>
        </div>
      </header>
      <div className="jos-window-body">
        <AppContent id={win.id} payload={win.payload} />
      </div>
      {!win.maximized && (
        <span
          className="jos-window-resize"
          aria-hidden
          onPointerDown={begin('resize')}
          onPointerMove={moveTo}
          onPointerUp={end}
          onPointerCancel={end}
        />
      )}
    </motion.section>
  );
}
