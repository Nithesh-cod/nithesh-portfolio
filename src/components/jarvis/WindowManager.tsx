'use client';

import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { Copy, Minus, Square, X } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { AppContent } from '@/components/jarvis/apps/AppContent';
import { APPS } from '@/components/jarvis/apps/registry';
import { osSound } from '@/components/jarvis/osSounds';
import { useShell } from '@/components/jarvis/shellStore';
import { BOTTOM_SAFE, TOP_SAFE, snapWindow, zoneAt, zoneRect, type SnapZone } from '@/components/jarvis/windowSnap';
import { DUR, EASE, EASE_IN, EASE_OUT } from '@/lib/jarvis/motion';
import { useOS, type AppId, type OSWindowState } from '@/lib/jarvis/osStore';

const MIN_W = 360;
const MIN_H = 260;
const DRAG_SLOP = 6;
const MAX_MARGIN = 12;
const DOCKED_SCALE = 0.12;

/** Windows stay mounted while minimised, so an app keeps its state: "docked"
 *  flies into the app's dock icon, then hides it from view and from the tab order. */
const windowMotion: Variants = {
  entering: { opacity: 0, scale: 0.94, y: 18 },
  open: { opacity: 1, scale: 1, x: 0, y: 0, visibility: 'visible', transition: { duration: DUR.standard, ease: EASE_OUT } },
  docked: (id: AppId) => {
    const icon = document.querySelector(`[data-dock-id="${id}"]`)?.getBoundingClientRect();
    const box = document.querySelector(`[data-window-id="${id}"]`)?.getBoundingClientRect();
    const fall = { opacity: 0, scale: DOCKED_SCALE, y: window.innerHeight, x: 0 };
    const target =
      icon && box
        ? {
            ...fall,
            x: icon.left + icon.width / 2 - (box.left + box.width / 2),
            // .jos-window scales about 50% 80%.
            y: icon.top + icon.height / 2 - (box.top + box.height * 0.8),
          }
        : fall;
    return { ...target, transition: { duration: DUR.standard, ease: EASE_IN }, transitionEnd: { visibility: 'hidden' } };
  },
  closing: { opacity: 0, scale: 0.96, y: 10, transition: { duration: DUR.quick, ease: EASE_IN } },
};

