import emailjs from '@emailjs/browser';
import { content } from '@/lib/content';

/* EmailJS send, shared by the museum ContactModal and the JARVIS Mail app.
 *
 * Env vars (set in .env.local + Vercel project settings):
 *   NEXT_PUBLIC_EMAILJS_SERVICE_ID
 *   NEXT_PUBLIC_EMAILJS_TEMPLATE_ID
 *   NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
 *
 * The EmailJS template MUST use these exact variable keys:
 *   {{name}} {{mobile}} {{email}} {{message}} */

export type MailForm = { name: string; mobile: string; email: string; message: string };

export const EMPTY_MAIL: MailForm = { name: '', mobile: '', email: '', message: '' };

export class MailNotConfiguredError extends Error {
  constructor() {
    super(`Contact form is not configured. Please email directly: ${content.contact.email}`);
  }
}

export async function sendMail(form: MailForm): Promise<void> {
  const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
  const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) throw new MailNotConfiguredError();

  await emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    { name: form.name, mobile: form.mobile, email: form.email, message: form.message },
    { publicKey: PUBLIC_KEY },
  );
}
