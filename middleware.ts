import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            // Extend cookie lifetime to 30 days to match refresh token lifetime
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
            res.cookies.set({ name, value: '', maxAge: 0, ...options });
          },
        },
      }
    );

    // Proactive token refresh before expiry with bot protection
    const { data: { session }, error } = await supabase.auth.getSession();
    const userAgent = req.headers.get('user-agent') || '';
    const isBot = userAgent.includes('bot') || userAgent.includes('crawler') || userAgent.includes('headless');

    if (session && !error && !isBot) {
      const expiresAt = session.expires_at || 0;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - now;

      // Check if recently refreshed by client to avoid competing refreshes
      const lastRefresh = req.cookies.get('sb-last-refresh')?.value;
      const timeSinceLastRefresh = lastRefresh ? now - parseInt(lastRefresh) : Infinity;

      // Only refresh if not recently refreshed by client (avoid competing refreshes)
      // and only if token expires within 6 minutes (360 seconds)
      if (timeUntilExpiry < 360 && timeSinceLastRefresh > 6 * 60) {
        await supabase.auth.refreshSession();
        // Set tracking cookie to prevent competing refreshes
        res.cookies.set('sb-last-refresh', now.toString(), {
          maxAge: 360,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
      }

      const pathname = req.nextUrl.pathname;
      const requiresProvisionedUser =
        pathname.startsWith('/chat') ||
        pathname.startsWith('/admin');

      if (requiresProvisionedUser) {
        const { data: provisionedUser } = await supabase
          .from('users')
          .select('id, is_active')
          .eq('id', session.user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!provisionedUser) {
          const redirectUrl = req.nextUrl.clone();
          redirectUrl.pathname = '/auth';
          redirectUrl.searchParams.set('reason', 'account-disabled');
          return NextResponse.redirect(redirectUrl);
        }
      }
    }
  } catch {
    // ignore
  }

  return res;
}

export const config = {
  matcher: [
    // Only apply middleware to specific paths, exclude API routes completely
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
