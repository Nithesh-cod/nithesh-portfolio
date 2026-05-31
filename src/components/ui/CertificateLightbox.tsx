'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useMemo } from 'react';
import { certificateGroups, type Certificate } from '@/lib/content';
import { play } from '@/lib/audio';
import { usePortfolioStore } from '@/lib/store';

const BACKDROP = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
} as const;

const PANEL = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.97, y: 4, transition: { duration: 0.15, ease: 'easeIn' } },
} as const;

const ALL: ReadonlyMap<string, Certificate> = new Map(
  certificateGroups.flatMap((g) => g.certs.map((c) => [c.id, c] as const)),
);

export function CertificateLightbox() {
  const lightboxCertId = usePortfolioStore((s) => s.lightboxCertId);
  const closeCertificate = usePortfolioStore((s) => s.closeCertificate);

  const cert = useMemo(
    () => (lightboxCertId ? (ALL.get(lightboxCertId) ?? null) : null),
    [lightboxCertId],
  );

  const close = () => {
    play('click_secondary');
    closeCertificate();
  };

  // Esc closes; focus trap is implicit (only the close button is focusable).
  useEffect(() => {
    if (!cert) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // close is stable enough; intentional dep skip to avoid re-binding on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cert]);

  return (
    <AnimatePresence>
      {cert ? (
        <motion.div
          key={cert.id}
          role="dialog"
          aria-modal="true"
          aria-label={`${cert.title} certificate`}
          className="fixed inset-0 z-[72] flex items-center justify-center p-6"
          variants={BACKDROP}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <button
            type="button"
            aria-label="Close certificate"
            onClick={close}
            className="absolute inset-0 cursor-pointer bg-void/85 backdrop-blur-md"
          />

          <motion.div
            className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col items-center"
            variants={PANEL}
          >
            <div className="relative w-full overflow-hidden rounded-lg border border-gold-accent/60 bg-graphite/60 shadow-[0_0_60px_-10px_#C9A96155]">
              {/* Aspect placeholder; image scales to fit. */}
              <Image
                src={cert.image}
                alt={`${cert.title} — ${cert.issuer} — ${cert.date}`}
                width={1200}
                height={900}
                priority
                className="block h-auto max-h-[80vh] w-full object-contain"
              />
            </div>
            <div className="mt-4 flex w-full items-center justify-between gap-4 text-ivory">
              <div>
                <p className="font-display text-lg leading-tight">{cert.title}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-bone">
                  {cert.issuer} · {cert.date}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-full border border-emerald-mid/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-bone transition hover:border-emerald-hot hover:text-ivory focus:outline-none focus:ring-2 focus:ring-emerald-hot"
              >
                Close (Esc)
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