export function WindowManager() {
  const windows = useOS((s) => s.windows);
  const close = useOS((s) => s.close);
  const preview = useShell((s) => s.snapPreview);

  // Esc closes the front-most window (unless a modal / input is handling it).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      const visible = useOS.getState().windows.filter((w) => !w.minimized);
      if (!visible.length) return;
      const top = visible.reduce((a, b) => (b.z > a.z ? b : a));
      close(top.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // One place for window sounds, so every way of opening or closing is covered:
  // buttons, Esc, the dock, the terminal and JARVIS AI's own tools.
  useEffect(
    () =>
      useOS.subscribe((now, before) => {
        const count = now.windows.length;
        const was = before.windows.length;
        if (count !== was) return osSound(count > was ? 'open' : 'close');
        const docked = now.windows.filter((w) => w.minimized).length;
        const wasDocked = before.windows.filter((w) => w.minimized).length;
        if (docked !== wasDocked) osSound(docked > wasDocked ? 'minimise' : 'restore');
      }),
    [],
  );

  return (
    <div className="jos-wm">
      <AnimatePresence>
        {preview && (
          <motion.div
            className="jos-snap-preview"
            style={{ left: preview.x, top: preview.y, width: preview.w, height: preview.h, zIndex: preview.z }}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: DUR.quick, ease: EASE } }}
            exit={{ opacity: 0, transition: { duration: DUR.quick, ease: EASE_IN } }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {windows.map((w) => (
          <OSWindow key={w.id} win={w} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function OSWindow({ win }: { win: OSWindowState }) {
  const { focus, close, minimize, toggleMaximize, setRect } = useOS.getState();
  const isTop = useOS((s) => !win.minimized && s.windows.every((w) => w.minimized || w.z <= win.z));
  const drag = useRef<{ kind: 'move' | 'resize'; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number; moved: boolean } | null>(null);
  const zone = useRef<SnapZone | null>(null);
  const [dragging, setDragging] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Keyboard users land inside a window when it opens or comes back from the
  // dock (unless the app already focused its own input, e.g. Terminal).
  useEffect(() => {
    if (win.minimized) return;
    const id = requestAnimationFrame(() => {
      const el = sectionRef.current;
      if (el && !el.contains(document.activeElement)) el.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [win.minimized]);
  const app = APPS[win.id];

  const begin = (kind: 'move' | 'resize') => (e: ReactPointerEvent) => {
    if (e.button !== 0 || window.innerWidth < 768) return;
    if (kind === 'resize' && win.maximized) return;
    if ((e.target as HTMLElement).closest('button')) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { kind, sx: e.clientX, sy: e.clientY, ox: win.x, oy: win.y, ow: win.w, oh: win.h, moved: false };
  };

  /** Pulling a maximised or snapped window away gives back its old size, under the pointer. */
  const tearOff = (d: NonNullable<typeof drag.current>) => {
    const shell = useShell.getState();
    const saved = shell.restoreRects[win.id];
    if (!win.maximized && !saved) return;
    const fromX = win.maximized ? MAX_MARGIN : win.x;
    const fromW = win.maximized ? window.innerWidth - MAX_MARGIN * 2 : win.w;
    const w = saved?.w ?? win.w;
    const h = saved?.h ?? win.h;
    d.ox = d.sx - ((d.sx - fromX) / fromW) * w;
    d.oy = win.maximized ? TOP_SAFE : win.y;
    d.ow = w;
    setRect(win.id, { x: d.ox, y: d.oy, w, h });
    if (win.maximized) toggleMaximize(win.id);
    shell.forgetRect(win.id);
  };

  const moveTo = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < DRAG_SLOP) return;
      d.moved = true;
      setDragging(true);
      if (d.kind === 'move') tearOff(d);
    }
    if (d.kind === 'move') {
      setRect(win.id, {
        x: Math.min(window.innerWidth - 120, Math.max(-d.ow + 160, d.ox + dx)),
        y: Math.min(window.innerHeight - BOTTOM_SAFE, Math.max(TOP_SAFE - 8, d.oy + dy)),
      });
      const next = zoneAt(e.clientX, e.clientY);
      if (next !== zone.current) {
        zone.current = next;
        useShell.getState().setSnapPreview(next ? { ...zoneRect(next), z: win.z } : null);
        if (next) osSound('snap');
      }
    } else {
      setRect(win.id, {
        w: Math.max(MIN_W, Math.min(window.innerWidth - d.ox - 8, d.ow + dx)),
        h: Math.max(MIN_H, Math.min(window.innerHeight - d.oy - 8, d.oh + dy)),
      });
    }
  };
  const finish = (dropped: boolean) => () => {
    const landing = zone.current;
    drag.current = null;
    zone.current = null;
    setDragging(false);
    useShell.getState().setSnapPreview(null);
    if (dropped && landing) snapWindow(win.id, landing);
  };

  const rect = win.maximized
    ? { left: MAX_MARGIN, top: TOP_SAFE, width: `calc(100vw - ${MAX_MARGIN * 2}px)`, height: `calc(100vh - ${TOP_SAFE + BOTTOM_SAFE}px)` }
    : { left: win.x, top: win.y, width: win.w, height: win.h };

  return (
    <motion.section
      className={`jos-window${isTop ? ' is-top' : ''}${dragging ? ' is-dragging' : ''}`}
      ref={sectionRef}
      tabIndex={-1}
      role="dialog"
      aria-label={app.title}
      aria-hidden={win.minimized || undefined}
      data-window-id={win.id}
      style={{ ...rect, zIndex: win.z }}
      custom={win.id}
      variants={windowMotion}
      initial="entering"
      animate={win.minimized ? 'docked' : 'open'}
      exit="closing"
      onPointerDown={() => !isTop && focus(win.id)}
    >
      <header
        className="jos-window-bar"
        onPointerDown={begin('move')}
        onPointerMove={moveTo}
        onPointerUp={finish(true)}
        onPointerCancel={finish(false)}
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
          <button type="button" aria-label="Close" className="is-close" onClick={() => close(win.id)}>
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
          onPointerUp={finish(false)}
          onPointerCancel={finish(false)}
        />
      )}
    </motion.section>
  );
}
