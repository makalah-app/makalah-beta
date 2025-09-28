/* @ts-nocheck */
/**
 * CONVERSATIONS API ENDPOINT - PHASE 2 IMPLEMENTATION
 * 
 * TECHNICAL SPECIFICATIONS:
 * - Conversation management functions with session handling
 * - Enhanced conversation models with state tracking
 * - Conversation templates for academic workflow phases
 * - 100% AI SDK v5 compliance using ONLY /Users/eriksupit/Desktop/makalah/documentation as primary source
 * 
 * PHASE 2 DELIVERABLES:
 * - Complete conversation persistence system
 * - User conversation history management
 * - Conversation listing functionality
 * - Conversation session lifecycle management
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getUserConversations, 
  getConversationDetails, 
  createChat,
  saveChat,
  loadChat 
} from '../../../src/lib/database/chat-store';
import { generateId, UIMessage } from 'ai';
import type { ConversationSummary, ConversationDetails } from '../../../src/lib/types/database-types';

// Allow for database operations
export const maxDuration = 30;

/**
 * GET /api/conversations - List user conversations
 * 
 * Query Parameters:
 * - userId: User identifier (required)
 * - limit: Maximum number of conversations to return (optional, default: 50)
 * - archived: Include archived conversations (optional, default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const includeArchived = searchParams.get('archived') === 'true';
    
    if (!userId) {
      return NextResponse.json({
        error: 'userId parameter is required',
        code: 'MISSING_USER_ID'
      }, { status: 400 });
    }

    console.log(`[Conversations API] Loading conversations for user ${userId} (limit: ${limit}, archived: ${includeArchived})`);
    
    // Load user conversations with enhanced filtering
    const conversations = await getUserConversations(userId);
    
    // Filter archived if needed
    const filteredConversations = includeArchived 
      ? conversations 
      : conversations.filter(conv => !conv.archived);
    
    // Apply limit
    const limitedConversations = filteredConversations.slice(0, limit);
    
    // Enhanced response with metadata
    const response = {
      conversations: limitedConversations,
      metadata: {
        total: limitedConversations.length,
        hasMore: filteredConversations.length > limit,
        userId,
        includeArchived,
        timestamp: Date.now()
      }
    };
    
    console.log(`[Conversations API] Successfully returned ${limitedConversations.length} conversations`);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[Conversations API] GET error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to load conversations',
      code: 'LOAD_CONVERSATIONS_FAILED',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * POST /api/conversations - Create new conversation
 * 
 * Request Body:
 * - userId: User identifier (required)
 * - title: Conversation title (optional)
 * - description: Conversation description (optional)
 * - initialMessage: First message to start conversation (optional)
 * - phase: Starting phase for academic workflow (optional, default: 1)
 * - workflowTemplate: Template type for conversation (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      title, 
      description, 
      initialMessage,
      phase = 1,
      workflowTemplate = 'academic_writing'
    }: {
      userId: string;
      title?: string;
      description?: string;
      initialMessage?: string;
      phase?: number;
      workflowTemplate?: string;
    } = body;
    
    if (!userId) {
      return NextResponse.json({
        error: 'userId is required in request body',
        code: 'MISSING_USER_ID'
      }, { status: 400 });
    }

    console.log(`[Conversations API] Creating new conversation for user ${userId}`);
    
    // Create new conversation with AI SDK compliant pattern
    const conversationId = await createChat(
      userId, 
      title || generateConversationTitle(workflowTemplate, phase)
    );
    
    // If initial message provided, save it
    if (initialMessage) {
      const createdAt = new Date().toISOString();
      const initialUIMessage: UIMessage = {
        id: generateId(),
        role: 'user',
        parts: [
          {
            type: 'text',
            text: initialMessage
          }
        ],
        metadata: {
          userId,
          phase,
          workflowTemplate,
          isInitial: true,
          createdAt
        }
      };
      
      // Save initial message using AI SDK compliant saveChat
      await saveChat({
        chatId: conversationId,
        messages: [initialUIMessage]
      });
      
      console.log(`[Conversations API] Saved initial message for conversation ${conversationId}`);
    }
    
    // Load created conversation details for response
    const conversationDetails = await getConversationDetails(conversationId);
    
    const response = {
      success: true,
      conversationId,
      conversation: conversationDetails,
      metadata: {
        created: true,
        hasInitialMessage: !!initialMessage,
        phase,
        workflowTemplate,
        timestamp: Date.now()
      }
    };
    
    console.log(`[Conversations API] Successfully created conversation ${conversationId}`);
    
    return NextResponse.json(response, { status: 201 });
    
  } catch (error) {
    console.error('[Conversations API] POST error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to create conversation',
      code: 'CREATE_CONVERSATION_FAILED',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * Helper function to generate conversation titles based on workflow template
 */
function generateConversationTitle(template: string, phase: number): string {
  const templates = {
    academic_writing: `Academic Paper - Phase ${phase}`,
    literature_review: `Literature Review - Phase ${phase}`,
    research_proposal: `Research Proposal - Phase ${phase}`,
    thesis_writing: `Thesis Writing - Phase ${phase}`,
    general: `New Chat - Phase ${phase}`
  };
  
  return templates[template as keyof typeof templates] || templates.general;
}
