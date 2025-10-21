import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Set Session API Route - Server-Side Cookie Handler
 *
 * CRITICAL FIX: Uses NextResponse.cookies.set() pattern from middleware.ts
 * to ensure cookies are properly set in Route Handlers.
 *
 * Pattern compliance: Follows working pattern from middleware.ts:17-27
 * Documentation: Next.js Route Handlers require NextResponse for cookie setting
 */
export async function POST(req: NextRequest) {
  try {
    const { access_token, refresh_token } = await req.json();
    if (!access_token || !refresh_token) {
      console.error('[auth:set-session] missing tokens');
      return NextResponse.json({ error: 'Missing tokens' }, { status: 400 });
    }

    // Create response object first (required for cookie setting)
    const res = NextResponse.json({ success: true });

    // Create Supabase client with proper cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            // Set cookies on NextResponse (same pattern as middleware.ts)
            res.cookies.set({
              name,
              value,
              ...options,
              maxAge: options.maxAge || 60 * 60 * 24 * 30, // 30 days default
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax'
            });
          },
          remove(name: string, options: CookieOptions) {
            res.cookies.set({ name, value: '', ...options, maxAge: 0 });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (error) {
      console.error('[auth:set-session] error', { message: error.message });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Debug success
    try {
      // eslint-disable-next-line no-console
      console.log('[auth:set-session] success', { userId: data.user?.id });
    } catch {}

    // Return response WITH cookies included in headers
    return NextResponse.json(
      { success: true, userId: data.user?.id || null },
      {
        headers: res.headers,
        status: 200
      }
    );
  } catch (e) {
    console.error('[auth:set-session] exception', e);
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'Unknown error'
    }, { status: 500 });
  }
}
