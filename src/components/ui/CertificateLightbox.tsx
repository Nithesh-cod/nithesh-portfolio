'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Award,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  QrCode,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useRef } from 'react';
import { certificateGroups, content, type Certificate } from '@/lib/content';
import { play } from '@/lib/audio';
import { usePortfolioStore } from '@/lib/store';

/* Three-column certificate viewer: thumbnail rail + pager, the certificate
 * itself, and a details column with verification and open-in-tab. */

const BACKDROP = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
} as const;

const PANEL = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.26, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.15, ease: 'easeIn' } },
} as const;

const ALL: readonly Certificate[] = certificateGroups.flatMap((g) => g.certs);

export function CertificateLightbox() {
  const lightboxCertId = usePortfolioStore((s) => s.lightboxCertId);
  const openCertificate = usePortfolioStore((s) => s.openCertificate);
  const closeCertificate = usePortfolioStore((s) => s.closeCertificate);
  const railRef = useRef<HTMLDivElement>(null);

  const index = useMemo(() => ALL.findIndex((c) => c.id === lightboxCertId), [lightboxCertId]);
  const cert = index >= 0 ? ALL[index]! : null;

  const close = () => {
    play('click_secondary');
    closeCertificate();
  };
  const step = (d: number) => {
    if (index < 0) return;
    play('click_secondary');
    openCertificate(ALL[(index + d + ALL.length) % ALL.length]!.id);
  };

  useEffect(() => {
    if (!cert) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        step(1);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        step(-1);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // close/step read the latest index each render; rebinding per cert is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cert]);

  useEffect(() => {
    railRef.current?.querySelector<HTMLElement>('.is-active')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [index]);

  return (
    <AnimatePresence>
      {cert ? (
        <motion.div
          key="cert-viewer"
          role="dialog"
          aria-modal="true"
          aria-label={`${cert.title} certificate`}
          className="fixed inset-0 z-[72] flex items-center justify-center p-4"
          variants={BACKDROP}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <button
            type="button"
            aria-label="Close certificate"
            onClick={close}
            className="absolute inset-0 cursor-pointer bg-black/75 backdrop-blur-md"
          />

          <motion.div className="cv-modal" variants={PANEL}>
            <button type="button" onClick={close} className="pd-close" aria-label="Close">
              <X size={16} />
            </button>

            <aside className="cv-rail">
              <header className="cv-rail-head">
                <span className="pd-icon cv-rail-icon"><Award size={20} /></span>
                <div>
                  <p>CERTIFICATE</p>
                  <strong>{cert.title}</strong>
                  <small>({cert.issuer})</small>
                </div>
              </header>
              <div ref={railRef} className="cv-thumbs">
                {ALL.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={c.id === cert.id ? 'cv-thumb is-active' : 'cv-thumb'}
                    aria-label={c.title}
                    aria-current={c.id === cert.id}
                    onClick={() => openCertificate(c.id)}
                  >
                    <Image src={c.image} alt="" fill sizes="140px" className="object-cover" />
                  </button>
                ))}
              </div>
              <div className="cv-pager">
                <button type="button" aria-label="Previous certificate" onClick={() => step(-1)}><ChevronUp size={16} /></button>
                <span>{index + 1} / {ALL.length}</span>
                <button type="button" aria-label="Next certificate" onClick={() => step(1)}><ChevronDown size={16} /></button>
              </div>
            </aside>

            <figure className="cv-stage">
              <span aria-hidden className="cv-corner cv-corner--tl" />
              <span aria-hidden className="cv-corner cv-corner--br" />
              <Image
                key={cert.id}
                src={cert.image}
                alt={`${cert.title} — ${cert.issuer} — ${cert.date}`}
                width={1200}
                height={780}
                priority
                className="cv-image"
              />
            </figure>

            <aside className="cv-details">
              <header className="cv-details-head"><ShieldCheck size={18} /> CERTIFICATE DETAILS</header>
              <dl>
                <Detail icon={<User size={16} />} label="Name" value={content.hero.name} />
                <Detail icon={<BookOpen size={16} />} label="Course" value={cert.title} />
                <Detail icon={<Building2 size={16} />} label="Issued by" value={cert.issuer} />
                <Detail icon={<CalendarDays size={16} />} label="Date" value={cert.date} />
              </dl>
              <div className="cv-verify">
                <span className="pd-icon"><QrCode size={18} /></span>
                <div>
                  <strong>Scan to verify</strong>
                  <span>The QR code on the certificate links to the issuer&apos;s verification page.</span>
                </div>
              </div>
              <a
                className="pd-cta pd-cta--primary cv-open"
                href={cert.image}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => play('click_primary')}
              >
                OPEN IN NEW TAB <ExternalLink size={14} />
              </a>
            </aside>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="cv-detail">
      <span className="cv-detail-icon">{icon}</span>
      <div>
        <dt>{label}</dt>
        <dd>{value}</dd>
      </div>
    </div>
  );
}
