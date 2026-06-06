'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BrainCircuit,
  Cloud,
  Database,
  Layout,
  TerminalSquare,
  X,
} from 'lucide-react';
import { useEffect } from 'react';
import { play } from '@/lib/audio';
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

type Area = {
  title: string;
  // Lucide forwardRef components don't fit a plain ComponentType<{size}> — use any.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: any;
  blurb: string;
  items: readonly string[];
  accent?: 'warm' | 'cool';
};

const AREAS: readonly Area[] = [
  {
    title: 'FRONTEND',
    Icon: Layout,
    blurb: 'Production React applications with strong type safety + a11y baseline.',
    items: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'WCAG AA'],
  },
  {
    title: 'BACKEND',
    Icon: TerminalSquare,
    blurb: 'API-first services + serverless functions on Vercel / Netlify.',
    items: ['Node.js', 'Express', 'Python', 'REST APIs', 'JWT Auth', 'Vercel Functions'],
  },
  {
    title: 'DATABASE',
    Icon: Database,
    blurb: 'Schema design + integrations. Mongo for flex docs, Postgres for relations.',
    items: ['MongoDB', 'PostgreSQL', 'Prisma', 'Mongoose'],
  },
  {
    title: 'CLOUD & DEVOPS',
    Icon: Cloud,
    blurb: 'Build → deploy → observe loops on cloud platforms.',
    items: ['AWS', 'Docker', 'Vercel', 'Netlify', 'GitHub Actions', 'Git'],
  },
  {
    title: 'AI & AUTOMATION',
    Icon: BrainCircuit,
    blurb: 'LLM-powered features + agentic workflows.',
    items: ['OpenAI API', 'LangChain', 'Prompt Engineering', 'RAG', 'n8n', 'Embeddings'],
    accent: 'warm',
  },
];

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
              Five focus areas I ship in. Each area lists the libraries + tools I&apos;ve actually used in production.
            </p>

            <div className="full-stack-grid">
              {AREAS.map(({ title, Icon, blurb, items, accent }) => (
                <article key={title} className="full-stack-card">
                  <header className="full-stack-card-head">
                    <span
                      className={
                        accent === 'warm'
                          ? 'v11-row-icon v11-row-icon--warm'
                          : accent === 'cool'
                          ? 'v11-row-icon v11-row-icon--cool'
                          : 'v11-row-icon'
                      }
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
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
