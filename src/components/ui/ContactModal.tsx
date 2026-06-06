'use client';

import emailjs from '@emailjs/browser';
import { AnimatePresence, motion } from 'framer-motion';
import { Mail, Send, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { content } from '@/lib/content';
import { play } from '@/lib/audio';
import { usePortfolioStore } from '@/lib/store';

/* V13.0 — EmailJS-backed contact form.
 *
 * Env vars (set in .env.local + Vercel project settings):
 *   NEXT_PUBLIC_EMAILJS_SERVICE_ID
 *   NEXT_PUBLIC_EMAILJS_TEMPLATE_ID
 *   NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
 *
 * EmailJS template MUST use these exact variable keys:
 *   {{name}} {{mobile}} {{email}} {{message}} */

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

type Status = 'idle' | 'sending' | 'success' | 'error';

export function ContactModal() {
  const open = usePortfolioStore((s) => s.contactOpen);
  const close = usePortfolioStore((s) => s.closeContact);

  const [form, setForm] = useState({ name: '', mobile: '', email: '', message: '' });
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

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

  const reset = () => {
    setForm({ name: '', mobile: '', email: '', message: '' });
    setStatus('idle');
    setErrorMsg('');
  };

  const handleClose = () => {
    play('click_secondary');
    close();
    // Defer the reset so the closing animation doesn't reflow content.
    setTimeout(reset, 250);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;

    const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
    const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
    const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

    if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
      setStatus('error');
      setErrorMsg(
        'Contact form is not configured. Please email directly: nithesh.r.ciet@gmail.com',
      );
      return;
    }

    setStatus('sending');
    setErrorMsg('');
    play('click_primary');

    try {
      // Template params use the EXACT keys: name / mobile / email / message
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          name: form.name,
          mobile: form.mobile,
          email: form.email,
          message: form.message,
        },
        { publicKey: PUBLIC_KEY },
      );
      setStatus('success');
      setForm({ name: '', mobile: '', email: '', message: '' });
      // Auto-close after success.
      setTimeout(() => {
        close();
        setTimeout(() => setStatus('idle'), 250);
      }, 1800);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ContactModal] EmailJS send failed:', err);
      setStatus('error');
      setErrorMsg(
        err instanceof Error ? err.message : 'Send failed. Please email directly.',
      );
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="contact-backdrop"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/72 backdrop-blur-md p-4"
          variants={BACKDROP}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-label="Contact Nithesh"
        >
          <motion.div
            key="contact-panel"
            className="detail-modal contact-modal"
            variants={PANEL}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Corner brackets. */}
            <span aria-hidden className="detail-modal-bracket detail-modal-bracket--tl" />
            <span aria-hidden className="detail-modal-bracket detail-modal-bracket--tr" />
            <span aria-hidden className="detail-modal-bracket detail-modal-bracket--bl" />
            <span aria-hidden className="detail-modal-bracket detail-modal-bracket--br" />

            {/* Close. */}
            <button
              type="button"
              onClick={handleClose}
              className="detail-modal-close"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <p className="detail-modal-eyebrow">{'>> CONTACT :: FORM'}</p>
            <h2 className="detail-modal-title">[ LET&apos;S CONNECT ]</h2>
            <p className="contact-intro">
              Have a project in mind? Want to collaborate? Drop me a message and I&apos;ll get back to you.
            </p>

            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-group">
                <label htmlFor="contact-name">NAME</label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your full name"
                  autoComplete="name"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="contact-mobile">MOBILE</label>
                  <input
                    id="contact-mobile"
                    type="tel"
                    required
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    placeholder="+91 12345 67890"
                    autoComplete="tel"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="contact-email">EMAIL</label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@email.com"
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="contact-message">MESSAGE</label>
                <textarea
                  id="contact-message"
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Tell me about your project..."
                  rows={5}
                />
              </div>

              {status === 'success' && (
                <div className="status-msg success">
                  ✓ Message sent successfully! I&apos;ll get back to you soon.
                </div>
              )}
              {status === 'error' && (
                <div className="status-msg error">
                  ✕ {errorMsg || 'Send failed. Please email directly.'}
                </div>
              )}

              <button
                type="submit"
                className="submit-btn"
                disabled={status === 'sending'}
              >
                {status === 'sending' ? 'SENDING…' : 'SEND MESSAGE'}
                <Send size={14} />
              </button>
            </form>

            <div className="contact-alt">
              <p>Or reach me directly:</p>
              <div className="contact-links">
                <a href={`mailto:${content.contact.email}`}>
                  <Mail size={12} /> {content.contact.email}
                </a>
                <a href={content.contact.linkedin} target="_blank" rel="noopener noreferrer">
                  LinkedIn ↗
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
