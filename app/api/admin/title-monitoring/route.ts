/**
 * Smart Title Monitoring API
 *
 * Provides metrics and status for smart title generation system
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/database/supabase-client';

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    // Query conversations with smart_title_pending flag
    const { data: pendingConversations, error: pendingError } = await (supabaseAdmin as any)
      .from('conversations')
      .select('id')
      .eq('metadata->smart_title_pending', true);

    // Query conversations with smart_title_failed flag
    const { data: failedConversations, error: failedError } = await (supabaseAdmin as any)
      .from('conversations')
      .select('id')
      .eq('metadata->smart_title_failed', true);

    // Query successful smart titles generated today
    const today = new Date().toISOString().split('T')[0];
    const { data: successConversations, error: successError } = await (supabaseAdmin as any)
      .from('conversations')
      .select('id')
      .eq('metadata->smart_title_completed', true)
      .gte('metadata->smart_title_generated_at', `${today}T00:00:00.000Z`)
      .lt('metadata->smart_title_generated_at', `${today}T23:59:59.999Z`);

    // Count default titles that might need processing
    const { data: defaultTitles, error: defaultError } = await (supabaseAdmin as any)
      .from('conversations')
      .select('id, title')
      .or('title.eq.New Academic Chat,title.eq.Untitled Chat,title.eq.New Chat')
      .limit(20);

    const response = {
      pending: pendingError ? 0 : (pendingConversations?.length || 0),
      failed: failedError ? 0 : (failedConversations?.length || 0),
      success: successError ? 0 : (successConversations?.length || 0),
      defaultTitles: defaultError ? 0 : (defaultTitles?.length || 0),
      timestamp: Date.now(),
      errors: {
        pending: pendingError?.message,
        failed: failedError?.message,
        success: successError?.message,
        default: defaultError?.message
      }
    };

    console.log('[Title Monitoring] Stats generated:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Title Monitoring] Failed to generate stats:', error);

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to generate title monitoring stats',
      pending: 0,
      failed: 0,
      success: 0,
      defaultTitles: 0,
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * POST endpoint untuk trigger backfill atau cleanup operations
 */
export async function POST(req: NextRequest) {
  try {
    const { action, limit = 50 } = await req.json();

    switch (action) {
      case 'cleanup_pending':
        // Clear stuck pending flags older than 24 hours
        const { data: cleaned, error: cleanError } = await (supabaseAdmin as any)
          .from('conversations')
          .update({
            metadata: (supabaseAdmin as any).raw(`
              metadata || '{"smart_title_pending": false, "smart_title_cleanup": true, "cleaned_at": "${new Date().toISOString()}"}'
            `)
          })
          .eq('metadata->smart_title_pending', true)
          .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .select('id');

        return NextResponse.json({
          action: 'cleanup_pending',
          cleaned: cleaned?.length || 0,
          error: cleanError?.message,
          timestamp: Date.now()
        });

      case 'reset_failures':
        // Reset failed flags to allow retry
        const { data: reset, error: resetError } = await (supabaseAdmin as any)
          .from('conversations')
          .update({
            metadata: (supabaseAdmin as any).raw(`
              metadata || '{"smart_title_failed": false, "smart_title_pending": true, "reset_at": "${new Date().toISOString()}"}'
            `)
          })
          .eq('metadata->smart_title_failed', true)
          .select('id')
          .limit(limit);

        return NextResponse.json({
          action: 'reset_failures',
          reset: reset?.length || 0,
          error: resetError?.message,
          timestamp: Date.now()
        });

      default:
        return NextResponse.json({
          error: 'Invalid action. Supported: cleanup_pending, reset_failures',
          actions: ['cleanup_pending', 'reset_failures']
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[Title Monitoring] POST operation failed:', error);

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Operation failed',
      timestamp: Date.now()
    }, { status: 500 });
  }
}