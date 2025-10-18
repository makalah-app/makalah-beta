/**
 * CHAT HISTORY API ENDPOINT
 *
 * CLEAN VERSION: All workflow references removed
 *
 * TECHNICAL SPECIFICATIONS:
 * - Basic history retrieval functionality for users
 * - Message search and filtering capabilities
 * - Session-based message retrieval
 * - 100% AI SDK v5 compliance
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
// Note: LLM calls removed from history endpoint for performance
import { SYSTEM_USER_UUID } from '../../../../src/lib/utils/uuid-generator';
import type { ExtendedUIMessage, ConversationData, SearchResult } from './types';

// Allow for database operations
export const maxDuration = 30;

/**
 * Truncate title to maximum length with ellipsis
 * Smart truncation: avoids breaking words when possible
 *
 * @param title - The title string to truncate
 * @param maxLength - Maximum allowed length (default: 35 chars for UI consistency)
 * @returns Truncated title with "..." if exceeded
 */
// truncateTitle removed: not used in fast read path

function normalizeLastActivity(rawValue: unknown, secondaryValue?: unknown): string {
  const tryParse = (value: unknown): string | null => {
    if (!value && value !== 0) {
      return null;
    }

    if (value instanceof Date) {
      const timestamp = value.getTime();
      return Number.isNaN(timestamp) ? null : value.toISOString();
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      const parsed = new Date(trimmed);
      const timestamp = parsed.getTime();
      return Number.isNaN(timestamp) ? null : parsed.toISOString();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      const parsed = new Date(value);
      const timestamp = parsed.getTime();
      return Number.isNaN(timestamp) ? null : parsed.toISOString();
    }

    return null;
  };

  return (
    tryParse(rawValue) ??
    (secondaryValue !== undefined ? tryParse(secondaryValue) : null) ??
    new Date(0).toISOString()
  );
}

function sortByLastActivityDesc<T extends { lastActivity?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aTime = new Date(a?.lastActivity ?? 0).getTime();
    const bTime = new Date(b?.lastActivity ?? 0).getTime();
    return bTime - aTime;
  });
}

