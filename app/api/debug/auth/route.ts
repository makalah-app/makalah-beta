import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/database/supabase-client';

export const dynamic = 'force-dynamic'; // Prevent static generation

export async function GET(request: NextRequest) {
  // Block access in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoint not available in production' },
      { status: 403 }
    );
  }

  try {
    // Get Authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({
        debug: 'auth_check',
        result: 'NO_AUTH_HEADER',
        authHeader: authHeader ? 'present but invalid format' : 'missing'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return Response.json({
        debug: 'auth_check',
        result: 'INVALID_TOKEN',
        error: error?.message,
        token_hint: token.substring(0, 20) + '...'
      });
    }

    return Response.json({
      debug: 'auth_check',
      result: 'SUCCESS',
      user: {
        id: user.id,
        email: user.email,
        isAdmin: user.email === 'makalah.app@gmail.com'
      },
      token_hint: token.substring(0, 20) + '...'
    });

  } catch (error) {
    return Response.json({
      debug: 'auth_check',
      result: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}