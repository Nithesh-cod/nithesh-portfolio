'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import Image from 'next/image';
import { useEffect } from 'react';
import { certificateGroups } from '@/lib/content';
import { usePortfolioStore } from '@/lib/store';
import { play } from '@/lib/audio';

/* V12.1 — Full grid of all 12 certificates. Opens from the cert rack's
 * VIEW DETAILED CERTIFICATES button. Each tile clickable → opens the
 * existing CertificateLightbox for the individual cert. */

const BACKDROP = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.20, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
} as const;

const PANEL = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.18, ease: 'easeIn' } },
} as const;

export function AllCertsModal() {
  const open = usePortfolioStore((s) => s.allCertsOpen);
  const close = usePortfolioStore((s) => s.closeAllCerts);
  const openCert = usePortfolioStore((s) => s.openCertificate);

  const certs = certificateGroups.flatMap((g) => g.certs);

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
          key="all-certs-backdrop"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md"
          variants={BACKDROP}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleClose}
        >
          <motion.div
            key="all-certs-panel"
            role="dialog"
            aria-modal="true"
            aria-label="All certificates"
            className="relative max-h-[88vh] w-[min(92vw,1100px)] overflow-y-auto rounded-xl border border-neon-bright/40 bg-[rgba(6,16,22,0.85)] p-6 sm:p-8"
            style={{
              backdropFilter: 'blur(32px) saturate(150%)',
              WebkitBackdropFilter: 'blur(32px) saturate(150%)',
              boxShadow:
                '0 0 40px rgba(46, 255, 176, 0.15), 0 50px 80px rgba(0,0,0,0.6), inset 0 0 60px rgba(46,255,176,0.03)',
            }}
            variants={PANEL}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Corner brackets. */}
            <span aria-hidden className="pointer-events-none absolute left-[-2px] top-[-2px] h-4 w-4 border-l-2 border-t-2 border-neon-green" />
            <span aria-hidden className="pointer-events-none absolute right-[-2px] top-[-2px] h-4 w-4 border-r-2 border-t-2 border-neon-green" />
            <span aria-hidden className="pointer-events-none absolute left-[-2px] bottom-[-2px] h-4 w-4 border-b-2 border-l-2 border-neon-green" />
            <span aria-hidden className="pointer-events-none absolute right-[-2px] bottom-[-2px] h-4 w-4 border-b-2 border-r-2 border-neon-green" />

            {/* Close button. */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-neon-green/40 bg-bg-base/60 text-neon-bright transition hover:bg-neon-green/20 hover:shadow-[0_0_14px_rgba(46,255,176,0.45)]"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            {/* Header. */}
            <div className="mb-6 flex flex-col items-center gap-2">
              <h2
                className="text-center font-display text-[18px] font-bold uppercase tracking-[0.30em] text-neon-bright"
                style={{ textShadow: '0 0 14px rgba(46, 255, 176, 0.55)' }}
              >
                [ ALL CERTIFICATIONS ]
              </h2>
              <p className="text-center font-mono text-[10px] uppercase tracking-[0.22em] text-text-sec">
                {certs.length} / {certs.length} VERIFIED · CONTINUOUSLY GROWING
              </p>
            </div>

            {/* 4×3 grid. */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {certs.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    play('click_primary');
                    openCert(c.id);
                  }}
                  className="group relative overflow-hidden rounded-md border border-neon-green/35 bg-bg-base/40 p-2 text-left transition hover:border-neon-bright hover:shadow-[0_0_18px_rgba(46,255,176,0.45)]"
                  title={c.title}
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-black/40">
                    <Image
                      src={c.image}
                      alt={c.title}
                      fill
                      sizes="(min-width: 1024px) 240px, (min-width: 640px) 30vw, 45vw"
                      className="object-cover opacity-95 transition group-hover:opacity-100"
                    />
                  </div>
                  <div className="mt-2 line-clamp-2 font-mono text-[9px] uppercase tracking-[0.14em] text-text-prim">
                    {c.title}
                  </div>
                  <div className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.18em] text-text-sec">
                    {c.issuer} · {c.date}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
