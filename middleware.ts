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
            // Extend cookie lifetime to 7 days for better session persistence
            res.cookies.set({
              name,
              value,
              ...options,
              maxAge: options.maxAge || 60 * 60 * 24 * 7, // 7 days default
            });
          },
          remove(name: string, options: CookieOptions) {
            res.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    // Touch session to refresh cookies if needed
    await supabase.auth.getUser();
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

