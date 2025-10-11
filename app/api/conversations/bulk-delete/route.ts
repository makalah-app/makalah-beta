/* @ts-nocheck */
/**
 * BULK DELETE CONVERSATIONS API ENDPOINT
 *
 * PURPOSE:
 * - Dedicated endpoint for bulk deletion of conversations
 * - Validates user ownership before deletion
 * - Performs hard delete (permanent removal from database)
 * - Deletes associated messages first, then conversations
 *
 * COMPLIANCE:
 * - MakalahAI Policy: Simple, pragmatic, outcome-focused
 * - No over-engineering: Direct database operations
 * - Clean error handling with user-friendly messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/database/supabase-client';

export const maxDuration = 30;

/**
 * POST /api/conversations/bulk-delete
 *
 * Request Body:
 * {
 *   conversationIds: string[],  // Array of conversation IDs to delete
 *   userId: string               // User ID for ownership validation
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   deleted: number,
 *   conversationIds: string[],
 *   metadata: {
 *     requested: number,
 *     deleted: number,
 *     timestamp: number
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationIds, userId } = body;

    // Validate request body
    if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
      return NextResponse.json({
        error: 'conversationIds array is required and cannot be empty',
        code: 'MISSING_CONVERSATION_IDS'
      }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({
        error: 'userId is required for ownership validation',
        code: 'MISSING_USER_ID'
      }, { status: 400 });
    }

    // Verify user owns these conversations
    const { data: ownedConversations, error: verifyError } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .in('id', conversationIds)
      .eq('user_id', userId);

    if (verifyError) {
      throw new Error(`Ownership verification failed: ${verifyError.message}`);
    }

    const ownedIds = (ownedConversations || []).map((c: any) => c.id);

    if (ownedIds.length === 0) {
      return NextResponse.json({
        error: 'Tidak ada percakapan yang ditemukan atau Anda tidak memiliki akses',
        code: 'NO_OWNED_CONVERSATIONS'
      }, { status: 403 });
    }

    // Step 1: Delete associated messages first (foreign key constraint)
    const { error: messagesError } = await supabaseAdmin
      .from('chat_messages')
      .delete()
      .in('conversation_id', ownedIds);

    if (messagesError) {
      throw new Error(`Failed to delete messages: ${messagesError.message}`);
    }

    // Step 2: Delete conversations
    const { error: conversationsError } = await supabaseAdmin
      .from('conversations')
      .delete()
      .in('id', ownedIds);

    if (conversationsError) {
      throw new Error(`Failed to delete conversations: ${conversationsError.message}`);
    }

    // Success response
    return NextResponse.json({
      success: true,
      deleted: ownedIds.length,
      conversationIds: ownedIds,
      metadata: {
        requested: conversationIds.length,
        deleted: ownedIds.length,
        timestamp: Date.now()
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Gagal menghapus percakapan',
      code: 'BULK_DELETE_FAILED',
      timestamp: Date.now()
    }, { status: 500 });
  }
}
