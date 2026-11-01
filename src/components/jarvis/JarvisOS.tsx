'use client';

import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { AppCarousel } from '@/components/jarvis/AppCarousel';
import { BootSequence } from '@/components/jarvis/BootSequence';
import { Dock } from '@/components/jarvis/Dock';
import { OSSidebar } from '@/components/jarvis/OSSidebar';
import { OSTopBar } from '@/components/jarvis/OSTopBar';
import { StatusPanel } from '@/components/jarvis/StatusPanel';
import { Wallpaper } from '@/components/jarvis/Wallpaper';
import { WindowManager } from '@/components/jarvis/WindowManager';
import { play, unlock } from '@/lib/audio';
import { DUR, EASE_OUT } from '@/lib/jarvis/motion';
import { useOS } from '@/lib/jarvis/osStore';

const BOOT_KEY = 'jarvis-booted';

/** JARVIS OS desktop, drawn over the gaming room. Boots once per session. */
export function JarvisOS() {
  const setBooted = useOS((s) => s.setBooted);
  const reduceMotion = useOS((s) => s.settings.reduceMotion);
  const bootNonce = useOS((s) => s.bootNonce);
  const [boot, setBoot] = useState<'pending' | 'show' | 'done'>('pending');
  const firstNonce = useRef(bootNonce);

  // Settings → "Replay boot".
  useEffect(() => {
    if (bootNonce !== firstNonce.current) setBoot('show');
  }, [bootNonce]);

  // Browsers only allow audio after a gesture: unlock on the first one inside the OS.
  useEffect(() => {
    const onGesture = () => {
      unlock();
      if (useOS.getState().booted) play('click_secondary');
    };
    window.addEventListener('pointerdown', onGesture, { once: true });
    return () => window.removeEventListener('pointerdown', onGesture);
  }, []);

  useEffect(() => {
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(BOOT_KEY) === '1';
    } catch {
      // Storage blocked: just boot every time.
    }
    setBoot(seen ? 'done' : 'show');
  }, []);

  const finishBoot = () => {
    try {
      window.sessionStorage.setItem(BOOT_KEY, '1');
    } catch {
      // Ignore.
    }
    setBooted(true);
    setBoot('done');
  };

  const enter = (delay: number, from: { x?: number; y?: number }) => ({
    initial: { opacity: 0, ...from },
    animate: { opacity: 1, x: 0, y: 0, transition: { delay, duration: DUR.slow, ease: EASE_OUT } },
  });

  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
    <motion.div
      className="jos"
      data-reduce-motion={reduceMotion || undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: DUR.standard } }}
      exit={{ opacity: 0, transition: { duration: DUR.quick } }}
    >
      <Wallpaper />
      {boot === 'done' && (
        <>
          <motion.div className="jos-top-wrap" {...enter(0, { y: -18 })}>
            <OSTopBar />
          </motion.div>
          <div className="jos-body">
            <motion.div className="jos-side-wrap" {...enter(0.06, { x: -26 })}>
              <OSSidebar />
            </motion.div>
            <main className="jos-home">
              <AppCarousel delay={0.12} />
            </main>
            <motion.div className="jos-right-wrap" {...enter(0.12, { x: 26 })}>
              <StatusPanel />
            </motion.div>
          </div>
          <Dock delay={0.3} />
          <WindowManager />
        </>
      )}
      <AnimatePresence>{boot === 'show' && <BootSequence key="boot" onDone={finishBoot} fast={reduceMotion} />}</AnimatePresence>
    </motion.div>
    </MotionConfig>
  );
}