/**
 * GET /api/chat/history - Get chat history with filtering
 *
 * Query Parameters:
 * - userId: User identifier (required)
 * - conversationId: Specific conversation ID (optional)
 * - limit: Maximum number of messages/conversations to return (optional, default: 50)
 * - offset: Offset for pagination (optional, default: 0)
 * - dateFrom: Filter messages from date (ISO string, optional)
 * - dateTo: Filter messages to date (ISO string, optional)
 * - messageType: Filter by message role (user|assistant|system, optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const session = await getServerSessionUserId();
    const sessionUserId = session.userId;
    const qpUserId = searchParams.get('userId') || undefined;
    const userId = sessionUserId || undefined;
    const conversationId = searchParams.get('conversationId');
    const chatId = searchParams.get('chatId'); // AI SDK v5 pattern support
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const mode = (searchParams.get('mode') || '').toLowerCase();
    const debug = (searchParams.get('debug') || '') === '1';
    const t0 = Date.now();
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const messageType = searchParams.get('messageType') as 'user' | 'assistant' | 'system' | undefined;
    const supabase = createSupabaseServerClient();

    // LEAN MODE: fast path without LLM and without joining messages
    if (mode === 'lean') {
      const start = offset;
      const end = Math.max(offset + limit - 1, offset);

      let leanRows: Array<any> = [];

      if (userId) {
        const { data, error } = await (supabase as any)
          .from('conversations')
          .select('id,title,message_count,updated_at')
          .eq('user_id', userId)
          .eq('archived', false)
          .order('updated_at', { ascending: false })
          .range(start, end);

        leanRows = (data || []) as any[];
      } else if (qpUserId) {
        const { supabaseAdmin } = await import('../../../../src/lib/database/supabase-client');
        const { data, error } = await (supabaseAdmin as any)
          .from('conversations')
          .select('id,title,message_count,updated_at,user_id')
          .in('user_id', [qpUserId as string, SYSTEM_USER_UUID])
          .eq('archived', false)
          .order('updated_at', { ascending: false })
          .range(start, end);

        leanRows = (data || []) as any[];
      } else {
        const response = {
          conversations: [],
          metadata: { total: 0, limit, offset, hasMore: false, timestamp: Date.now() }
        };
        return NextResponse.json(response);
      }

      const conversations = leanRows.map((row: any) => ({
        id: row.id,
        title: row.title || 'Untitled Chat',
        messageCount: row.message_count || 0,
        lastActivity: row.updated_at,
      }));

      const hasMore = conversations.length === limit;
      const metadata: any = { limit, offset, hasMore, timestamp: Date.now() };
      if (debug) {
        metadata.durationMs = Date.now() - t0;
        metadata.mode = 'lean';
      }
      return NextResponse.json({ conversations, metadata });
    }

    // AI SDK v5 PATTERN: Simple chatId-only loading for persistence (enforce ownership via session)
    if (chatId) {
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
      }
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
        return NextResponse.json(messages);
      } catch (error) {
        return NextResponse.json([]);
      }
    }

    if (!userId && !qpUserId) {
      const response = {
        conversations: [],
        metadata: {
          total: 0,
          limit,
          offset,
          hasMore: false,
          timestamp: Date.now(),
        }
      };
      return NextResponse.json(response);
    }

    // If specific conversation requested, load its messages
    if (conversationId) {
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
            dateFrom,
            dateTo,
            messageType
          },
          timestamp: Date.now()
        }
      };

      return NextResponse.json(response);
    }

    // Load user conversations for general history
    let conversations: Array<{
      id: string;
      title: string;
      messageCount: number;
      lastActivity: string;
      messages?: ExtendedUIMessage[];
      metadata?: any;  // Required for smart_title_pending check in isDefaultLike
    }> = [];
    if (userId) {
      conversations = await getUserConversations(userId, supabase);
    } else {
      const { supabaseAdmin } = await import('../../../../src/lib/database/supabase-client');
      const { data, error } = await (supabaseAdmin as any)
        .from('conversations')
        .select(`
          id,
          title,
          message_count,
          updated_at,
          last_message_at,
          metadata,
          user_id
        `)
        .in('user_id', [qpUserId as string, SYSTEM_USER_UUID])
        .eq('archived', false)
        .order('last_message_at', { ascending: false })
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
          lastActivity: conv.last_message_at || conv.updated_at,
          metadata: conv.metadata || {}  // Propagate metadata for smart_title_pending check
        }));
      }
    }

    // Apply pagination to conversations
    const paginatedConversations = conversations.slice(offset, offset + limit);

    // ⚡ PERFORMANCE: Load recent messages with single JOIN query instead of N+1
    const conversationIds = paginatedConversations.map(conv => conv.id);

    let messagesMap = new Map();
    if (conversationIds.length > 0) {
      let clientForMessages: any = supabase;
      if (!userId) {
        const { supabaseAdmin } = await import('../../../../src/lib/database/supabase-client');
        clientForMessages = supabaseAdmin as any;
      }

      const { data: allMessages, error: messagesError } = await clientForMessages
        .from('chat_messages')
        .select('conversation_id, message_id, role, content, parts, created_at, sequence_number, metadata')
        .in('conversation_id', conversationIds)
        .order('conversation_id', { ascending: true })
        .order('sequence_number', { ascending: true });

      if (!messagesError && allMessages) {
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
      }
    }

    // Process conversations with loaded messages
    const conversationsWithMessages = await Promise.all(
      paginatedConversations.map(async (conv) => {
        try {
          const recentMessages = messagesMap.get(conv.id) || [];

          /* Auto-fix default/test titles with smart title generation
          // Now includes: metadata flag check + length check for backward compatibility
          const isDefaultLike = !conv.title ||
            /^(new(\s+academic)?\s+chat)$/i.test((conv.title || '').trim()) ||
            /^(untitled|new)$/i.test((conv.title || '').trim()) ||
            /academic\s+chat/i.test(conv.title || '') ||
            /^test\s+chat(\s+history)?$/i.test((conv.title || '').trim()) ||
            (conv.metadata as any)?.smart_title_pending === true ||  // NEW: Respect metadata flag from ensure route
            (conv.title || '').length > 35;  // NEW: Fix overly long titles from old heuristic system

          let fixedTitle = conv.title || '';
          if (false && isDefaultLike) {
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
              const dynamic = await getDynamicModelConfig();
              const result = await generateText({
                model: dynamic.primaryModel,
                prompt: [
                  // SEMANTIC INTELLIGENCE MURNI: Capture unique essence, NOT keyword extraction
                  'Capture the semantic essence of this conversation JUST FROM YOUR RESPONSE in a maximum of 35 Bahasa Indonesia characters, in concise, literal',
                  '',
                  // UNIQUENESS: Focus on what makes THIS conversation distinct
                  'concise, literal, not poetic.',
                  '',
                  // CONTEXT: User's actual messages
                  'Konteks percakapan:',
                  ...userTexts.map((t, i) => `${i + 1}. ${t}`),
                  '',
                  // OUTPUT: Only title, no formatting instructions (let model decide natural style)
                  'Output HANYA judul (tanpa quotes, tanpa nomor, tanpa penjelasan).'
                ].join('\n'),
                temperature: 0.75,  // Higher for creative diversity (was 0.1-0.5)
                maxOutputTokens: 48,
              });
              const raw = (result as any)?.text || '';
              // MINIMAL POST-PROCESSING: Only clean quotes/whitespace, NO forced Title Case
              const cleaned = raw.replace(/^["\']|["\']$/g, '').replace(/\s+/g, ' ').trim();
              if (cleaned && !/^test\s+chat(\s+history)?$/i.test(cleaned)) {
                // Let model's natural style remain - no Title Case enforcement
                fixedTitle = truncateTitle(cleaned);

                // Pre-insert validation: Ensure title doesn't exceed 35 chars (database constraint)
                if (fixedTitle.length > 35) {
                  fixedTitle = fixedTitle.substring(0, 32).trim() + '...';
                }

                const { supabaseAdmin } = await import('../../../../src/lib/database/supabase-client');
                await (supabaseAdmin as any)
                  .from('conversations')
                  .update({ title: fixedTitle })
                  .eq('id', conv.id);
              }
            }

            // Fallbacks: if still default-like, try assistant-based and heuristic titles
            const looksDefault = (t: string) => /^(new(\s+academic)?\s+chat)$/i.test((t || '').trim()) ||
              /^(untitled|new)$/i.test((t || '').trim()) || /academic\s+chat/i.test(t || '') ||
              /^test\s+chat(\s+history)?$/i.test((t || '').trim());
            const toTitleCase = (str: string) => (str || '').split(' ').map(w => w.length > 2 ? (w[0].toUpperCase() + w.slice(1)) : w.toLowerCase()).join(' ');
            const sanitize = (raw: string) => (raw || '').replace(/^\"|\"$/g, '').replace(/[\s\-–—:;,.!?]+$/g, '').replace(/\s+/g, ' ').trim();

            if (false && (!fixedTitle || looksDefault(fixedTitle))) {
              // Assistant-based fallback
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
                  const dynamic2 = await getDynamicModelConfig();
                  const result2 = await generateText({
                    model: dynamic2.primaryModel,
                    prompt: [
                      // SEMANTIC INTELLIGENCE MURNI (Assistant Fallback)
                      'Tangkap esensi semantik UNIK dari percakapan ini dalam maksimal 35 karakter Bahasa Indonesia.',
                      '',
                      // DIVERSITY ENFORCEMENT
                      'Hindari pola generik akademis seperti:',
                      '- "Analisis...", "Pengaruh...", "Studi...", "Penelitian..."',
                      '- "Aspek...", "Tinjauan...", "Kajian...", "Pemahaman..."',
                      '- "Peranan...", "Hubungan...", "Dampak...", "Faktor..."',
                      '',
                      // UNIQUENESS from assistant responses
                      'Fokus pada sudut pandang SPESIFIK yang membedakan percakapan INI dari topik serupa.',
                      'Be creative, precise, memorable.',
                      '',
                      // CONTEXT: Assistant's structured responses
                      'Konteks dari asisten:',
                      ...assistantTexts.map((t, i) => `${i + 1}. ${t}`),
                      '',
                      'Output HANYA judul (tanpa quotes, tanpa nomor, tanpa penjelasan).'
                    ].join('\n'),
                    temperature: 0.7,  // Slightly lower than primary but still creative (was 0.3)
                    maxOutputTokens: 48,
                  });
                  const cleaned2 = sanitize(((result2 as any)?.text || ''));
                  if (cleaned2 && !looksDefault(cleaned2)) {
                    // NO Title Case enforcement - let model decide natural style
                    fixedTitle = truncateTitle(cleaned2);

                    // Pre-insert validation: Ensure title doesn't exceed 35 chars (database constraint)
                    if (fixedTitle.length > 35) {
                      fixedTitle = fixedTitle.substring(0, 32).trim() + '...';
                    }

                    const { supabaseAdmin } = await import('../../../../src/lib/database/supabase-client');
                    await (supabaseAdmin as any).from('conversations').update({ title: fixedTitle }).eq('id', conv.id);
                  }
                } catch (e) {
                  // Silent fail - fallback to next title generation method
                }
              }
            }

            if (!fixedTitle || looksDefault(fixedTitle)) {
              // Heuristic fallback from any message content (NO LLM, pure extraction)
              let heuristic = '';
              for (const m of recentMessages) {
                const t = typeof m.content === 'string' ? m.content : (m.parts || []).find((p: any) => p.type === 'text')?.text || '';
                const s = (t || '').trim();
                if (s && s.length > 10) {
                  heuristic = s.length > 35 ? s.substring(0, 32) + '...' : s;
                  break;
                }
              }
              if (heuristic) {
                // NO Title Case enforcement - preserve natural text style
                const h = sanitize(heuristic);
                if (h && !looksDefault(h)) {
                  fixedTitle = truncateTitle(h);

                  // Pre-insert validation: Ensure title doesn't exceed 35 chars (database constraint)
                  if (fixedTitle.length > 35) {
                    fixedTitle = fixedTitle.substring(0, 32).trim() + '...';
                  }

                  const { supabaseAdmin } = await import('../../../../src/lib/database/supabase-client');
                  await (supabaseAdmin as any).from('conversations').update({ title: fixedTitle }).eq('id', conv.id);
                }
              }
            }
          */
          const lastFewMessages = recentMessages.slice(-3);
          const lastMessage = recentMessages.length > 0
            ? recentMessages[recentMessages.length - 1]
            : null;
          const normalizedLastActivity = normalizeLastActivity(
            lastMessage?.createdAt,
            conv.lastActivity
          );

          return {
            ...conv,
            title: conv.title || 'Untitled Chat',
            lastActivity: normalizedLastActivity,
            recentMessages: lastFewMessages,
            totalMessages: recentMessages.length
          };
        } catch (error) {
          return {
            ...conv,
            lastActivity: normalizeLastActivity(conv.lastActivity),
            recentMessages: [],
            totalMessages: 0
          };
        }
      })
    );

    const sortedConversations = sortByLastActivityDesc(conversationsWithMessages);

    const metadata: any = {
      total: conversations.length,
      limit,
      offset,
      hasMore: conversations.length > offset + limit,
      timestamp: Date.now()
    };
    if (debug) {
      metadata.durationMs = Date.now() - t0;
      metadata.mode = 'full';
    }
    return NextResponse.json({ conversations: sortedConversations, metadata });

  } catch (error) {
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
      messageType
    }: {
      userId: string;
      query: string;
      conversationIds?: string[];
      limit?: number;
      searchInContent?: boolean;
      searchInMetadata?: boolean;
      messageType?: 'user' | 'assistant' | 'system';
    } = body;

    if (!userId || !query) {
      return NextResponse.json({
        error: 'userId and query are required',
        code: 'MISSING_REQUIRED_FIELDS'
      }, { status: 400 });
    }

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
          updated_at
        )
      `)
      .eq('conversations.user_id', userId);

    // Filter by conversation IDs if provided
    if (conversationIds && conversationIds.length > 0) {
      searchQuery = searchQuery.in('conversation_id', conversationIds);
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
      };

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
          messageType,
          conversationIds: conversationIds?.length || 0
        },
        timestamp: Date.now()
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Search failed',
      code: 'SEARCH_FAILED',
      timestamp: Date.now()
    }, { status: 500 });
  }
}
