'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, ChevronLeft, ChevronRight, FileText, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GitHubIcon } from '@/components/ui/BrandIcons';
import { FeatureIconView, ProjectIcon } from '@/components/ui/ProjectIcons';
import { projectById, type ShowcaseProject } from '@/lib/content';
import { play } from '@/lib/audio';
import { usePortfolioStore } from '@/lib/store';

/* Two-column project detail: info + actions on the left, screenshot
 * carousel + three feature tiles on the right. Works for every project in
 * content.allProjects; projects without a deployment get a placeholder
 * stage instead of screenshots. */

const BACKDROP = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
} as const;

const CARD = {
  hidden: { opacity: 0, scale: 0.96, y: 18 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, scale: 0.96, y: 18, transition: { duration: 0.18, ease: 'easeIn' } },
} as const;

export function ProjectModal() {
  const activeProject = usePortfolioStore((s) => s.activeProject);
  const close = usePortfolioStore((s) => s.closeProject);
  const lastProxyFocus = usePortfolioStore((s) => s.lastProxyFocus);

  const project = useMemo(() => (activeProject ? projectById(activeProject) : null), [activeProject]);

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
      {project ? <ProjectShell key={project.id} project={project} onClose={closeWithSound} /> : null}
    </AnimatePresence>
  );
}

function ProjectShell({ project, onClose }: { project: ShowcaseProject; onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const firstActionRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    firstActionRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !cardRef.current) return;
      const focusables = cardRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
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
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/72 p-4 backdrop-blur-md"
      variants={BACKDROP}
      initial="hidden"
      animate="visible"
      exit="exit"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-modal-title"
      onClick={onClose}
    >
      <motion.div ref={cardRef} className="pd-modal" variants={CARD} onClick={(e) => e.stopPropagation()}>
        <span aria-hidden className="detail-modal-bracket detail-modal-bracket--tl" />
        <span aria-hidden className="detail-modal-bracket detail-modal-bracket--tr" />
        <span aria-hidden className="detail-modal-bracket detail-modal-bracket--bl" />
        <span aria-hidden className="detail-modal-bracket detail-modal-bracket--br" />

        <button type="button" onClick={onClose} className="pd-close" aria-label="Close">
          <X size={16} />
        </button>

        <div className="pd-grid">
          <div className="pd-info">
            <div className="pd-head">
              <span className="pd-icon"><ProjectIcon id={project.id} size={26} /></span>
              <div>
                <p className="pd-eyebrow">{'>> PROJECT  >> DETAIL'}</p>
                <h2 id="project-modal-title" className="pd-title">
                  {project.name}
                  {project.status && <span className="projects-gallery-status">{project.status.toUpperCase()}</span>}
                </h2>
              </div>
            </div>
            <p className="pd-tagline">{project.tagline}</p>

            <div className="pd-pills">
              {project.stack.map((s) => (
                <span key={s} className="detail-modal-pill">{s}</span>
              ))}
            </div>

            <h3 className="pd-section"><FileText size={14} /> OVERVIEW</h3>
            <p className="pd-body">{project.summary}</p>

            <div className="pd-actions">
              {project.url && (
                <a
                  ref={firstActionRef}
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pd-cta pd-cta--primary"
                  onClick={() => play('click_primary')}
                >
                  VIEW LIVE <ArrowUpRight size={15} />
                </a>
              )}
              {project.repo && (
                <a
                  ref={project.url ? undefined : firstActionRef}
                  href={project.repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pd-cta"
                  onClick={() => play('click_secondary')}
                >
                  VIEW CODE <GitHubIcon size={15} />
                </a>
              )}
            </div>
          </div>

          <div className="pd-media">
            {project.screenshots.length > 0 ? (
              <Screens project={project} />
            ) : (
              <div className="pd-stage pd-stage--empty">
                <span className="pd-stage-icon"><ProjectIcon id={project.id} size={54} /></span>
                <p>No public deployment yet — the full source is on GitHub.</p>
              </div>
            )}
            <div className="pd-features">
              {project.features.map((f) => (
                <div key={f.label} className="pd-feature">
                  <FeatureIconView icon={f.icon} />
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Slide 0 composes the desktop shot in a browser frame with the phone shot
 *  overlaid; the next slides show each capture on its own. */
function Screens({ project }: { project: ShowcaseProject }) {
  const desktop = project.screenshots.find((s) => s.includes('desktop')) ?? project.screenshots[0]!;
  const mobile = project.screenshots.find((s) => s.includes('mobile'));
  const slides = mobile ? (['combo', 'desktop', 'mobile'] as const) : (['desktop'] as const);
  const [index, setIndex] = useState(0);
  const slide = slides[index] ?? 'desktop';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % slides.length);
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + slides.length) % slides.length);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [slides.length]);

  const go = (d: number) => {
    play('click_secondary');
    setIndex((i) => (i + d + slides.length) % slides.length);
  };

  return (
    <div className="pd-stage">
      {slide !== 'mobile' && (
        <div className={slide === 'combo' ? 'pd-browser pd-browser--combo' : 'pd-browser'}>
          <div className="pd-browser-bar" aria-hidden>
            <i /><i /><i />
            <span>{project.url?.replace(/^https?:\/\//, '')}</span>
          </div>
          <div className="pd-browser-view">
            <Image src={desktop} alt={`${project.name} — desktop view`} fill sizes="(max-width: 900px) 90vw, 520px" className="object-cover object-top" />
          </div>
        </div>
      )}
      {mobile && slide !== 'desktop' && (
        <div className={slide === 'combo' ? 'pd-phone pd-phone--combo' : 'pd-phone'}>
          <Image src={mobile} alt={`${project.name} — phone view`} fill sizes="200px" className="object-cover object-top" />
        </div>
      )}

      {slides.length > 1 && (
        <>
          <button type="button" className="pd-arrow pd-arrow--l" aria-label="Previous screenshot" onClick={() => go(-1)}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="pd-arrow pd-arrow--r" aria-label="Next screenshot" onClick={() => go(1)}>
            <ChevronRight size={18} />
          </button>
          <div className="pd-dots" role="tablist" aria-label="Screenshots">
            {slides.map((s, i) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Screenshot ${i + 1}`}
                className={i === index ? 'is-active' : undefined}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
