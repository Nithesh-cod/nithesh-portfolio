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
            className="relative z-10 flex h-[85vh] w-[80vw] max-w-5xl flex-col overflow-hidden rounded-md border border-emerald-mid/30 bg-graphite/85 shadow-[0_0_80px_-12px_#10B98155]"
            style={{ backdropFilter: 'blur(20px) saturate(140%)' }}
            variants={PANEL}
          >
            {/* Gold corner brackets */}
            <span aria-hidden className="absolute left-2 top-2 z-10 h-4 w-4 border-l border-t border-gold-accent" />
            <span aria-hidden className="absolute right-2 top-2 z-10 h-4 w-4 border-r border-t border-gold-accent" />
            <span aria-hidden className="absolute left-2 bottom-2 z-10 h-4 w-4 border-l border-b border-gold-accent" />
            <span aria-hidden className="absolute right-2 bottom-2 z-10 h-4 w-4 border-r border-b border-gold-accent" />

            {/* Top bar — 40px, mono header (left), filename (centre), action pills (right). */}
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-gold-accent/40 bg-void/60 px-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-emerald-glow">
                {'>> RESUME::VIEW'}
              </p>
              <p className="hidden font-mono text-[10px] uppercase tracking-[0.25em] text-bone sm:block">
                Nithesh_Ramachandran.pdf
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    play('click_primary');
                    triggerDownload();
                  }}
                  className="rounded-full border border-gold-accent/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-gold-accent transition hover:bg-gold-accent/10 focus:outline-none focus:ring-2 focus:ring-gold-accent"
                >
                  Download ↓
                </button>
                <button
                  type="button"
                  aria-label="Close résumé"
                  onClick={handleClose}
                  className="rounded-full border border-emerald-mid/50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-bone transition hover:border-emerald-hot hover:text-ivory focus:outline-none focus:ring-2 focus:ring-emerald-hot"
                >
                  Close ✕
                </button>
              </div>
            </div>

            {/* PDF body — full bleed */}
            <iframe
              src={PDF_PATH}
              title={`${content.hero.name} résumé`}
              className="flex-1 w-full bg-ivory"
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
