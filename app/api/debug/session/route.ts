import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const cookiesIn = req.cookies; // immutable snapshot
    const hasAccess = !!cookiesIn.get('sb-access-token');
    const hasRefresh = !!cookiesIn.get('sb-refresh-token');

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(_name: string, _value: string, _options: CookieOptions) {
            // no-op for debug endpoint
          },
          remove(_name: string, _options: CookieOptions) {
            // no-op for debug endpoint
          },
        },
      }
    );

    const { data: { session }, error } = await supabase.auth.getSession();

    return NextResponse.json({
      ok: true,
      cookiePresence: {
        access: hasAccess,
        refresh: hasRefresh,
      },
      session: session ? {
        userId: session.user?.id || null,
        expiresAt: session.expires_at || null,
      } : null,
      error: error?.message || null,
      path: req.nextUrl.pathname,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

