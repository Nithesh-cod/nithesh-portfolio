'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import { content, waypoints } from '@/lib/content';
import { play } from '@/lib/audio';
import { usePortfolioStore } from '@/lib/store';

/**
 * Glass HUD overlays for the skills, contact, and CRT waypoints.
 * Replaces the floating 3D Billboard text from V2.2. Section-gated so each
 * panel only mounts when the visitor is at its waypoint.
 */
export function HudPanels() {
  const section = usePortfolioStore((s) => s.section);
  const skillsIdx = useMemo(() => waypoints.findIndex((w) => w.id === 'skills'), []);
  const contactIdx = useMemo(() => waypoints.findIndex((w) => w.id === 'contact'), []);
  const crtIdx = useMemo(() => waypoints.findIndex((w) => w.id === 'crt'), []);

  return (
    <>
      <SkillsPanel show={section === skillsIdx} />
      <ContactPanel show={section === contactIdx} />
      <CrtHintPanel show={section === crtIdx} />
    </>
  );
}

/* ──────────────────────── shared chrome ──────────────────────── */

function PanelFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-md border border-emerald-mid/30 bg-void/55 p-6 shadow-[0_0_60px_-12px_#10B98144] backdrop-blur-md ${className ?? ''}`}
      style={{ backdropFilter: 'blur(16px) saturate(140%)' }}
    >
      {/* 4 gold L-bracket corners */}
      <span aria-hidden className="absolute left-2 top-2 h-3 w-3 border-l border-t border-gold-accent" />
      <span aria-hidden className="absolute right-2 top-2 h-3 w-3 border-r border-t border-gold-accent" />
      <span aria-hidden className="absolute left-2 bottom-2 h-3 w-3 border-l border-b border-gold-accent" />
      <span aria-hidden className="absolute right-2 bottom-2 h-3 w-3 border-r border-b border-gold-accent" />
      {children}
    </div>
  );
}

const PANEL_ANIM = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  exit: { opacity: 0, x: 40, transition: { duration: 0.3, ease: 'easeIn' } },
} as const;

/* ──────────────────────── Skills panel ──────────────────────── */

function SkillsPanel({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.aside
          key="skills"
          className="pointer-events-auto fixed right-8 top-1/4 z-40 w-[380px]"
          variants={PANEL_ANIM}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <PanelFrame>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-emerald-glow">
              {'>> SYS::CAPABILITIES'}
            </p>
            <div className="my-3 h-px w-full bg-gold-accent/60" />
            <div className="flex flex-col gap-4">
              {Object.entries(content.skills).map(([heading, items]) => (
                <div key={heading}>
                  <p className="font-sci text-[13px] font-bold uppercase tracking-[0.15em] text-gold-accent">
                    {heading}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {items.map((item) => (
                      <span
                        key={item}
                        className="rounded-sm border border-emerald-mid/25 bg-graphite/60 px-2.5 py-1 font-mono text-[11px] text-ivory"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </PanelFrame>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

/* ──────────────────────── Contact panel ──────────────────────── */

function ContactPanel({ show }: { show: boolean }) {
  const openResume = usePortfolioStore((s) => s.openResume);
  const rows = [
    {
      label: 'LinkedIn',
      detail: `/in/${content.contact.linkedin.split('/in/')[1] ?? 'nithesh'}`,
      onActivate: () =>
        window.open(content.contact.linkedin, '_blank', 'noopener,noreferrer'),
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect width="4" height="12" x="2" y="9" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      ),
    },
    {
      label: 'Email',
      detail: content.contact.email,
      onActivate: () => {
        window.location.href = `mailto:${content.contact.email}`;
      },
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      ),
    },
    {
      label: 'Open Résumé',
      detail: 'PDF',
      onActivate: openResume,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        </svg>
      ),
    },
  ];

  return (
    <AnimatePresence>
      {show ? (
        <motion.aside
          key="contact"
          className="pointer-events-auto fixed right-8 bottom-[18%] z-40 w-[380px]"
          variants={PANEL_ANIM}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <PanelFrame>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-emerald-glow">
              {'>> CONNECT::CHANNELS'}
            </p>
            <div className="my-3 h-px w-full bg-gold-accent/60" />
            <ul className="flex flex-col gap-1">
              {rows.map((r) => (
                <li key={r.label}>
                  <button
                    type="button"
                    onClick={() => {
                      play('click_primary');
                      r.onActivate();
                    }}
                    className="group flex w-full items-center justify-between gap-3 rounded-sm border-b border-transparent px-2 py-2.5 text-left transition hover:border-gold-accent/60 hover:bg-emerald-mid/10 focus:outline-none focus:ring-1 focus:ring-emerald-hot"
                  >
                    <span className="flex items-center gap-3 text-ivory">
                      <span className="text-emerald-glow">{r.icon}</span>
                      <span className="font-sci text-[12px] font-bold uppercase tracking-[0.15em]">
                        {r.label}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 font-mono text-[11px] text-bone">
                      <span>{r.detail}</span>
                      <span className="text-gold-accent transition-transform group-hover:translate-x-1">↗</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-bone">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-hot shadow-[0_0_6px_#34F5A4]" />
              Status — Available for Summer 2026
            </div>
          </PanelFrame>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

/* ──────────────────────── CRT hint panel ──────────────────────── */

function CrtHintPanel({ show }: { show: boolean }) {
  const openTerminal = usePortfolioStore((s) => s.openTerminal);
  return (
    <AnimatePresence>
      {show ? (
        <motion.aside
          key="crt-hint"
          className="pointer-events-auto fixed left-1/2 bottom-[12%] z-40 w-[320px] -translate-x-1/2"
          variants={PANEL_ANIM}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <PanelFrame>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-emerald-glow">
              {'>> CRT::TERMINAL'}
            </p>
            <div className="my-3 h-px w-full bg-gold-accent/60" />
            <p className="mb-3 font-mono text-[11px] text-bone">
              Click the CRT or press <kbd className="rounded-sm border border-emerald-mid/40 bg-graphite/60 px-1.5 py-0.5 font-mono text-[10px] text-ivory">`</kbd> to open the in-scene terminal. Commands: help · projects · skills · contact · matrix · sudo hire-me
            </p>
            <button
              type="button"
              onClick={() => {
                play('click_primary');
                openTerminal();
              }}
              className="w-full rounded-full border border-emerald-mid/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ivory transition hover:border-emerald-hot hover:bg-emerald-mid/10 focus:outline-none focus:ring-2 focus:ring-emerald-hot"
            >
              Open Terminal
            </button>
          </PanelFrame>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
