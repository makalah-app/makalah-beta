import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../src/lib/database/supabase-server-auth';

export async function POST(_req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}
