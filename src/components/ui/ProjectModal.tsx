'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, X } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { content, type Project } from '@/lib/content';
import { play } from '@/lib/audio';
import { usePortfolioStore } from '@/lib/store';

/* V12.2 — refresh of the project detail modal to the V11.2 palette
 * + reference-style layout. Uses the shared .detail-modal CSS class
 * (defined in globals.css under FIX 9). Single column body so the
 * existing project content (caption, stack, summary) reads cleanly
 * without inventing fields that don't exist in content.ts. */

const BACKDROP = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.20, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
} as const;

const CARD = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.30, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.18, ease: 'easeIn' } },
} as const;

export function ProjectModal() {
  const activeProject = usePortfolioStore((s) => s.activeProject);
  const close = usePortfolioStore((s) => s.closeProject);
  const lastProxyFocus = usePortfolioStore((s) => s.lastProxyFocus);

  const project = useMemo<Project | null>(
    () => (activeProject ? (content.projects.find((p) => p.slug === activeProject) ?? null) : null),
    [activeProject],
  );

  const closeWithSound = () => {
    play('click_secondary');
    close();
  };

  useEffect(() => {
    if (activeProject) return;
    if (typeof window === 'undefined' || !lastProxyFocus) return;
    const id = window.requestAnimationFrame(() => {
      const all = document.querySelectorAll<HTMLButtonElement>('button[aria-label]');
      const match = Array.from(all).find((b) =>
        b.getAttribute('aria-label')?.toLowerCase().startsWith(lastProxyFocus),
      );
      match?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [activeProject, lastProxyFocus]);

  return (
    <AnimatePresence>
      {project ? <ProjectShell project={project} onClose={closeWithSound} /> : null}
    </AnimatePresence>
  );
}

function ProjectShell({ project, onClose }: { project: Project; onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const visitRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    visitRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !cardRef.current) return;
      const focusables = cardRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/72 backdrop-blur-md"
      variants={BACKDROP}
      initial="hidden"
      animate="visible"
      exit="exit"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-modal-title"
      onClick={onClose}
    >
      <motion.div
        ref={cardRef}
        className="detail-modal"
        variants={CARD}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Corner L-brackets. */}
        <span aria-hidden className="detail-modal-bracket detail-modal-bracket--tl" />
        <span aria-hidden className="detail-modal-bracket detail-modal-bracket--tr" />
        <span aria-hidden className="detail-modal-bracket detail-modal-bracket--bl" />
        <span aria-hidden className="detail-modal-bracket detail-modal-bracket--br" />

        {/* Close button. */}
        <button
          type="button"
          onClick={onClose}
          className="detail-modal-close"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Eyebrow. */}
        <p className="detail-modal-eyebrow">{'>> PROJECT :: DETAIL'}</p>

        {/* Title. */}
        <h2 id="project-modal-title" className="detail-modal-title">
          {project.name}
        </h2>

        {/* Caption. */}
        <p className="detail-modal-caption">{project.caption}</p>

        {/* Tech stack pills. */}
        <div className="detail-modal-section">
          <PanelHeader>TECH STACK</PanelHeader>
          <div className="detail-modal-pills">
            {project.stack.map((s) => (
              <span key={s} className="detail-modal-pill">{s}</span>
            ))}
          </div>
        </div>

        {/* Summary. */}
        <div className="detail-modal-section">
          <PanelHeader>OVERVIEW</PanelHeader>
          <p className="detail-modal-body">{project.summary}</p>
        </div>

        {/* Actions row. */}
        <div className="detail-modal-actions">
          <a
            ref={visitRef}
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="detail-modal-cta"
            onClick={() => play('click_primary')}
          >
            VIEW LIVE
            <ArrowUpRight size={14} />
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* Inline panel-header (extracted as a shared helper here; see also
 * RoomPanels.tsx where the same visual bracket-pair is rendered by
 * v11-card-header CSS class). */
function PanelHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="detail-modal-section-header">
      <span className="bracket">[</span>
      <span>{children}</span>
      <span className="bracket">]</span>
    </div>
  );
}
