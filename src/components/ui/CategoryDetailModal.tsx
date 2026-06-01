'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo } from 'react';
import { skillCategories, skillDescriptions } from '@/lib/content';
import { play } from '@/lib/audio';
import { usePortfolioStore } from '@/lib/store';

const BACKDROP = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
} as const;

const PANEL = {
  hidden: { opacity: 0, scale: 0.97, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.15, ease: 'easeIn' } },
} as const;

export function CategoryDetailModal() {
  const id = usePortfolioStore((s) => s.activeSkillCategory);
  const close = usePortfolioStore((s) => s.closeSkillCategory);

  const category = useMemo(() => (id ? skillCategories.find((c) => c.id === id) ?? null : null), [id]);

  const handleClose = () => {
    play('click_secondary');
    close();
  };

  useEffect(() => {
    if (!category) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  return (
    <AnimatePresence>
      {category ? (
        <motion.div
          key={category.id}
          role="dialog"
          aria-modal="true"
          aria-label={`${category.title} capability detail`}
          className="fixed inset-0 z-[73] flex items-center justify-center p-6"
          variants={BACKDROP}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <button
            type="button"
            aria-label="Close capability detail"
            onClick={handleClose}
            className="absolute inset-0 cursor-pointer bg-void/80 backdrop-blur-md"
          />

          <motion.div
            className="relative z-10 w-full max-w-xl overflow-hidden rounded-md border border-emerald-mid/30 bg-graphite/85 shadow-[0_0_80px_-12px_#10B98144]"
            style={{ backdropFilter: 'blur(20px) saturate(140%)' }}
            variants={PANEL}
          >
            {/* Gold corner brackets */}
            <span aria-hidden className="absolute left-2 top-2 z-10 h-4 w-4 border-l border-t border-gold-accent" />
            <span aria-hidden className="absolute right-2 top-2 z-10 h-4 w-4 border-r border-t border-gold-accent" />
            <span aria-hidden className="absolute left-2 bottom-2 z-10 h-4 w-4 border-l border-b border-gold-accent" />
            <span aria-hidden className="absolute right-2 bottom-2 z-10 h-4 w-4 border-r border-b border-gold-accent" />

            {/* Top bar */}
            <div className="flex items-center justify-between border-b border-emerald-mid/25 bg-void/40 px-6 py-2.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-emerald-glow">
                {`>> CAPABILITY::${category.title}`}
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="font-mono text-[11px] uppercase tracking-[0.25em] text-bone transition hover:text-ivory focus:outline-none focus:ring-1 focus:ring-emerald-hot"
              >
                [ ✕ Close ]
              </button>
            </div>

            {/* Item list */}
            <ul className="flex flex-col divide-y divide-emerald-mid/15 px-6 py-4">
              {category.items.map((item) => {
                const desc = skillDescriptions[item];
                return (
                  <li key={item} className="py-2.5">
                    <p className="font-sci text-[14px] font-bold uppercase tracking-[0.12em] text-emerald-glow">
                      {item}
                    </p>
                    {desc ? (
                      <p className="mt-1 text-[13px] leading-relaxed text-bone">{desc}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
