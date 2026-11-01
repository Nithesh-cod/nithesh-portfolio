'use client';

import { motion, useAnimationControls, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { APPS, DOCK_APPS } from '@/components/jarvis/apps/registry';
import { useLaunchApp } from '@/components/jarvis/useLaunchApp';
import { DUR, EASE, EASE_OUT } from '@/lib/jarvis/motion';
import { useOS, type AppId } from '@/lib/jarvis/osStore';

const BASE = 46;
const PEAK = 68;
const BOUNCE = [0, -16, 0, -7, 0];

function DockIcon({ id, mouseX }: { id: AppId; mouseX: MotionValue<number> }) {
  const ref = useRef<HTMLButtonElement>(null);
  const launch = useLaunchApp();
  const minimize = useOS((s) => s.minimize);
  const state = useOS((s) => {
    const win = s.windows.find((w) => w.id === id);
    if (!win) return 'idle';
    if (win.minimized) return 'minimised';
    return s.windows.every((w) => w.minimized || w.z <= win.z) ? 'front' : 'running';
  });
  const running = state !== 'idle';
  const app = APPS[id];

  const distance = useTransform(mouseX, (x) => {
    const r = ref.current?.getBoundingClientRect();
    return r ? x - (r.left + r.width / 2) : Infinity;
  });
  const sizeRaw = useTransform(distance, [-140, 0, 140], [BASE, PEAK, BASE]);
  const size = useSpring(sizeRaw, { stiffness: 380, damping: 28, mass: 0.4 });

  // Bounce on launch, however the app was launched.
  const bounce = useAnimationControls();
  const wasRunning = useRef(false);
  useEffect(() => {
    if (running && !wasRunning.current) void bounce.start({ y: BOUNCE, transition: { duration: DUR.slow, ease: EASE } });
    wasRunning.current = running;
  }, [running, bounce]);

  const classes = ['jos-dock-icon', running && 'is-running', state === 'minimised' && 'is-minimised', state === 'front' && 'is-front'];

  return (
    <motion.button
      ref={ref}
      type="button"
      className={classes.filter(Boolean).join(' ')}
      data-dock-id={id}
      style={{ width: size, height: size }}
      animate={bounce}
      whileTap={{ scale: 0.9 }}
      onClick={() => (state === 'front' ? minimize(id) : launch(id))}
      aria-label={state === 'minimised' ? `${app.title}, minimised` : app.title}
    >
      <app.Icon size={22} strokeWidth={1.7} />
      <span className="jos-dock-tip">{app.title}</span>
    </motion.button>
  );
}

export function Dock({ delay = 0 }: { delay?: number }) {
  const mouseX = useMotionValue(Infinity);
  // Apps without a pinned icon appear while they run, so a minimised one can
  // always be brought back.
  const extras = useOS((s) =>
    s.windows
      .map((w) => w.id)
      .filter((id) => !DOCK_APPS.includes(id))
      .join(' '),
  );
  const extraIds = (extras ? extras.split(' ') : []) as AppId[];

  return (
    <motion.nav
      className="jos-dock"
      aria-label="Dock"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0, transition: { delay, duration: DUR.slow, ease: EASE_OUT } }}
      onPointerMove={(e) => mouseX.set(e.clientX)}
      onPointerLeave={() => mouseX.set(Infinity)}
    >
      {DOCK_APPS.map((id) => (
        <DockIcon key={id} id={id} mouseX={mouseX} />
      ))}
      {extraIds.length > 0 && <span className="jos-dock-divider" aria-hidden />}
      {extraIds.map((id) => (
        <DockIcon key={id} id={id} mouseX={mouseX} />
      ))}
    </motion.nav>
  );
}
