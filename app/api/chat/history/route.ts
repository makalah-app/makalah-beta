// /* @ts-nocheck */ -- Commented out for progressive type fixing
/**
 * CHAT HISTORY API ENDPOINT - PHASE 2 IMPLEMENTATION
 * 
 * TECHNICAL SPECIFICATIONS:
 * - Basic history retrieval functionality for users
 * - Message search and filtering capabilities
 * - Session-based message retrieval
 * - 100% AI SDK v5 compliance using ONLY /Users/eriksupit/Desktop/makalah/documentation as primary source
 * 
 * ENDPOINTS:
 * - GET /api/chat/history - Get chat history with filtering
 * - POST /api/chat/history/search - Search chat history
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getUserConversations,
  loadChat
} from '../../../../src/lib/database/chat-store';
import { createSupabaseServerClient, getServerSessionUserId } from '../../../../src/lib/database/supabase-server-auth';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { getDynamicModelConfig } from '../../../../src/lib/ai/dynamic-config';
import { SYSTEM_USER_UUID } from '../../../../src/lib/utils/uuid-generator';
import type { ExtendedUIMessage, ConversationData, SearchResult } from './types';

// Allow for database operations
export const maxDuration = 30;

/**
 * Truncate title to maximum length with ellipsis
 */
function truncateTitle(title: string, maxLength: number = 27): string {
  const cleaned = (title || '').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength).trim() + '...';
}

