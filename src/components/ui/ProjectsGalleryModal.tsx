'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, X } from 'lucide-react';
import { useEffect } from 'react';
import { content } from '@/lib/content';
import { play } from '@/lib/audio';
import { usePortfolioStore } from '@/lib/store';

/* V13.0 — gallery modal showing all 3 projects side-by-side instead
 * of opening just CropAI. */

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

export function ProjectsGalleryModal() {
  const open = usePortfolioStore((s) => s.projectsGalleryOpen);
  const close = usePortfolioStore((s) => s.closeProjectsGallery);

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
          key="projects-gallery-backdrop"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/72 backdrop-blur-md p-4"
          variants={BACKDROP}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-label="All projects"
        >
          <motion.div
            key="projects-gallery-panel"
            className="detail-modal projects-gallery-modal"
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

            <p className="detail-modal-eyebrow">{'>> PROJECTS :: GALLERY'}</p>
            <h2 className="detail-modal-title">[ ALL WORK ]</h2>

            <div className="projects-gallery-grid">
              {content.projects.map((p) => (
                <article key={p.slug} className="projects-gallery-card">
                  <h3 className="projects-gallery-name">{p.name}</h3>
                  <p className="projects-gallery-caption">{p.caption}</p>
                  <p className="projects-gallery-body">{p.summary}</p>

                  <div className="projects-gallery-pills">
                    {p.stack.map((s) => (
                      <span key={s} className="detail-modal-pill">{s}</span>
                    ))}
                  </div>

                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="detail-modal-cta projects-gallery-cta"
                    onClick={() => play('click_primary')}
                  >
                    VIEW LIVE
                    <ArrowUpRight size={14} />
                  </a>
                </article>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
