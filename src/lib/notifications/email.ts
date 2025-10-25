/**
 * Transactional email helpers (Resend)
 * Server-only: used by API routes.
 */

import { renderWaitlistThanksEmailHTML, renderWaitlistThanksEmailText } from './email-templates';

export async function sendWaitlistThanksEmail(to: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { success: false, skipped: true } as const;

  const from = 'noreply@makalah.ai'; // per requirement
  const subject = 'Terima kasih – Kamu masuk Daftar Tunggu Makalah AI';
  const html = renderWaitlistThanksEmailHTML(to);
  const text = renderWaitlistThanksEmailText(to);

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html, text })
  });

  const data = await resp.json().catch(() => ({} as any));
  if (!resp.ok) {
    // Do not throw; return verbose info for logging upstream
    return { success: false, skipped: true, status: resp.status, error: (data as any)?.error || (data as any)?.message } as const;
  }

  return { success: true, id: (data as any)?.id, status: resp.status } as const;
}
