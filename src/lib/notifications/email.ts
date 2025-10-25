/**
 * Transactional email helpers (Resend)
 * Server-only: used by API routes.
 */

import { renderWaitlistThanksEmailHTML, renderWaitlistThanksEmailText } from './email-templates';

type ResendClient = any;

async function getResendClient(): Promise<ResendClient | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  // Dynamic import to avoid build-time type dependency
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Resend } = require('resend');
  return new Resend(apiKey);
}

export async function sendWaitlistThanksEmail(to: string) {
  const resend = await getResendClient();
  if (!resend) return { success: false, skipped: true } as const;

  const from = 'noreply@makalah.ai'; // per requirement
  const subject = 'Terima kasih – Kamu masuk Daftar Tunggu Makalah AI';
  const html = renderWaitlistThanksEmailHTML(to);
  const text = renderWaitlistThanksEmailText(to);

  const result = await resend.emails.send({ from, to, subject, html, text });
  // result may contain id, error; we assume provider SDK throws on failure
  return { success: true, id: result?.id } as const;
}

