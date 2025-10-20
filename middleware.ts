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

    // Proactive token refresh before expiry
    const { data: { session }, error } = await supabase.auth.getSession();

    if (session && !error) {
      const expiresAt = session.expires_at || 0;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - now;

      // Refresh if token expires within 5 minutes (300 seconds)
      if (timeUntilExpiry < 300) {
        await supabase.auth.refreshSession();
      }

      const pathname = req.nextUrl.pathname;
      const requiresProvisionedUser =
        pathname.startsWith('/chat') ||
        pathname.startsWith('/admin');

      if (requiresProvisionedUser) {
        const { data: provisionedUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!provisionedUser) {
          const redirectUrl = req.nextUrl.clone();
          redirectUrl.pathname = '/auth';
          redirectUrl.searchParams.set('reason', 'incomplete-profile');
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
