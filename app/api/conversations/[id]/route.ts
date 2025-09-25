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
import {
  getConversationDetails
} from '../../../../src/lib/database/chat-store';
import { supabaseAdmin } from '../../../../src/lib/database/supabase-client';

// Allow for database operations
export const maxDuration = 30;

/**
 * GET /api/conversations/[id] - Get conversation details
 * 
 * Query Parameters:
 * - includeMessages: Include message history (optional, default: true)
 * - includeWorkflow: Include workflow data (optional, default: true)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeMessages = searchParams.get('includeMessages') !== 'false';
    const includeWorkflow = searchParams.get('includeWorkflow') !== 'false';
    
    if (!id) {
      return NextResponse.json({
        error: 'Conversation ID is required',
        code: 'MISSING_CONVERSATION_ID'
      }, { status: 400 });
    }

    console.log(`[Conversation API] Loading conversation ${id} (messages: ${includeMessages}, workflow: ${includeWorkflow})`);
    
    // Load complete conversation details
    const conversationDetails = await getConversationDetails(id);
    
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
        hasWorkflow: !!conversationDetails.workflow,
        includeMessages,
        includeWorkflow,
        timestamp: Date.now()
      }
    };
    
    if (includeMessages) {
      response.messages = conversationDetails.messages;
    }
    
    if (includeWorkflow && conversationDetails.workflow) {
      response.workflow = conversationDetails.workflow;
    }
    
    console.log(`[Conversation API] Successfully loaded conversation ${id} with ${conversationDetails.messages.length} messages`);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error(`[Conversation API] GET error for ${await params}:`, error);
    
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
      currentPhase, 
      archived,
      metadata 
    }: {
      title?: string;
      description?: string;
      currentPhase?: number;
      archived?: boolean;
      metadata?: any;
    } = body;
    
    if (!id) {
      return NextResponse.json({
        error: 'Conversation ID is required',
        code: 'MISSING_CONVERSATION_ID'
      }, { status: 400 });
    }

    console.log(`[Conversation API] Updating conversation ${id}`);
    
    // Prepare update object
    const updates: any = {
      updated_at: new Date().toISOString()
    };
    
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (currentPhase !== undefined) updates.current_phase = currentPhase;
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
    
    // Load updated conversation details
    const conversationDetails = await getConversationDetails(id);
    
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
    
    console.log(`[Conversation API] Successfully updated conversation ${id}`);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error(`[Conversation API] PUT error for ${await params}:`, error);
    
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

    console.log(`[Conversation API] ${permanent ? 'Permanently deleting' : 'Archiving'} conversation ${id}`);
    
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
    
    console.log(`[Conversation API] Successfully ${permanent ? 'deleted' : 'archived'} conversation ${id}`);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error(`[Conversation API] DELETE error for ${await params}:`, error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to delete conversation',
      code: 'DELETE_CONVERSATION_FAILED',
      timestamp: Date.now()
    }, { status: 500 });
  }
}
