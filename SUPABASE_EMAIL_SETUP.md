# Panduan Setup Email Sender Supabase

## Mengubah Email Sender dari "noreply@mail.app.supabase.io" ke "dukungan@makalah.ai"

### Prerequisites
1. **Domain terverifikasi** - makalah.ai harus sudah terverifikasi ownership-nya
2. **Email service** - SMTP provider atau Resend/SendGrid API key
3. **Supabase Pro Plan** - Custom SMTP hanya tersedia di paid plan

### Step 1: Setup SMTP Provider

#### Option A: Menggunakan Resend (Recommended)
1. Daftar di https://resend.com
2. Verifikasi domain makalah.ai
3. Dapatkan API key

#### Option B: Menggunakan SendGrid
1. Daftar di https://sendgrid.com
2. Verifikasi domain makalah.ai
3. Create API key dengan permission "Mail Send"

#### Option C: SMTP Server Sendiri
- SMTP Host
- SMTP Port (usually 587 for TLS)
- Username
- Password

### Step 2: Configure di Supabase Dashboard

1. **Login ke Supabase Dashboard**
   - Buka https://supabase.com/dashboard
   - Pilih project "makalah-beta"

2. **Navigate ke Auth Settings**
   - Sidebar: Settings → Authentication → Email Templates

3. **Configure SMTP (Pro Plan Required)**
   - Settings → Project Settings → Auth → SMTP Settings
   - Enable "Custom SMTP"

   **Untuk Resend:**
   ```
   Host: smtp.resend.com
   Port: 465
   Username: resend
   Password: [YOUR_RESEND_API_KEY]
   Sender Email: dukungan@makalah.ai
   Sender Name: Makalah AI
   ```

   **Untuk SendGrid:**
   ```
   Host: smtp.sendgrid.net
   Port: 587
   Username: apikey
   Password: [YOUR_SENDGRID_API_KEY]
   Sender Email: dukungan@makalah.ai
   Sender Name: Makalah AI
   ```

4. **Update Email Templates**
   - Di Email Templates section, update semua template:
   - Confirm Signup
   - Magic Link
   - Reset Password
   - Change Email

   Ganti sender di setiap template dari:
   ```
   {{ .SiteURL }} team
   ```
   Menjadi:
   ```
   Tim Makalah AI
   ```

### Step 3: Free Plan Alternative (Jika belum Pro)

Jika masih di **Free Plan**, ada workaround:

1. **Gunakan Supabase Edge Functions**
   ```typescript
   // supabase/functions/send-email/index.ts
   import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

   serve(async (req) => {
     const { email, type, token } = await req.json()

     // Use Resend API directly
     const response = await fetch('https://api.resend.com/emails', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({
         from: 'Makalah AI <dukungan@makalah.ai>',
         to: email,
         subject: getEmailSubject(type),
         html: getEmailTemplate(type, token)
       })
     })

     return new Response(JSON.stringify({ success: true }))
   })
   ```

2. **Override Auth Hooks**
   - Gunakan database triggers untuk intercept auth events
   - Kirim email custom via Edge Function
   - Disable default Supabase emails

### Step 4: Test Email Configuration

1. **Test Registration**
   ```bash
   # Register user baru
   curl -X POST https://ivsjnytypbxblnsuuaxd.supabase.co/auth/v1/signup \
     -H "apikey: YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"testpass123"}'
   ```

2. **Check Email Headers**
   - From: dukungan@makalah.ai ✅
   - Reply-To: dukungan@makalah.ai ✅
   - Sender Name: Makalah AI ✅

### Step 5: Email Template Customization

Update di Supabase Dashboard → Email Templates:

**Confirm Signup Template:**
```html
<h2>Selamat datang di Makalah AI!</h2>
<p>Halo {{ .Email }},</p>
<p>Terima kasih telah mendaftar. Silakan konfirmasi email Anda dengan mengklik tautan berikut:</p>
<p><a href="{{ .ConfirmationURL }}">Konfirmasi Email</a></p>
<p>Atau salin URL ini: {{ .ConfirmationURL }}</p>
<br>
<p>Salam,<br>Tim Makalah AI</p>
<p style="font-size:12px;color:#666;">
  Email ini dikirim oleh Makalah AI. Jika Anda tidak mendaftar, abaikan email ini.
</p>
```

### Important Notes

1. **SPF/DKIM Records**
   - Tambahkan SPF record: `v=spf1 include:_spf.resend.com ~all`
   - Configure DKIM sesuai provider

2. **Email Limits**
   - Free Plan: 3 emails/hour
   - Pro Plan: Custom limits dengan SMTP sendiri

3. **Monitoring**
   - Setup email bounce handling
   - Monitor delivery rates di provider dashboard

### Temporary Solution (Immediate)

Sambil menunggu SMTP setup, bisa tambahkan note di halaman register:
"Email verifikasi akan dikirim dari noreply@mail.app.supabase.io. Pastikan cek folder spam."