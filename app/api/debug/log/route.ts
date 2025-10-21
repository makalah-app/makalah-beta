import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown';
    const now = new Date().toISOString();

    // Strip secrets if any sneaks in
    const sanitize = (obj: any) => {
      try {
        const s = JSON.stringify(obj);
        return JSON.parse(
          s
            .replace(/access_token":"[^"]+/g, 'access_token":"[redacted]')
            .replace(/refresh_token":"[^"]+/g, 'refresh_token":"[redacted]')
            .replace(/password":"[^"]+/g, 'password":"[redacted]')
        );
      } catch {
        return '[unserializable]';
      }
    };

    // eslint-disable-next-line no-console
    console.log('[DEBUG]', now, ip, sanitize(body));

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

