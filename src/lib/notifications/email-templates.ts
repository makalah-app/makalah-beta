export function renderWaitlistThanksEmailHTML(email: string) {
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; line-height: 1.6; color: #0f172a;">
    <h2 style="margin: 0 0 12px;">Terima kasih sudah daftar tunggu</h2>
    <p style="margin: 0 0 10px;">Halo, ${escapeHTML(email)} 👋</p>
    <p style="margin: 0 0 10px;">Email kamu sudah kami catat untuk uji coba Makalah AI. Kami akan kabari jadwal akses dan info lanjut secepatnya.</p>
    <p style="margin: 0 0 10px;">Sementara itu, kamu bisa lihat FAQ dan dokumentasi untuk gambaran fitur.</p>
    <p style="margin: 16px 0 0; font-size: 12px; color: #475569;">Email ini dikirim otomatis. Jangan balas ke alamat ini.</p>
  </div>`;
}

export function renderWaitlistThanksEmailText(email: string) {
  return [
    'Terima kasih sudah daftar tunggu',
    `Halo, ${email}`,
    'Email kamu sudah kami catat untuk uji coba Makalah AI.',
    'Kami akan kabari jadwal akses dan info lanjut secepatnya.',
    '',
    'Email ini dikirim otomatis. Jangan balas ke alamat ini.'
  ].join('\n');
}

function escapeHTML(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

