'use client';

import { Check, Copy, LoaderCircle, Mail, Send } from 'lucide-react';
import { useState } from 'react';
import { GitHubIcon, LinkedInIcon } from '@/components/ui/BrandIcons';
import { play } from '@/lib/audio';
import { content } from '@/lib/content';
import { EMPTY_MAIL, MailNotConfiguredError, sendMail, type MailForm } from '@/lib/jarvis/mail';

type Status = 'idle' | 'sending' | 'sent' | 'error';

/** Compose a message to Nithesh (EmailJS), plus direct contact links. */
export function MailApp() {
  const [form, setForm] = useState<MailForm>(EMPTY_MAIL);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const field = (key: keyof MailForm) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    setError('');
    play('click_primary');
    try {
      await sendMail(form);
      setStatus('sent');
      setForm(EMPTY_MAIL);
    } catch (err) {
      // eslint-disable-next-line no-console
      if (!(err instanceof MailNotConfiguredError)) console.error('[Mail] EmailJS send failed:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Send failed. Please email directly.');
    }
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(content.contact.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked: the address is visible anyway.
    }
  };

  return (
    <div className="app-mail">
      <div className="app-mail-to">
        <span>To</span>
        <b>{content.hero.name}</b>
        <em>{content.contact.email}</em>
        <button type="button" className="app-icon-btn" aria-label="Copy email address" onClick={copyEmail}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>

      {status === 'sent' ? (
        <div className="app-mail-sent" role="status">
          <Check size={34} />
          <strong>Message sent</strong>
          <p>Thanks! Nithesh will reply to the email address you gave.</p>
          <button type="button" className="app-btn" onClick={() => setStatus('idle')}>
            Write another
          </button>
        </div>
      ) : (
        <form className="app-form" onSubmit={submit}>
          <div className="app-form-row">
            <label>
              Name
              <input required autoComplete="name" {...field('name')} />
            </label>
            <label>
              Mobile
              <input type="tel" autoComplete="tel" placeholder="Optional" {...field('mobile')} />
            </label>
          </div>
          <label>
            Your email
            <input required type="email" autoComplete="email" {...field('email')} />
          </label>
          <label className="app-form-grow">
            Message
            <textarea required rows={6} placeholder="Internship, project, collaboration…" {...field('message')} />
          </label>
          {status === 'error' && (
            <p className="app-form-error" role="alert">
              {error}
            </p>
          )}
          <div className="app-mail-foot">
            <div className="app-mail-links">
              <a href={`mailto:${content.contact.email}`} aria-label="Email">
                <Mail size={16} />
              </a>
              <a href={content.contact.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <LinkedInIcon size={16} />
              </a>
              {content.contact.github && (
                <a href={content.contact.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                  <GitHubIcon size={16} />
                </a>
              )}
            </div>
            <button type="submit" className="app-btn app-btn--primary" disabled={status === 'sending'}>
              {status === 'sending' ? <LoaderCircle size={14} className="app-spin" /> : <Send size={14} />}
              {status === 'sending' ? 'Sending…' : 'Send'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
