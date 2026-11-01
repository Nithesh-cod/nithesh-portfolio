'use client';

import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { useRef } from 'react';
import { APPS, DOCK_APPS } from '@/components/jarvis/apps/registry';
import { useLaunchApp } from '@/components/jarvis/useLaunchApp';
import { DUR, EASE_OUT } from '@/lib/jarvis/motion';
import { useOS, type AppId } from '@/lib/jarvis/osStore';

const BASE = 46;
const PEAK = 68;

function DockIcon({ id, mouseX }: { id: AppId; mouseX: MotionValue<number> }) {
  const ref = useRef<HTMLButtonElement>(null);
  const launch = useLaunchApp();
  const running = useOS((s) => s.windows.some((w) => w.id === id));
  const app = APPS[id];

  const distance = useTransform(mouseX, (x) => {
    const r = ref.current?.getBoundingClientRect();
    return r ? x - (r.left + r.width / 2) : Infinity;
  });
  const sizeRaw = useTransform(distance, [-140, 0, 140], [BASE, PEAK, BASE]);
  const size = useSpring(sizeRaw, { stiffness: 380, damping: 28, mass: 0.4 });

  return (
    <motion.button
      ref={ref}
      type="button"
      className={running ? 'jos-dock-icon is-running' : 'jos-dock-icon'}
      style={{ width: size, height: size }}
      onClick={() => launch(id)}
      aria-label={app.title}
    >
      <app.Icon size={22} strokeWidth={1.7} />
      <span className="jos-dock-tip">{app.title}</span>
    </motion.button>
  );
}

export function Dock({ delay = 0 }: { delay?: number }) {
  const mouseX = useMotionValue(Infinity);
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
    </motion.nav>
  );
}
