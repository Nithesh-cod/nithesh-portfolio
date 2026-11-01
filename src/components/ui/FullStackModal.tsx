'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BrainCircuit,
  Database,
  Layout,
  Smartphone,
  TerminalSquare,
  X,
} from 'lucide-react';
import { useEffect } from 'react';
import { play } from '@/lib/audio';
import { expertiseAreas } from '@/lib/content';
import { usePortfolioStore } from '@/lib/store';

/* V13.1 — Full-stack expertise modal.
 *
 *   Distinct from CategoryDetailModal (shown via VIEW ALL SKILLS in
 *   the Tech Stack panel) which iterates the skillsByCategory items.
 *   This one zooms in on the 5 Core Expertise AREAS — Frontend /
 *   Backend / Database / Cloud & DevOps / AI & Automation — with
 *   the libraries/tools each area uses. Reads as "here's my
 *   full stack" rather than "here are all my skills". */

const BACKDROP = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.20, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
} as const;

const PANEL = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.30, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.18, ease: 'easeIn' } },
} as const;

const ICONS = {
  frontend: Layout,
  backend: TerminalSquare,
  data: Database,
  mobile: Smartphone,
  ai: BrainCircuit,
} as const;

export function FullStackModal() {
  const open = usePortfolioStore((s) => s.fullStackOpen);
  const close = usePortfolioStore((s) => s.closeFullStack);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        play('click_secondary');
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const handleClose = () => {
    play('click_secondary');
    close();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="full-stack-backdrop"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/72 backdrop-blur-md p-4"
          variants={BACKDROP}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-label="Full stack expertise"
        >
          <motion.div
            key="full-stack-panel"
            className="detail-modal full-stack-modal"
            variants={PANEL}
            onClick={(e) => e.stopPropagation()}
          >
            <span aria-hidden className="detail-modal-bracket detail-modal-bracket--tl" />
            <span aria-hidden className="detail-modal-bracket detail-modal-bracket--tr" />
            <span aria-hidden className="detail-modal-bracket detail-modal-bracket--bl" />
            <span aria-hidden className="detail-modal-bracket detail-modal-bracket--br" />

            <button
              type="button"
              onClick={handleClose}
              className="detail-modal-close"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <p className="detail-modal-eyebrow">{'>> EXPERTISE :: FULL STACK'}</p>
            <h2 className="detail-modal-title">[ MY FULL STACK ]</h2>
            <p className="contact-intro">
              Five focus areas I ship in. Each one lists only libraries and tools used in projects on my GitHub.
            </p>

            <div className="full-stack-grid">
              {expertiseAreas.map(({ id, title, blurb, items }) => {
                const Icon = ICONS[id];
                return (
                <article key={id} className="full-stack-card">
                  <header className="full-stack-card-head">
                    <span
                      className={id === 'ai' ? 'v11-row-icon v11-row-icon--warm' : 'v11-row-icon'}
                      aria-hidden
                    >
                      <Icon size={16} />
                    </span>
                    <h3 className="full-stack-card-title">{title}</h3>
                  </header>
                  <p className="full-stack-card-blurb">{blurb}</p>
                  <div className="detail-modal-pills">
                    {items.map((it) => (
                      <span key={it} className="detail-modal-pill">{it}</span>
                    ))}
                  </div>
                </article>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
