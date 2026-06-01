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
        className="absolute inset-0 cursor-pointer bg-void/80 backdrop-blur-md"
        style={{ backgroundImage: 'radial-gradient(ellipse at center, #10B9811a 0%, transparent 70%)' }}
      />

      {/* Card */}
      <motion.div
        ref={cardRef}
        className="relative z-10 w-full max-w-3xl overflow-hidden rounded-md border border-emerald-mid/30 bg-graphite/85 shadow-[0_0_80px_-12px_#10B98144] backdrop-blur-xl"
        style={{ backdropFilter: 'blur(20px) saturate(140%)' }}
        variants={CARD_VARIANTS}
      >
        {/* Gold corner brackets */}
        <span aria-hidden className="absolute left-2 top-2 z-10 h-4 w-4 border-l border-t border-gold-accent" />
        <span aria-hidden className="absolute right-2 top-2 z-10 h-4 w-4 border-r border-t border-gold-accent" />
        <span aria-hidden className="absolute left-2 bottom-2 z-10 h-4 w-4 border-l border-b border-gold-accent" />
        <span aria-hidden className="absolute right-2 bottom-2 z-10 h-4 w-4 border-r border-b border-gold-accent" />

        {/* Top bar — mono header + bracketed close */}
        <div className="flex items-center justify-between border-b border-emerald-mid/25 bg-void/40 px-6 py-2.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-emerald-glow">
            {'>> PROJECT::DETAIL'}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="font-mono text-[11px] uppercase tracking-[0.25em] text-bone transition hover:text-ivory focus:outline-none focus:ring-1 focus:ring-emerald-hot"
          >
            [ ✕ Close ]
          </button>
        </div>

        {/* 2-column body — left decorative panel + right details. */}
        <div className="grid grid-cols-1 gap-0 md:grid-cols-[40%_60%]">
          {/* Left: decorative scanline-overlayed plate carrying the project name as huge watermark.
              No external screenshot asset; this is the in-house treatment. */}
          <div className="relative hidden h-72 overflow-hidden border-r border-emerald-mid/25 bg-gradient-to-br from-void via-graphite to-void md:block">
            <div
              aria-hidden
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(to bottom, transparent 0 3px, #34F5A40d 3px 4px)',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center px-4">
              <p className="font-sci text-[44px] font-black uppercase leading-none tracking-[0.18em] text-emerald-glow/70 [text-shadow:0_0_18px_#34F5A444]">
                {project.name.split(' ')[0] ?? project.name}
              </p>
            </div>
            <span aria-hidden className="absolute left-3 top-3 h-3 w-3 border-l border-t border-gold-accent" />
            <span aria-hidden className="absolute right-3 top-3 h-3 w-3 border-r border-t border-gold-accent" />
            <span aria-hidden className="absolute left-3 bottom-3 h-3 w-3 border-l border-b border-gold-accent" />
            <span aria-hidden className="absolute right-3 bottom-3 h-3 w-3 border-r border-b border-gold-accent" />
          </div>

          {/* Right: details */}
          <div className="p-6 md:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-emerald-mid">
              {project.stack.join(' · ')}
            </p>
            <h2
              id="project-modal-title"
              className="mt-2 font-sci text-[28px] font-black uppercase leading-tight tracking-[0.08em] text-ivory [text-shadow:0_0_8px_#34F5A422]"
              style={{ WebkitTextStroke: '0.5px #C9A961' }}
            >
              {project.name}
            </h2>
            <p className="mt-1 font-mono text-[12px] uppercase tracking-[0.18em] text-gold-accent">
              {project.caption}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {project.stack.map((s) => (
                <span
                  key={s}
                  className="rounded-sm border border-emerald-mid/25 bg-void/40 px-2.5 py-1 font-mono text-[11px] text-ivory"
                >
                  {s}
                </span>
              ))}
            </div>

            <p className="mt-5 text-[14px] leading-relaxed text-bone">{project.summary}</p>

            <div className="mt-6">
              <a
                ref={visitRef}
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-emerald-mid/70 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.25em] text-ivory transition hover:border-gold-accent hover:bg-emerald-mid/10 focus:outline-none focus:ring-2 focus:ring-emerald-hot"
                onClick={() => play('click_primary')}
              >
                Visit live
                <span className="text-gold-accent transition-transform group-hover:translate-x-1">↗</span>
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
