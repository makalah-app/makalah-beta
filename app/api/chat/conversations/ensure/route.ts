/**
 * POST /api/chat/conversations/ensure
 * Eagerly create conversation to prevent data loss on refresh
 *
 * AI SDK v5 Compliant: Uses standard HTTP patterns
 * IDEMPOTENT: Safe to call multiple times with same conversationId
 *
 * PURPOSE:
 * - Create conversation IMMEDIATELY when user sends first message
 * - Prevents data loss if user refreshes during AI streaming
 * - Uses fast heuristic title first, smart title generated later
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../src/lib/database/supabase-client';
import { getUserIdWithSystemFallback } from '../../../../../src/lib/database/supabase-server-auth';

export const maxDuration = 10; // Quick operation - no need for long timeout

interface EnsureConversationRequest {
  conversationId: string;
  initialMessage?: string;
}

interface EnsureConversationResponse {
  success: boolean;
  existed?: boolean;
  created?: boolean;
  conversationId: string;
  error?: string;
}

/**
 * POST handler - Ensure conversation exists (idempotent operation)
 */
export async function POST(req: NextRequest): Promise<NextResponse<EnsureConversationResponse>> {
  try {
    // Parse request body
    const body = await req.json();
    const { conversationId, initialMessage }: EnsureConversationRequest = body;

    // Validate required parameters
    if (!conversationId) {
      return NextResponse.json({
        success: false,
        conversationId: '',
        error: 'conversationId is required'
      }, { status: 400 });
    }

    // Get authenticated user (with system fallback for anonymous sessions)
    const userId = await getUserIdWithSystemFallback();

    if (!userId) {
      return NextResponse.json({
        success: false,
        conversationId,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // IDEMPOTENCY CHECK: Check if conversation already exists
    const { data: existing } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .single();

    if (existing) {
      // Conversation already exists - no-op (idempotent behavior)
      return NextResponse.json({
        success: true,
        existed: true,
        conversationId
      });
    }

    // Generate quick heuristic title from initial message
    const quickTitle = initialMessage && initialMessage.length > 10
      ? initialMessage.slice(0, 50) + (initialMessage.length > 50 ? '...' : '')
      : 'New Chat';

    // Create conversation with fast heuristic title
    // Smart title will be generated later by background process
    const { error } = await supabaseAdmin
      .from('conversations')
      .insert({
        id: conversationId,
        user_id: userId,
        title: quickTitle,
        message_count: 0,
        metadata: {
          created_via: 'eager_persistence',
          smart_title_pending: true,
          created_at: new Date().toISOString()
        },
        archived: false
      });

    if (error) {
      // Handle duplicate key error (race condition between tabs/requests)
      if (error.code === '23505') {
        // Duplicate key is OK - another request already created it
        return NextResponse.json({
          success: true,
          existed: true,
          conversationId
        });
      }

      // Other errors should be thrown for proper error handling
      throw new Error(`Failed to create conversation: ${error.message}`);
    }

    // Successfully created new conversation
    return NextResponse.json({
      success: true,
      created: true,
      conversationId
    });

  } catch (error) {
    // Error handling with proper logging
    const errorMessage = error instanceof Error ? error.message : 'Failed to ensure conversation';

    return NextResponse.json({
      success: false,
      conversationId: '',
      error: errorMessage
    }, { status: 500 });
  }
}
