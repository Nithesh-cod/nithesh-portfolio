'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef } from 'react';
import { content, type Project } from '@/lib/content';
import { play } from '@/lib/audio';
import { usePortfolioStore } from '@/lib/store';

const BACKDROP_VARIANTS = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
} as const;

const CARD_VARIANTS = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.97, y: 4, transition: { duration: 0.15, ease: 'easeIn' } },
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

  // Focus-restoration target: the originating proxy's aria-label fragment.
  useEffect(() => {
    if (activeProject) return;
    if (typeof window === 'undefined' || !lastProxyFocus) return;
    // Defer one frame so the modal fully unmounts first.
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
      {project ? <ModalShell project={project} onClose={closeWithSound} /> : null}
    </AnimatePresence>
  );
}

function ModalShell({ project, onClose }: { project: Project; onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const visitRef = useRef<HTMLAnchorElement>(null);

  // Focus trap: capture Tab cycles inside the modal; first focus → CTA.
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
      className="fixed inset-0 z-[70] flex items-center justify-center p-6"
      variants={BACKDROP_VARIANTS}
      initial="hidden"
      animate="visible"
      exit="exit"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-modal-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close project details"
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-void/75 backdrop-blur-md"
        style={{ backgroundImage: 'radial-gradient(ellipse at center, #10B9811a 0%, transparent 70%)' }}
      />

      {/* Card */}
      <motion.div
        ref={cardRef}
        className="relative z-10 w-full max-w-xl rounded-xl border border-emerald-mid/40 bg-graphite/85 p-8 shadow-[0_0_60px_-12px_#10B98144] backdrop-blur-xl"
        variants={CARD_VARIANTS}
      >
        {/* Thin gold corner accents */}
        <span aria-hidden className="absolute left-0 top-0 h-3 w-3 border-l border-t border-gold-accent" />
        <span aria-hidden className="absolute right-0 top-0 h-3 w-3 border-r border-t border-gold-accent" />
        <span aria-hidden className="absolute left-0 bottom-0 h-3 w-3 border-l border-b border-gold-accent" />
        <span aria-hidden className="absolute right-0 bottom-0 h-3 w-3 border-r border-b border-gold-accent" />

        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-emerald-mid">
          {project.stack.join(' · ')}
        </p>
        <h2 id="project-modal-title" className="mt-2 font-display text-3xl text-ivory">
          {project.name}
        </h2>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-gold-accent">
          {project.caption}
        </p>
        <p className="mt-5 text-bone">{project.summary}</p>

        <div className="mt-8 flex items-center justify-between gap-4">
          <a
            ref={visitRef}
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-emerald-mid/70 px-5 py-2 font-mono text-xs uppercase tracking-[0.2em] text-ivory transition hover:border-emerald-hot hover:bg-emerald-mid/10 focus:outline-none focus:ring-2 focus:ring-emerald-hot"
            onClick={() => play('click_primary')}
          >
            Visit live site →
          </a>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-bone hover:text-ivory focus:outline-none focus:ring-2 focus:ring-emerald-hot"
          >
            Close (Esc)
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
