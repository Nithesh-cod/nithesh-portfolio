'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { content } from '@/lib/content';
import { play } from '@/lib/audio';
import { usePortfolioStore } from '@/lib/store';

const PDF_PATH = '/nithesh-ramachandran-resume.pdf';
const DOWNLOAD_NAME = 'Nithesh_Ramachandran_Resume.pdf';

const BACKDROP = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
} as const;

const PANEL = {
  hidden: { opacity: 0, scale: 0.97, y: 6 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.15, ease: 'easeIn' } },
} as const;

function triggerDownload() {
  const a = document.createElement('a');
  a.href = PDF_PATH;
  a.download = DOWNLOAD_NAME;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function ResumeViewer() {
  const open = usePortfolioStore((s) => s.resumeOpen);
  const close = usePortfolioStore((s) => s.closeResume);

  const handleClose = () => {
    play('click_secondary');
    close();
  };

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="resume"
          role="dialog"
          aria-modal="true"
          aria-label={`${content.hero.name} résumé`}
          className="fixed inset-0 z-[74] flex items-center justify-center p-6"
          variants={BACKDROP}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <button
            type="button"
            aria-label="Close résumé"
            onClick={handleClose}
            className="absolute inset-0 cursor-pointer bg-void/85 backdrop-blur-md"
          />

          <motion.div
            className="relative z-10 flex h-[85vh] w-[80vw] max-w-5xl flex-col overflow-hidden rounded-lg border border-emerald-mid/40 bg-graphite/85 shadow-[0_0_60px_-12px_#10B98155]"
            variants={PANEL}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between border-b border-emerald-mid/30 bg-void/60 px-4 py-2">
              <button
                type="button"
                aria-label="Close résumé"
                onClick={handleClose}
                className="font-mono text-[12px] uppercase tracking-[0.2em] text-bone transition hover:text-ivory focus:outline-none focus:ring-2 focus:ring-emerald-hot"
              >
                ✕ Close
              </button>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-bone">
                {content.hero.name} · Résumé
              </p>
              <button
                type="button"
                onClick={() => {
                  play('click_primary');
                  triggerDownload();
                }}
                className="rounded-full border border-gold-accent/70 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-gold-accent transition hover:bg-gold-accent/10 focus:outline-none focus:ring-2 focus:ring-gold-accent"
              >
                Download ↓
              </button>
            </div>

            {/* PDF body */}
            <iframe
              src={PDF_PATH}
              title="Nithesh Ramachandran résumé"
              className="flex-1 w-full bg-ivory"
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
