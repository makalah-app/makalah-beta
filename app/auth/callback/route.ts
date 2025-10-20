import { supabaseClient } from '@/lib/database/supabase-client';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/auth?verified=true';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    const errorMessage = encodeURIComponent(errorDescription || 'Authentication failed');
    return NextResponse.redirect(`${origin}/auth?error=${errorMessage}`);
  }

  if (code) {
    const { error: sessionError } = await supabaseClient.auth.exchangeCodeForSession(code);

    if (!sessionError) {
      // Successful authentication
      return NextResponse.redirect(`${origin}${next}`);
    } else {
      // Session exchange failed
      const errorMessage = encodeURIComponent(sessionError.message || 'Failed to authenticate');
      return NextResponse.redirect(`${origin}/auth?error=${errorMessage}`);
    }
  }

  // No code provided - invalid callback
  return NextResponse.redirect(`${origin}/auth?error=invalid_callback`);
}