import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function POST(req: NextRequest) {
  try {
    // Prepare response holder to persist cookie mutations
    const res = NextResponse.json({ success: true });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            res.cookies.set({
              name,
              value,
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
            });
          },
          remove(name: string, options: CookieOptions) {
            res.cookies.set({ name, value: '', ...options, maxAge: 0, path: '/' });
          },
        },
      }
    );

    const { error } = await supabase.auth.signOut();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Safety: explicitly clear common cookie names
    res.cookies.set({ name: 'sb-access-token', value: '', maxAge: 0, path: '/' });
    res.cookies.set({ name: 'sb-refresh-token', value: '', maxAge: 0, path: '/' });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.headers.set('Pragma', 'no-cache');
    return res;
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}
