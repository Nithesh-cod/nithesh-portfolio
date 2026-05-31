'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { play } from '@/lib/audio';
import { content } from '@/lib/content';

const STORAGE_KEY = 'intro-played';
const TOTAL_MS = 4000;
const SKIP_HINT_AT_MS = 1000;
const LETTER_STAGGER_S = 0.06;
const LETTER_DURATION_S = 0.42;

/**
 * 4-second skippable cover that plays once per browser session.
 * - sessionStorage('intro-played') = '1' → component renders nothing on remount.
 * - Skip triggers: Space, Tab, any pointer, any wheel, or the natural timeout.
 *   All of them set the flag and fade out so the canvas takes over.
 * - The canvas is rendering underneath the whole time at the entrance camera
 *   pose, so the transition into the main scene is just a cross-fade.
 */
export function Intro() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Read sessionStorage on mount only — SSR-safe, idempotent on remount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setMounted(true);
    if (window.sessionStorage.getItem(STORAGE_KEY) === '1') return;
    setVisible(true);
    play('startup');
  }, []);

  useEffect(() => {
    if (!visible) return;
    const hintId = window.setTimeout(() => setShowHint(true), SKIP_HINT_AT_MS);
    const endId = window.setTimeout(() => finish(), TOTAL_MS);

    const finish = () => {
      window.sessionStorage.setItem(STORAGE_KEY, '1');
      setVisible(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        finish();
      }
    };
    const onPointer = () => finish();
    const onWheel = () => finish();

    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('wheel', onWheel, { passive: true });

    return () => {
      window.clearTimeout(hintId);
      window.clearTimeout(endId);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('wheel', onWheel);
    };
  }, [visible]);

  if (!mounted) return null;

  const name = content.hero.name.toUpperCase();

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="intro"
          role="presentation"
          // pointer-events:none — skip handlers are window-level (keydown, pointerdown,
          // wheel) so the overlay does NOT need to receive events. Letting clicks pass
          // through ensures the canvas underneath stays interactive throughout the
          // intro AND the 600ms exit fade (which would otherwise block console clicks).
          className="pointer-events-none fixed inset-0 z-[80] flex flex-col items-center justify-center bg-void"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeOut' } }}
        >
          <motion.h1
            className="select-none font-display text-4xl tracking-[0.18em] text-ivory md:text-6xl"
            aria-label={content.hero.name}
            initial="hidden"
            animate="visible"
          >
            {name.split('').map((ch, i) => (
              <motion.span
                key={`${ch}-${i}`}
                aria-hidden
                className="inline-block"
                initial={{ opacity: 0, y: 14, scale: 0.4, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                transition={{
                  delay: i * LETTER_STAGGER_S,
                  duration: LETTER_DURATION_S,
                  ease: 'easeOut',
                }}
              >
                {ch === ' ' ? ' ' : ch}
              </motion.span>
            ))}
          </motion.h1>

          <motion.p
            className="mt-6 font-mono text-[10px] uppercase tracking-[0.4em] text-emerald-mid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: name.length * LETTER_STAGGER_S + 0.4, duration: 0.6 }}
          >
            {content.hero.tagline}
          </motion.p>

          <AnimatePresence>
            {showHint ? (
              <motion.p
                key="hint"
                className="absolute bottom-10 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.3em] text-bone"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
              >
                Press space / tap to skip
              </motion.p>
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
