'use client';

import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { NRLogo } from '@/components/jarvis/NRLogo';
import { play } from '@/lib/audio';
import { stats } from '@/lib/content';
import { readGpuName } from '@/lib/jarvis/device';
import { DUR, EASE, EASE_IN } from '@/lib/jarvis/motion';

const TITLE = 'JARVIS OS';

/** ~2.5 s skippable boot: hex traces in, title types, real system lines
 *  scroll, progress fills, then the desktop takes over. */
export function BootSequence({ onDone, fast = false }: { onDone: () => void; fast?: boolean }) {
  const [shown, setShown] = useState(0);
  const [progress, setProgress] = useState(0);
  const done = useRef(false);

  const lines = useMemo(() => {
    if (typeof window === 'undefined') return [];
    const gpu = readGpuName();
    return [
      'JARVIS OS v1.0 · kernel online',
      `Display ${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}x`,
      `GPU ${gpu ?? 'unavailable'}`,
      `CPU threads ${navigator.hardwareConcurrency || '—'}`,
      `Network ${navigator.onLine ? 'online' : 'offline'}`,
      `Indexing ${stats.projects} projects · ${stats.certificates} certificates`,
      'Loading JARVIS AI…',
      'All systems nominal.',
    ];
  }, []);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  useEffect(() => {
    play('startup');
    const total = fast ? 700 : 2500;
    const lineStart = fast ? 100 : 900;
    const lineGap = fast ? 40 : 150;
    const timers: number[] = [];
    lines.forEach((_, i) => timers.push(window.setTimeout(() => setShown(i + 1), lineStart + i * lineGap)));
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / (total - 250));
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    timers.push(window.setTimeout(finish, total));

    const skip = () => finish();
    window.addEventListener('keydown', skip);
    window.addEventListener('pointerdown', skip);
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
    // finish/lines are stable for the lifetime of the boot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      className="jos-boot"
      role="status"
      aria-label="JARVIS OS is booting. Press any key to skip."
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04, filter: 'blur(6px)', transition: { duration: DUR.standard, ease: EASE_IN } }}
    >
      <div className="jos-boot-core">
        <NRLogo size={132} draw />
        <h1 className="jos-boot-title" aria-label={TITLE}>
          {TITLE.split('').map((ch, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { delay: (fast ? 0.05 : 0.55) + i * 0.035, duration: DUR.standard, ease: EASE } }}
            >
              {ch === ' ' ? ' ' : ch}
            </motion.span>
          ))}
        </h1>
        <p className="jos-boot-sub">Nithesh&apos;s personal AI system</p>
        <ul className="jos-boot-log">
          {lines.slice(0, shown).map((l, i) => (
            <motion.li key={l} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0, transition: { duration: DUR.quick } }}>
              <span>[{String(i).padStart(2, '0')}]</span> {l}
              {i < shown - 1 || shown === lines.length ? <em> OK</em> : null}
            </motion.li>
          ))}
        </ul>
        <div className="jos-boot-bar">
          <i style={{ width: `${(progress * 100).toFixed(1)}%` }} />
        </div>
        <p className="jos-boot-skip">Press any key to skip</p>
      </div>
    </motion.div>
  );
}