/**
 * GET /api/chat/history - Get chat history with filtering
 * 
 * Query Parameters:
 * - userId: User identifier (required)
 * - conversationId: Specific conversation ID (optional)
 * - limit: Maximum number of messages/conversations to return (optional, default: 50)
 * - offset: Offset for pagination (optional, default: 0)
 * - phase: Filter by academic phase (optional)
 * - dateFrom: Filter messages from date (ISO string, optional)
 * - dateTo: Filter messages to date (ISO string, optional)
 * - messageType: Filter by message role (user|assistant|system, optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // Auth debug disabled
    const session = await getServerSessionUserId();
    const sessionUserId = session.userId;
    const qpUserId = searchParams.get('userId') || undefined;
    const userId = sessionUserId || undefined; // prefer session; query param used only for fallback
    // console.debug('[Chat History API][AuthDebug] session status:', { hasUserId: !!sessionUserId, hasError: !!session.error });
    const conversationId = searchParams.get('conversationId');
    const chatId = searchParams.get('chatId'); // AI SDK v5 pattern support
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const phase = searchParams.get('phase') ? parseInt(searchParams.get('phase')!) : undefined;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const messageType = searchParams.get('messageType') as 'user' | 'assistant' | 'system' | undefined;
    const supabase = createSupabaseServerClient();
    
    // AI SDK v5 PATTERN: Simple chatId-only loading for persistence (enforce ownership via session)
    if (chatId) {
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
      }
      console.log(`[Chat History API] AI SDK v5 pattern: Loading messages for chat ${chatId}`);
      try {
        // verify ownership first
        const { data: conv, error: convErr } = await supabase
          .from('conversations')
          .select('id,user_id')
          .eq('id', chatId)
          .eq('user_id', userId)
          .single();
        if (convErr || !conv) {
          return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
        }
        const messages = await loadChat(chatId, supabase);
        console.log(`[Chat History API] Successfully loaded ${messages.length} messages for chat ${chatId}`);
        return NextResponse.json(messages); // Return UIMessage[] directly for AI SDK compatibility
      } catch (error) {
        console.error(`[Chat History API] Failed to load chat ${chatId}:`, error);
        return NextResponse.json([]); // Return empty array on error for graceful fallback
      }
    }

    if (!userId && !qpUserId) {
      // console.debug('[Chat History API][AuthDebug] No session and no qpUserId → empty history fallback');
      // No session and no fallback user id; return empty to avoid UI error
      const response = {
        conversations: [],
        metadata: {
          total: 0,
          limit,
          offset,
          hasMore: false,
          filters: { phase },
          timestamp: Date.now(),
        }
      };
      return NextResponse.json(response);
    }

    console.log(`[Chat History API] Loading history for user ${userId || qpUserId}`, {
      conversationId,
      limit,
      offset,
      phase,
      dateFrom,
      dateTo,
      messageType
    });
    
    // If specific conversation requested, load its messages
    if (conversationId) {
      // verify ownership
      const { data: convCheck, error: convCheckErr } = await supabase
        .from('conversations')
        .select('id,user_id')
        .eq('id', conversationId)
        .eq('user_id', userId || '')
        .single();
      if (convCheckErr || !convCheck) {
        return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
      }
      const messages = await loadChat(conversationId, supabase);
      
      // Apply filtering
      let filteredMessages = messages;
      
      // Filter by message type
      if (messageType) {
        filteredMessages = filteredMessages.filter(msg => msg.role === messageType);
      }
      
      // Filter by date range
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        filteredMessages = filteredMessages.filter(msg => {
          const extMsg = msg as ExtendedUIMessage;
          return extMsg.createdAt && new Date(extMsg.createdAt) >= fromDate;
        });
      }
      
      if (dateTo) {
        const toDate = new Date(dateTo);
        filteredMessages = filteredMessages.filter(msg => {
          const extMsg = msg as ExtendedUIMessage;
          return extMsg.createdAt && new Date(extMsg.createdAt) <= toDate;
        });
      }
      
      // Filter by phase
      if (phase !== undefined) {
        filteredMessages = filteredMessages.filter(msg => {
          const extMsg = msg as ExtendedUIMessage;
          return extMsg.metadata?.phase === phase;
        });
      }
      
      // Apply pagination
      const paginatedMessages = filteredMessages.slice(offset, offset + limit);
      
      const response = {
        messages: paginatedMessages,
        conversationId,
        metadata: {
          total: filteredMessages.length,
          limit,
          offset,
          hasMore: filteredMessages.length > offset + limit,
          filters: {
            phase,
            dateFrom,
            dateTo,
            messageType
          },
          timestamp: Date.now()
        }
      };
      
      console.log(`[Chat History API] Returning ${paginatedMessages.length} messages from conversation ${conversationId}`);
      return NextResponse.json(response);
    }
    
    // Load user conversations for general history
    let conversations: Array<{
      id: string;
      title: string;
      messageCount: number;
      lastActivity: string;
      currentPhase?: number;
      workflowId?: string;
      messages?: ExtendedUIMessage[];
    }> = [];
    if (userId) {
      conversations = await getUserConversations(userId, supabase);
    } else {
      // Fallback: no session, use admin client with qpUserId (dev-only scenario)
      // console.debug('[Chat History API][AuthDebug] Using admin fallback (no session). qpUserId present:', !!qpUserId);
      const { supabaseAdmin } = await import('../../../../src/lib/database/supabase-client');
      // Include conversations owned by SYSTEM user to surface recent chats persisted without SSR
      const { data, error } = await (supabaseAdmin as any)
        .from('conversations')
        .select(`
          id,
          title,
          message_count,
          current_phase,
          workflow_id,
          updated_at,
          metadata,
          user_id
        `)
        .in('user_id', [qpUserId as string, SYSTEM_USER_UUID])
        .eq('archived', false)
        .order('updated_at', { ascending: false })
        .limit(50) as {
          data: ConversationData[] | null;
          error: any
        };
      if (error) {
        conversations = [];
      } else {
        conversations = (data || []).map((conv: ConversationData) => ({
          id: conv.id,
          title: conv.title || 'Untitled Chat',
          messageCount: conv.message_count || 0,
          lastActivity: conv.updated_at,
          currentPhase: conv.current_phase,
          workflowId: conv.workflow_id
        }));
      }
    }
    
    // Apply conversation-level filtering
    let filteredConversations = conversations;
    
    if (phase !== undefined) {
      filteredConversations = filteredConversations.filter(conv => conv.currentPhase === phase);
    }
    
    // Apply pagination to conversations
    const paginatedConversations = filteredConversations.slice(offset, offset + limit);
    
    // ⚡ PERFORMANCE: Load recent messages with single JOIN query instead of N+1
    const conversationIds = paginatedConversations.map(conv => conv.id);

    let messagesMap = new Map();
    if (conversationIds.length > 0) {
      // 🔐 RLS-AWARE FETCH: Use SSR client when session exists, else use admin fallback (dev-only scenario)
      let clientForMessages: any = supabase;
      if (!userId) {
        const { supabaseAdmin } = await import('../../../../src/lib/database/supabase-client');
        clientForMessages = supabaseAdmin as any;
        console.log('[Chat History API][AuthDebug] Fetching messages via admin client (no session)');
      }

      const { data: allMessages, error: messagesError } = await clientForMessages
        .from('chat_messages')
        .select('conversation_id, message_id, role, content, parts, created_at, sequence_number, metadata')
        .in('conversation_id', conversationIds)
        .order('conversation_id', { ascending: true })
        .order('sequence_number', { ascending: true });

      if (!messagesError && allMessages) {
        // Group messages by conversation_id
        allMessages.forEach((msg: any) => {
          if (!messagesMap.has(msg.conversation_id)) {
            messagesMap.set(msg.conversation_id, []);
          }
          messagesMap.get(msg.conversation_id).push({
            id: msg.message_id,
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content || '',
            parts: msg.parts || [],
            createdAt: new Date(msg.created_at),
            metadata: msg.metadata || {}
          });
        });
      } else if (messagesError) {
        console.warn('[Chat History API] Messages query failed:', messagesError.message);
      }
    }

    // Process conversations with loaded messages
    const conversationsWithMessages = await Promise.all(
      paginatedConversations.map(async (conv) => {
        try {
          const recentMessages = messagesMap.get(conv.id) || [];
          // Auto-fix default/test titles with smart title generation
          const isDefaultLike = !conv.title ||
            /^(new(\s+academic)?\s+chat)$/i.test((conv.title || '').trim()) ||
            /^(untitled|new)$/i.test((conv.title || '').trim()) ||
            /academic\s+chat/i.test(conv.title || '') ||
            /^test\s+chat(\s+history)?$/i.test((conv.title || '').trim());

          let fixedTitle = conv.title || '';
          if (isDefaultLike) {
            // Build title from up to first 3 user messages
            const userTexts: string[] = [];
            for (const m of recentMessages) {
              if (m.role !== 'user') continue;
              const t = typeof m.content === 'string' ? m.content : (m.parts || []).find((p: any) => p.type === 'text')?.text || '';
              const s = (t || '').trim();
              if (s) userTexts.push(s);
              if (userTexts.length >= 3) break;
            }
            if (userTexts.length > 0) {
              // 🔧 CRITICAL FIX: Force OpenAI provider and model for title generation
              // This function ALREADY hardcodes titleOpenAI (OpenAI instance),
              // so we MUST use OpenAI-compatible model names only.
              // Previous bug: Used OpenRouter model names when primaryProvider was OpenRouter,
              // causing API errors and routing to wrong provider.
              const envOpenAIKey = process.env.OPENAI_API_KEY;
              if (envOpenAIKey) {
                const titleOpenAI = createOpenAI({ apiKey: envOpenAIKey });
                const dynamic = await getDynamicModelConfig();
                // Always use GPT-4o for title generation via OpenAI
                const titleModel = 'gpt-4o';
                const result = await generateText({
                  model: titleOpenAI(titleModel),
                  prompt: [
                    'Buat judul singkat dan spesifik (maksimal 25 karakter) dalam Bahasa Indonesia untuk percakapan akademik berikut.',
                    'Syarat: Title Case, tanpa tanda kutip, tanpa titik di akhir, tanpa nomor.',
                    'Dasarkan pada 1-3 prompt awal user:',
                    ...userTexts.map((t, i) => `${i + 1}. ${t}`),
                    'Output hanya judulnya saja.'
                  ].join('\n'),
                  temperature: Math.min(0.5, Math.max(0.1, dynamic.config.temperature || 0.3)),
                  maxOutputTokens: 32,
                });
                const raw = (result as any)?.text || '';
                const cleaned = raw.replace(/^"|"$/g, '').replace(/[\s\-–—:;,.!?]+$/g, '').replace(/\s+/g, ' ').trim();
                if (cleaned && !/^test\s+chat(\s+history)?$/i.test(cleaned)) {
                  const titleCased = cleaned.split(' ').map((w: string) => w.length > 2 ? (w[0].toUpperCase() + w.slice(1)) : w.toLowerCase()).join(' ');
                  fixedTitle = truncateTitle(titleCased);
                  // Persist update (admin client)
                  const { supabaseAdmin } = await import('../../../../src/lib/database/supabase-client');
                  await (supabaseAdmin as any)
                    .from('conversations')
                    .update({ title: fixedTitle })
                    .eq('id', conv.id);
                }
              }
            }
            
            // Fallbacks: if still default-like, try assistant-based and heuristic titles
            const looksDefault = (t: string) => /^(new(\s+academic)?\s+chat)$/i.test((t || '').trim()) ||
              /^(untitled|new)$/i.test((t || '').trim()) || /academic\s+chat/i.test(t || '') ||
              /^test\s+chat(\s+history)?$/i.test((t || '').trim());
            const toTitleCase = (str: string) => (str || '').split(' ').map(w => w.length > 2 ? (w[0].toUpperCase() + w.slice(1)) : w.toLowerCase()).join(' ');
            const sanitize = (raw: string) => (raw || '').replace(/^\"|\"$/g, '').replace(/[\s\-–—:;,.!?]+$/g, '').replace(/\s+/g, ' ').trim();

            if (!fixedTitle || looksDefault(fixedTitle)) {
              // Assistant-based fallback (use up to 3 assistant messages)
              const assistantTexts: string[] = [];
              for (const m of recentMessages) {
                if (m.role !== 'assistant') continue;
                const t = typeof m.content === 'string' ? m.content : (m.parts || []).find((p: any) => p.type === 'text')?.text || '';
                const s = (t || '').trim();
                if (s) assistantTexts.push(s);
                if (assistantTexts.length >= 3) break;
              }
              if (assistantTexts.length > 0) {
                try {
                  // 🔧 CRITICAL FIX: Force OpenAI provider and model for assistant-based title generation
                  // This function ALREADY hardcodes titleOpenAI (OpenAI instance),
                  // so we MUST use OpenAI-compatible model names only.
                  // Previous bug: Used OpenRouter model names when primaryProvider was OpenRouter,
                  // causing API errors and routing to wrong provider.
                  const envOpenAIKey = process.env.OPENAI_API_KEY;
                  if (envOpenAIKey) {
                    const titleOpenAI = createOpenAI({ apiKey: envOpenAIKey });
                    const dynamic2 = await getDynamicModelConfig();
                    const titleModel = 'gpt-4o'; // Always use GPT-4o for title generation via OpenAI
                    const result2 = await generateText({
                      model: titleOpenAI(titleModel),
                      prompt: [
                        'Buat judul singkat dan spesifik (maksimal 25 karakter) dalam Bahasa Indonesia untuk percakapan akademik berikut.',
                        'Syarat: Title Case, tanpa tanda kutip, tanpa titik di akhir, tanpa nomor.',
                        'Dasarkan pada konteks asisten berikut (1-3 baris):',
                        ...assistantTexts.map((t, i) => `${i + 1}. ${t}`),
                        'Output hanya judulnya saja.'
                      ].join('\n'),
                      temperature: 0.3,
                      maxOutputTokens: 32,
                    });
                    const cleaned2 = sanitize(((result2 as any)?.text || ''));
                    if (cleaned2 && !looksDefault(cleaned2)) {
                      fixedTitle = truncateTitle(toTitleCase(cleaned2));
                      const { supabaseAdmin } = await import('../../../../src/lib/database/supabase-client');
                      await (supabaseAdmin as any).from('conversations').update({ title: fixedTitle }).eq('id', conv.id);
                    }
                  }
                } catch (e) {
                  console.warn('[Chat History API] Assistant-based title generation failed:', e);
                }
              }
            }

            if (!fixedTitle || looksDefault(fixedTitle)) {
              // Heuristic fallback from any message content
              let heuristic = '';
              for (const m of recentMessages) {
                const t = typeof m.content === 'string' ? m.content : (m.parts || []).find((p: any) => p.type === 'text')?.text || '';
                const s = (t || '').trim();
                if (s && s.length > 10) { heuristic = s.length > 50 ? s.substring(0, 47) + '...' : s; break; }
              }
              if (heuristic) {
                const h = toTitleCase(sanitize(heuristic));
                if (h && !looksDefault(h)) {
                  fixedTitle = truncateTitle(h);
                  const { supabaseAdmin } = await import('../../../../src/lib/database/supabase-client');
                  await (supabaseAdmin as any).from('conversations').update({ title: fixedTitle }).eq('id', conv.id);
                }
              }
            }
          }
          const lastFewMessages = recentMessages.slice(-3); // Get last 3 messages as preview
          
          return {
            ...conv,
            title: fixedTitle || conv.title || 'Untitled Chat',
            recentMessages: lastFewMessages,
            totalMessages: recentMessages.length
          };
        } catch (error) {
          console.warn(`[Chat History API] Failed to load messages for conversation ${conv.id}:`, error);
          return {
            ...conv,
            recentMessages: [],
            totalMessages: 0
          };
        }
      })
    );
    
    const response = {
      conversations: conversationsWithMessages,
      metadata: {
        total: filteredConversations.length,
        limit,
        offset,
        hasMore: filteredConversations.length > offset + limit,
        filters: {
          phase
        },
        timestamp: Date.now()
      }
    };
    
    console.log(`[Chat History API] Returning ${paginatedConversations.length} conversations for user ${userId}`);
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[Chat History API] GET error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to load chat history',
      code: 'LOAD_HISTORY_FAILED',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * POST /api/chat/history/search - Search chat history
 * 
 * Request Body:
 * - userId: User identifier (required)
 * - query: Search query string (required)
 * - conversationIds: Specific conversation IDs to search (optional)
 * - limit: Maximum number of results (optional, default: 20)
 * - searchInContent: Search in message content (optional, default: true)
 * - searchInMetadata: Search in message metadata (optional, default: false)
 * - phase: Filter by academic phase (optional)
 * - messageType: Filter by message role (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      query,
      conversationIds,
      limit = 20,
      searchInContent = true,
      searchInMetadata = false,
      phase,
      messageType
    }: {
      userId: string;
      query: string;
      conversationIds?: string[];
      limit?: number;
      searchInContent?: boolean;
      searchInMetadata?: boolean;
      phase?: number;
      messageType?: 'user' | 'assistant' | 'system';
    } = body;
    
    if (!userId || !query) {
      return NextResponse.json({
        error: 'userId and query are required',
        code: 'MISSING_REQUIRED_FIELDS'
      }, { status: 400 });
    }

    console.log(`[Chat History Search API] Searching for "${query}" for user ${userId}`, {
      conversationIds,
      limit,
      searchInContent,
      searchInMetadata,
      phase,
      messageType
    });
    
    // Build search conditions
    const supabase = createSupabaseServerClient();
    let searchQuery = supabase
      .from('chat_messages')
      .select(`
        *,
        conversations!inner(
          id,
          user_id,
          title,
          current_phase,
          updated_at
        )
      `)
      .eq('conversations.user_id', userId);
    
    // Filter by conversation IDs if provided
    if (conversationIds && conversationIds.length > 0) {
      searchQuery = searchQuery.in('conversation_id', conversationIds);
    }
    
    // Filter by phase
    if (phase !== undefined) {
      searchQuery = searchQuery.eq('conversations.current_phase', phase);
    }
    
    // Filter by message type
    if (messageType) {
      searchQuery = searchQuery.eq('role', messageType);
    }
    
    // Execute search query
    const { data: searchResults, error } = await searchQuery
      .order('created_at', { ascending: false })
      .limit(limit * 2) as {
        data: SearchResult[] | null;
        error: any
      }; // Get more results for filtering
    
    if (error) {
      throw new Error(`Search query failed: ${error.message}`);
    }
    
    // Filter results based on search criteria
    const filteredResults = (searchResults || []).filter(result => {
      let matches = false;
      
      // Search in message content
      if (searchInContent && result.content) {
        const content = typeof result.content === 'string' 
          ? result.content 
          : JSON.stringify(result.content);
        matches = matches || content.toLowerCase().includes(query.toLowerCase());
      }
      
      // Search in message parts
      if (searchInContent && result.parts && Array.isArray(result.parts)) {
        for (const part of result.parts) {
          if (part.type === 'text' && part.text) {
            matches = matches || part.text.toLowerCase().includes(query.toLowerCase());
          }
        }
      }
      
      // Search in metadata
      if (searchInMetadata && result.metadata) {
        const metadata = JSON.stringify(result.metadata);
        matches = matches || metadata.toLowerCase().includes(query.toLowerCase());
      }
      
      return matches;
    }).slice(0, limit);
    
    // Transform results to include conversation context
    const enhancedResults = filteredResults.map(result => ({
      message: {
        id: result.message_id,
        role: result.role,
        content: result.content,
        parts: result.parts || [],
        createdAt: result.created_at,
        metadata: result.metadata || {}
      },
      conversation: {
        id: result.conversations.id,
        title: result.conversations.title,
        currentPhase: result.conversations.current_phase,
        updatedAt: result.conversations.updated_at
      },
      matchType: searchInContent && searchInMetadata ? 'content_and_metadata' : 
                 searchInContent ? 'content' : 'metadata'
    }));
    
    const response = {
      results: enhancedResults,
      query,
      metadata: {
        total: enhancedResults.length,
        limit,
        searchCriteria: {
          searchInContent,
          searchInMetadata,
          phase,
          messageType,
          conversationIds: conversationIds?.length || 0
        },
        timestamp: Date.now()
      }
    };
    
    console.log(`[Chat History Search API] Found ${enhancedResults.length} results for query "${query}"`);
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[Chat History Search API] POST error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Search failed',
      code: 'SEARCH_FAILED',
      timestamp: Date.now()
    }, { status: 500 });
  }
}
