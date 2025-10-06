import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/database/supabase-client';

export const dynamic = 'force-dynamic'; // Prevent static generation

export async function GET() {
  // Block access in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Debug endpoint not available in production' },
      { status: 403 }
    );
  }

  try {
    if (process.env.NODE_ENV === 'development') {
      
    }

    const { data: models, error } = await supabaseAdmin
      .from('model_configs')
      .select('id, provider, model_name, created_at, is_active')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({
        error: error.message
      }, { status: 500 });
    }

    if (process.env.NODE_ENV === 'development') {
      
    }

    return NextResponse.json({
      success: true,
      models: models || [],
      count: models?.length || 0
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}