import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/database/supabase-client';

function isValidEmail(email: string) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return Response.json({ success: false, error: { message: 'Invalid payload' } }, { status: 400 });
    }

    const emailRaw = (body.email || '').toString().trim();
    const honeypot = (body.website || '').toString().trim(); // honeypot field

    if (honeypot) {
      // likely bot
      return Response.json({ success: true }, { status: 201 });
    }

    if (!emailRaw || !isValidEmail(emailRaw)) {
      return Response.json({ success: false, error: { message: 'Format email kurang tepat.' } }, { status: 422 });
    }

    const email = emailRaw.toLowerCase();
    const userAgent = request.headers.get('user-agent') || null;
    const fwd = request.headers.get('x-forwarded-for') || '';
    const ip = (fwd.split(',')[0] || '').trim() || null;

    const { error } = await (supabaseAdmin as any)
      .from('waiting_list')
      .insert({
        email,
        source: 'auth',
        user_agent: userAgent,
        created_ip: ip,
      });

    if (error) {
      // Unique violation
      if ((error as any).code === '23505') {
        return Response.json({ success: false, error: { message: 'Email sudah terdaftar di daftar tunggu.' } }, { status: 409 });
      }
      return Response.json({ success: false, error: { message: 'Lagi gangguan, coba lagi ya.' } }, { status: 500 });
    }

    return Response.json({ success: true }, { status: 201 });
  } catch (e) {
    return Response.json({ success: false, error: { message: 'Lagi gangguan, coba lagi ya.' } }, { status: 500 });
  }
}

