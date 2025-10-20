/* @ts-nocheck */
/**
 * INDIVIDUAL CONVERSATION API ENDPOINT - PHASE 2 IMPLEMENTATION
 * 
 * TECHNICAL SPECIFICATIONS:
 * - Individual conversation details retrieval
 * - Conversation update and management
 * - Session handling with phase progression
 * - 100% AI SDK v5 compliance using ONLY /Users/eriksupit/Desktop/makalah/documentation as primary source
 * 
 * ENDPOINTS:
 * - GET /api/conversations/[id] - Get conversation details
 * - PUT /api/conversations/[id] - Update conversation metadata
 * - DELETE /api/conversations/[id] - Archive conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConversationDetails } from '../../../../src/lib/database/chat-store';
import { supabaseAdmin } from '../../../../src/lib/database/supabase-client';
import { redisManager } from '../../../../src/lib/caching';

// Allow for database operations
export const maxDuration = 30;

/**
 * GET /api/conversations/[id] - Get conversation details
 *
 * Query Parameters:
 * - includeMessages: Include message history (optional, default: true)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeMessages = searchParams.get('includeMessages') !== 'false';
    
    if (!id) {
      return NextResponse.json({
        error: 'Conversation ID is required',
        code: 'MISSING_CONVERSATION_ID'
      }, { status: 400 });
    }

    // Load complete conversation details (use supabaseAdmin to bypass RLS)
    const conversationDetails = await getConversationDetails(id, supabaseAdmin);

    if (!conversationDetails) {
      return NextResponse.json({
        error: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND',
        conversationId: id
      }, { status: 404 });
    }
    
    // Prepare response based on query parameters
    const response: any = {
      conversation: conversationDetails.conversation,
      metadata: {
        conversationId: id,
        messageCount: conversationDetails.messages.length,
        includeMessages,
        timestamp: Date.now()
      }
    };

    if (includeMessages) {
      response.messages = conversationDetails.messages;
    }

    return NextResponse.json(response);

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to load conversation',
      code: 'LOAD_CONVERSATION_FAILED',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * PUT /api/conversations/[id] - Update conversation metadata
 * 
 * Request Body:
 * - title: New conversation title (optional)
 * - description: New conversation description (optional)
 * - currentPhase: Update current phase (optional)
 * - archived: Archive/unarchive conversation (optional)
 * - metadata: Additional metadata updates (optional)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      title,
      description,
      archived,
      metadata
    }: {
      title?: string;
      description?: string;
      archived?: boolean;
      metadata?: any;
    } = body;
    
    if (!id) {
      return NextResponse.json({
        error: 'Conversation ID is required',
        code: 'MISSING_CONVERSATION_ID'
      }, { status: 400 });
    }

    // Prepare update object
    const updates: any = {
      updated_at: new Date().toISOString()
    };
    
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (archived !== undefined) updates.archived = archived;
    if (metadata !== undefined) {
      // Merge with existing metadata
      updates.metadata = metadata;
    }
    
    // Update conversation in database
    const { data: updatedConversation, error } = await (supabaseAdmin as any)
      .from('conversations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to update conversation: ${error.message}`);
    }
    
    if (!updatedConversation) {
      return NextResponse.json({
        error: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND',
        conversationId: id
      }, { status: 404 });
    }
    
    const cacheEnabled = process.env.CACHE_CHAT_HISTORY_ENABLED === 'true';
    if (cacheEnabled && redisManager.isRedisHealthy()) {
      try {
        const convPattern = redisManager.formatKey('QUERY_CACHE', `chat-history:conv:${id}:`);
        await redisManager.deleteCachePattern(`${convPattern}*`);
        const listPattern = redisManager.formatKey('QUERY_CACHE', `chat-history:list:${updatedConversation.user_id || 'unknown'}:`);
        await redisManager.deleteCachePattern(`${listPattern}*`);
      } catch {
        // Silent cache invalidation failure - non critical
      }
    }

    // Load updated conversation details (use supabaseAdmin to bypass RLS)
    const conversationDetails = await getConversationDetails(id, supabaseAdmin);
    
    const response = {
      success: true,
      conversation: updatedConversation,
      details: conversationDetails,
      metadata: {
        updated: true,
        conversationId: id,
        timestamp: Date.now()
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to update conversation',
      code: 'UPDATE_CONVERSATION_FAILED',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * DELETE /api/conversations/[id] - Archive conversation (soft delete)
 * 
 * Query Parameters:
 * - permanent: Perform permanent deletion (optional, default: false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';
    
    if (!id) {
      return NextResponse.json({
        error: 'Conversation ID is required',
        code: 'MISSING_CONVERSATION_ID'
      }, { status: 400 });
    }

    if (permanent) {
      // Permanent deletion - remove from database
      // First, delete associated messages
      const { error: messagesError } = await supabaseAdmin
        .from('chat_messages')
        .delete()
        .eq('conversation_id', id);
      
      if (messagesError) {
        throw new Error(`Failed to delete messages: ${messagesError.message}`);
      }
      
      // Then delete conversation
      const { error: conversationError } = await supabaseAdmin
        .from('conversations')
        .delete()
        .eq('id', id);
      
      if (conversationError) {
        throw new Error(`Failed to delete conversation: ${conversationError.message}`);
      }
      
    } else {
      // Soft delete - mark as archived
      const { error } = await (supabaseAdmin as any)
        .from('conversations')
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) {
        throw new Error(`Failed to archive conversation: ${error.message}`);
      }
    }
    
    const response = {
      success: true,
      deleted: permanent,
      archived: !permanent,
      conversationId: id,
      metadata: {
        permanent,
        timestamp: Date.now()
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to delete conversation',
      code: 'DELETE_CONVERSATION_FAILED',
      timestamp: Date.now()
    }, { status: 500 });
  }
}
