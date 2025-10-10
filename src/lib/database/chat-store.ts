/**
 * AI SDK Compliant Chat Store Implementation
 * 
 * DOCUMENTATION COMPLIANCE:
 * - Implements saveChat() and loadChat() functions per /docs/04-ai-sdk-ui/03-chatbot-message-persistence.mdx
 * - Follows exact AI SDK patterns for message persistence
 * - Supports UIMessage[] format as specified in documentation
 * 
 * INTEGRATION FEATURES:
 * - Connects with existing 24-table Supabase database infrastructure
 * - Maintains message metadata including academic phase information
 * - Supports conversation management and workflow integration
 * - Implements server-side ID generation for consistency
 */

import { UIMessage, generateText } from 'ai';
import { supabaseAdmin, supabaseServer } from './supabase-client';
import { ConversationDetails, ConversationSummary } from '../types/database-types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database-types';
import { generateUUID, getValidUserUUID } from '../utils/uuid-generator';
import { getDynamicModelConfig } from '../ai/dynamic-config';
import { normalizePhase } from '../ai/workflow-engine';
// DATABASE FALLBACK: Import fallback mode utilities
import { 
  checkDatabaseHealth, 
  isFallbackModeActive,
  saveChatFallback,
  loadChatFallback,
  createChatFallback,
  getUserConversationsFallback,
  measureFallbackPerformance
} from './fallback-mode';

/**
 * UUID VALIDATION UTILITY
 * Validates if a given string is a valid UUID format for PostgreSQL compatibility
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * AI SDK Compliant saveChat function
 * 
 * MANDATORY IMPLEMENTATION per AI SDK documentation:
 * - Function signature: saveChat({ chatId, messages }): Promise<void>
 * - Stores messages in UIMessage[] format
 * - Handles message parts, metadata, and tool calls
 * 
 * @param params Object containing chatId and messages
 */
/**
 * Transform UIMessage[] to database format for storage
 */
async function transformMessagesForDB(messages: UIMessage[], chatId: string): Promise<any[]> {
  return messages.map((message, index) => {
    // Extract text content from parts (AI SDK pattern)
    const textContent = message.parts
      ?.filter(part => part.type === 'text')
      .map(part => (part as any).text)
      .join(' ') || '';

    return {
      conversation_id: chatId,
      message_id: message.id,
      role: message.role,
      content: textContent, // Extract from parts per AI SDK documentation
      parts: message.parts || [],
      sequence_number: index,
      metadata: {
        ...(typeof message.metadata === 'object' && message.metadata ? message.metadata : {}),
        timestamp: (message as any).createdAt ? new Date((message as any).createdAt).getTime() : Date.now(),
      },
    };
  });
}

/**
 * Persist messages to database
 */
async function persistMessages(chatId: string, messagesForDB: any[]): Promise<void> {
  const { error: messagesError } = await (supabaseAdmin as any)
    .from('chat_messages')
    .upsert(messagesForDB, {
      onConflict: 'message_id',
      ignoreDuplicates: false
    });

  if (messagesError) {
    throw new Error(`Failed to save messages: ${messagesError.message}`);
  }
}

/**
 * Update conversation metadata with latest information
 */
async function updateConversationMetadata(
  chatId: string,
  messages: UIMessage[],
  conversation: any
): Promise<void> {
  const latestMessage = messages[messages.length - 1];

  // Ensure we always work with a plain object to avoid spread errors when metadata is null
  const baseMetadata =
    conversation && typeof conversation.metadata === 'object' && conversation.metadata !== null
      ? conversation.metadata
      : {};

  const { count: dbMessageCount, error: countError } = await (supabaseAdmin as any)
    .from('chat_messages')
    .select('message_id', { head: true, count: 'exact' })
    .eq('conversation_id', chatId)
    .in('role', ['user', 'assistant']);

  if (countError) {
  }

  const messageCount = dbMessageCount ?? 0;

  const { error: conversationError } = await (supabaseAdmin as any)
    .from('conversations')
    .update({
      message_count: messageCount,
      updated_at: new Date().toISOString(),
      metadata: {
        ...baseMetadata,
        last_message_at: new Date().toISOString(),
        last_message_role: latestMessage?.role || baseMetadata.last_message_role || null,
        total_tokens: calculateTotalTokens(messages),
      }
    })
    .eq('id', chatId);

  if (conversationError) {
    // Don't throw - messages are saved, this is just metadata
  }
}

/**
 * Handle smart title generation in background (non-blocking)
 */
async function handleSmartTitleGeneration(chatId: string, messages: UIMessage[]): Promise<void> {
  try {
    const { data: conv } = await (supabaseAdmin as any)
      .from('conversations')
      .select('id,title,metadata')
      .eq('id', chatId)
      .single();
    const currentTitle = (conv as any)?.title || '';
    const metadata = (conv as any)?.metadata || {};

    // Check if title is still default/empty
    const isDefaultTitle = !currentTitle ||
      /^new(\s+academic)?\s+chat$/i.test(currentTitle.trim()) ||
      /^(untitled|new)$/i.test(currentTitle.trim()) ||
      /academic\s+chat/i.test(currentTitle) ||
      /^test\s+chat(\s+history)?$/i.test(currentTitle.trim());

    // ⚡ PERFORMANCE: Skip expensive title generation in critical path
    // RELAXED GUARD: allow regeneration when title still generic, regardless of prior flag
    if (isDefaultTitle && messages.length >= 2) {
      // Direct async execution - will complete before serverless function terminates
      try {
        const smartTitle = await generateSmartTitleFromMessages(messages);
        if (smartTitle && smartTitle !== currentTitle) {
          await (supabaseAdmin as any)
            .from('conversations')
            .update({
              title: smartTitle,
              metadata: {
                ...metadata,
                title_generated: true,
                title_generated_at: new Date().toISOString()
              }
            })
            .eq('id', chatId);

          // Send notification to UI about smart title generation
          if (typeof window !== 'undefined') {
            window.postMessage({
              type: 'smart-title-generated',
              chatId,
              title: smartTitle,
              timestamp: new Date().toISOString()
            }, '*');
          }
        }
      } catch (error) {
        // Smart title generation failed - keep using fallback title
        // Silent failure to not block conversation save
      }
    }
  } catch (error) {
  }
}

/**
 * AI SDK Compliant saveChat function - Refactored for maintainability
 *
 * MANDATORY IMPLEMENTATION per AI SDK documentation:
 * - Function signature: saveChat({ chatId, messages }): Promise<void>
 * - Stores messages in UIMessage[] format
 * - Handles message parts, metadata, and tool calls
 */
export async function saveChat({
  chatId,
  messages,
}: {
  chatId: string;
  messages: UIMessage[];
}): Promise<void> {
  const startTime = Date.now();

  try {

    // DATABASE FALLBACK: Check if database is available
    const health = await checkDatabaseHealth();

    if (!health.connected || isFallbackModeActive()) {
      return await measureFallbackPerformance(
        `saveChat-${chatId}`,
        () => saveChatFallback({ chatId, messages })
      ).then(result => result.result);
    }

    // Extract user ID from message metadata and ensure proper UUID format
    const rawUserId = extractUserIdFromMessages(messages);
    const userId = getValidUserUUID(rawUserId);

    // Step 1: Ensure conversation exists or create it
    const conversation = await ensureConversationExists(chatId, userId, messages);

    if (!conversation) {
      const detailedError = `❌ CRITICAL: Failed to create or retrieve conversation for chatId: ${chatId}, userId: ${userId}. This indicates a database constraint violation or connection issue.`;
      throw new Error(detailedError);
    }

    // Step 2: Transform and persist messages (parallel operations where safe)
    const messagesForDB = await transformMessagesForDB(messages, chatId);

    // Parallel execution for independent operations
    await Promise.all([
      persistMessages(chatId, messagesForDB),
      updateConversationMetadata(chatId, messages, conversation),
      handleSmartTitleGeneration(chatId, messages), // Non-blocking
      trackAIInteraction(chatId, userId, messages)
    ]);

    const saveTime = Date.now() - startTime;

  } catch (error) {
    const saveTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 🔍 ENHANCED ERROR CLASSIFICATION for better UI feedback
    const isConstraintError = errorMessage.includes('foreign key constraint') || errorMessage.includes('violates foreign key');
    const isConnectionError = errorMessage.includes('connection') || errorMessage.includes('timeout');
    const isAuthError = errorMessage.includes('auth') || errorMessage.includes('permission');

    let userFriendlyMessage = 'Gagal menyimpan percakapan';
    if (isConstraintError) {
      userFriendlyMessage = 'Error database: User tidak valid atau tidak terdaftar';
    } else if (isConnectionError) {
      userFriendlyMessage = 'Error koneksi database - coba lagi dalam beberapa saat';
    } else if (isAuthError) {
      userFriendlyMessage = 'Error autentikasi - silakan login ulang';
    }

    // DATABASE FALLBACK: Try fallback mode if database operation fails
    try {
      await measureFallbackPerformance(
        `saveChat-fallback-${chatId}`,
        () => saveChatFallback({ chatId, messages })
      );

    } catch (fallbackError) {
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);

      // 🔥 SURFACE DETAILED ERROR TO UI for proper user feedback
      const combinedError = new Error(`${userFriendlyMessage}\n\nDetail: Database (${errorMessage}) dan Fallback (${fallbackMessage})`);
      combinedError.name = 'ChatPersistenceError';
      throw combinedError;
    }
  }
}

/**
 * AI SDK Compliant loadChat function
 * 
 * MANDATORY IMPLEMENTATION per AI SDK documentation:
 * - Function signature: loadChat(id): Promise<UIMessage[]>
 * - Returns messages in UIMessage[] format
 * - Supports message validation with validateUIMessages
 * 
 * @param id Chat ID to load messages for
 */
export async function loadChat(id: string, client?: SupabaseClient<Database>): Promise<UIMessage[]> {
  const startTime = Date.now();
  
  try {
    
    // UUID FORMAT VALIDATION: Check if chatId is valid UUID for PostgreSQL
    if (!isValidUUID(id)) {
      const result = await measureFallbackPerformance(
        `loadChat-invalid-uuid-${id}`,
        () => loadChatFallback(id)
      );
      return result.result;
    }
    
    // DATABASE FALLBACK: Check if database is available
    const health = await checkDatabaseHealth();
    
    if (!health.connected || isFallbackModeActive()) {
      return await measureFallbackPerformance(
        `loadChat-${id}`,
        () => loadChatFallback(id)
      ).then(result => result.result);
    }
    
    // Load messages from database ordered by sequence
    const clientToUse = client ?? supabaseAdmin;
    const { data: dbMessages, error } = await (clientToUse as any)
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('sequence_number', { ascending: true });
    
    if (error) {
      throw new Error(`Failed to load messages: ${error.message}`);
    }
    
    if (!dbMessages || dbMessages.length === 0) {
      return [];
    }
    
    // Convert database messages to UIMessage format (AI SDK compliant)
    const uiMessages: UIMessage[] = (dbMessages || []).map((dbMessage: any) => {
      const baseParts = dbMessage.parts || [];

      // If we have content from database, ensure it's in parts format
      const textParts = dbMessage.content
        ? [{ type: 'text' as const, text: dbMessage.content }]
        : [];

      // Combine text parts with existing parts, avoiding duplicates
      const allParts = textParts.length > 0 && baseParts.length === 0
        ? textParts
        : baseParts;

      return {
        id: dbMessage.message_id,
        role: dbMessage.role as 'user' | 'assistant' | 'system',
        parts: allParts,
        // Add createdAt if database has timestamp
        ...(dbMessage.created_at && { createdAt: new Date(dbMessage.created_at) }),
        metadata: dbMessage.metadata || {}
      };
    });
    
    const loadTime = Date.now() - startTime;
    
    return uiMessages;
    
  } catch (error) {
    const loadTime = Date.now() - startTime;
    
    // DATABASE FALLBACK: Try fallback mode if database operation fails
    try {
      const result = await measureFallbackPerformance(
        `loadChat-fallback-${id}`,
        () => loadChatFallback(id)
      );
      
      return result.result;
    } catch (fallbackError) {
      
      // Return empty array as final fallback to prevent UI breakage
      return [];
    }
  }
}

/**
 * Create a new chat conversation
 * Required for new chat workflow per AI SDK documentation
 */
export async function createChat(userId?: string, title?: string): Promise<string> {
  try {
    // DATABASE FALLBACK: Check if database is available
    const health = await checkDatabaseHealth();
    
    if (!health.connected || isFallbackModeActive()) {
      return await createChatFallback(userId, title);
    }
    
    const chatId = generateUUID(); // Use proper UUID for PostgreSQL database compatibility
    const actualUserId = getValidUserUUID(userId); // Ensure proper UUID format for user_id
    
    const { error } = await (supabaseAdmin as any)
      .from('conversations')
      .insert({
        id: chatId,
        user_id: actualUserId,
        title: title || 'New Chat',
        description: 'AI-powered academic writing session',
        message_count: 0,
        metadata: {
          created_via: 'ai_sdk',
          ai_sdk_version: '5.x',
        },
        archived: false
      });
    
    if (error) {
      throw new Error(`Failed to create chat: ${error.message}`);
    }
    
    return chatId;
    
  } catch (error) {
    
    // DATABASE FALLBACK: Try fallback mode if database operation fails
    try {
      const fallbackChatId = await createChatFallback(userId, title);
      return fallbackChatId;
    } catch (fallbackError) {
      throw new Error(`Chat creation failed: Database (${error instanceof Error ? error.message : String(error)}) and Fallback (${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)})`);
    }
  }
}

/**
 * Get conversation summaries for a user
 * Supports chat history and conversation management
 */
export async function getUserConversations(userId: string, client?: SupabaseClient<Database>): Promise<ConversationSummary[]> {
  console.log('[getUserConversations] Called with userId:', userId, 'using client:', client ? 'custom' : 'supabaseServer');

  try {
    const clientToUse = client ?? supabaseServer;

    console.log('[getUserConversations] Executing database query...');
    const { data: conversations, error } = await (clientToUse as any)
      .from('conversations')
      .select(`
        id,
        title,
        message_count,
        updated_at,
        metadata
      `)
      .eq('user_id', userId)
      .eq('archived', false)
      .order('updated_at', { ascending: false })
      .limit(50);

    console.log('[getUserConversations] Database query result:', {
      hasError: !!error,
      errorMessage: error?.message,
      errorCode: (error as any)?.code,
      dataCount: conversations?.length || 0
    });

    if (error) {
      console.error('[getUserConversations] Database error:', {
        message: error.message,
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint
      });
      throw new Error(`Failed to load conversations: ${error.message}`);
    }

    console.log('[getUserConversations] Raw conversations data:', {
      count: conversations?.length || 0,
      conversations: conversations?.map((c: any) => ({ id: c.id, title: c.title }))
    });

    const summaries: ConversationSummary[] = (conversations || []).map((conv: any) => ({
      id: conv.id,
      title: conv.title || 'Untitled Chat',
      messageCount: conv.message_count,
      lastActivity: conv.updated_at,
    }));

    console.log('[getUserConversations] Returning summaries:', {
      count: summaries.length,
      summaries: summaries.map(s => ({ id: s.id, title: s.title }))
    });

    return summaries;

  } catch (error) {
    console.error('[getUserConversations] CRITICAL ERROR - Returning empty array:', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      stack: error instanceof Error ? error.stack : undefined
    });
    // Return empty array as graceful fallback to prevent UI breakage
    return [];
  }
}

/**
 * Get full conversation details including messages and workflow info
 */
export async function getConversationDetails(conversationId: string): Promise<ConversationDetails | null> {
  try {
    // Load conversation metadata
    const { data: conversation, error: convError } = await (supabaseServer as any)
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError) {
      return null;
    }

    if (!conversation) {
      return null;
    }

    // Load messages with error handling
    let messages: UIMessage[] = [];
    try {
      messages = await loadChat(conversationId);
    } catch (messageError) {
      // Continue with empty messages to provide partial data
    }

    // Simple return without workflow complexity (cleaned up)
    return {
      conversation,
      messages,
      workflow: null // Workflow system removed for simplicity
    } as any;

  } catch (error) {
    return null;
  }
}

// Helper functions

/**
 * Ensure conversation exists, create if needed
 */
async function ensureConversationExists(
  chatId: string, 
  userId: string, 
  messages: UIMessage[]
): Promise<any> {
  // Try to get existing conversation (use admin to bypass RLS and ensure visibility)
  const { data: existing } = await (supabaseAdmin as any)
    .from('conversations')
    .select('*')
    .eq('id', chatId)
    .single();
  
  if (existing) {
    return existing;
  }
  
  // Create new conversation with fast fallback title first (non-blocking)
  const fallbackTitle = generateTitleFromMessages(messages); // Fast heuristic title

  const { data: newConversation, error } = await (supabaseAdmin as any)
    .from('conversations')
    .insert({
      id: chatId,
      user_id: userId,
      title: fallbackTitle,
      message_count: 0,
      metadata: {
        created_via: 'ai_sdk',
        initial_message_count: messages.length,
        smart_title_pending: true // Flag untuk tracking smart title generation
      },
      archived: false
    })
    .select()
    .single();

  // 🔧 CRITICAL FIX: Direct execution instead of fire-and-forget
  // setImmediate() doesn't work in Vercel serverless - function terminates before callback executes
  // Smart title generation now completes before function returns
  if (!error && newConversation) {
    try {
      const smartTitle = await generateSmartTitleFromMessages(messages);

      if (smartTitle && smartTitle !== fallbackTitle) {
        await (supabaseAdmin as any)
          .from('conversations')
          .update({
            title: smartTitle,
            metadata: {
              ...newConversation.metadata,
              smart_title_generated: true,
              smart_title_generated_at: new Date().toISOString(),
              smart_title_pending: false
            }
          })
          .eq('id', chatId);

        // Send notification to UI about smart title generation
        if (typeof window !== 'undefined') {
          window.postMessage({
            type: 'smart-title-generated',
            chatId,
            title: smartTitle,
            timestamp: new Date().toISOString()
          }, '*');
        }
      }
    } catch (titleError) {
      // Update metadata to indicate failure but keep fallback title
      try {
        await (supabaseAdmin as any)
          .from('conversations')
          .update({
            metadata: {
              ...newConversation.metadata,
              smart_title_failed: true,
              smart_title_pending: false
            }
          })
          .eq('id', chatId);
      } catch (metadataError) {
        // Silent failure - don't block conversation creation if metadata update fails
      }
    }
  }
  
  if (error) {
    // If duplicate key, fetch the existing conversation and return it
    const dup = (error as any)?.code === '23505';
    if (dup) {
      const { data: existingAfterDup } = await (supabaseAdmin as any)
        .from('conversations')
        .select('*')
        .eq('id', chatId)
        .single();
      if (existingAfterDup) {
        return existingAfterDup;
      }
    }
    const detailedError = `❌ CRITICAL DATABASE ERROR: Failed to create conversation ${chatId} for user ${userId}. Error: ${error.message || error}. Code: ${(error as any)?.code || 'unknown'}`;
    throw new Error(detailedError); // 🔥 THROW instead of returning null to surface error to UI
  }
  
  return newConversation;
}

/**
 * Extract user ID from message metadata
 */
function extractUserIdFromMessages(messages: UIMessage[]): string | null {
  for (const message of messages) {
    const metadata = message.metadata;
    if (metadata && typeof metadata === 'object' && 'userId' in metadata) {
      return String(metadata.userId);
    }
  }
  return null;
}

/**
 * Generate conversation title from messages
 */
function generateTitleFromMessages(messages: UIMessage[]): string {
  // Find first user message with substantive content (AI SDK compliant)
  for (const message of messages) {
    if (message.role === 'user' && message.parts) {
      // Extract text from parts array per AI SDK documentation
      const textPart = message.parts.find(p => p.type === 'text') as { text: string } | undefined;
      const content = textPart?.text || '';

      if (content.length > 10) {
        // Take first 50 characters and add ellipsis if longer
        return content.length > 50 ? content.substring(0, 47) + '...' : content;
      }
    }
  }

  return 'New Academic Chat';
}

/**
 * Generate a smart conversation title using AI model based on first 1–3 user prompts.
 * Falls back to heuristic if model call fails. Compliant with AI SDK v5 generateText.
 * 🔧 FIX: Uses proper OpenAI configuration with explicit API key to prevent API key errors
 */
async function generateSmartTitleFromMessages(messages: UIMessage[]): Promise<string> {
  try {
    // Collect up to first 3 user messages with non-empty text (AI SDK compliant)
    const userTexts: string[] = [];
    for (const msg of messages) {
      if (msg.role !== 'user' || !msg.parts) continue;

      // Extract text from parts array per AI SDK documentation
      const textPart = msg.parts.find(p => p.type === 'text') as { text: string } | undefined;
      const text = textPart?.text || '';
      const trimmed = text.trim();

      if (trimmed.length > 0) userTexts.push(trimmed);
      if (userTexts.length >= 3) break;
    }

    if (userTexts.length === 0) {
      
      return 'New Academic Chat';
    }

    // Build concise prompt for title generation
    const prompt = [
      'Buat judul singkat dan spesifik (5-12 kata) dalam Bahasa Indonesia untuk percakapan akademik berikut.',
      'Syarat: Title Case, tanpa tanda kutip, tanpa titik di akhir, tanpa nomor.',
      'Dasarkan pada 1-3 prompt awal user di bawah ini:',
      ...userTexts.map((t, i) => `${i + 1}. ${t}`),
      'Output hanya judulnya saja.'
    ].join('\n');

    // 🔧 FIX: Use proper OpenAI configuration with explicit API key (same as main chat)
    let createOpenAI: any;
    try {
      const openaiModule = await import('@ai-sdk/openai');
      createOpenAI = openaiModule.createOpenAI;
    } catch (importError) {
      return generateTitleFromMessages(messages);
    }

    // Get environment API key (guaranteed to work since main chat works)
    const envOpenAIKey = process.env.OPENAI_API_KEY;
    if (!envOpenAIKey) {
      return generateTitleFromMessages(messages);
    }

    // Create OpenAI provider with explicit API key (same pattern as dynamic-config.ts)
    const titleOpenAI = createOpenAI({
      apiKey: envOpenAIKey,
    });

    // 🔧 CRITICAL FIX: Always use GPT-4o for title generation
    // This function ALREADY hardcodes titleOpenAI (OpenAI instance),
    // so we MUST use OpenAI-compatible model names only.
    // Previous bug: Used OpenRouter model names when primaryProvider was OpenRouter,
    // causing API errors and routing to wrong provider.
    let titleModel = 'gpt-4o'; // Force GPT-4o for all title generation
    let titleTemperature = 0.3; // Conservative temperature for consistent titles

    try {
      const dynamicConfig = await getDynamicModelConfig();
      // Use dynamic temperature but cap it for title generation
      titleTemperature = Math.min(dynamicConfig.config.temperature * 3, 0.5);
    } catch (error) {
      // Silently use fallback temperature
    }

    // Use dynamic model selection for title generation
    const model = titleOpenAI(titleModel);

    const result = await generateText({
      model,
      prompt,
      temperature: titleTemperature, // ✅ Dynamic temperature from admin panel
      maxOutputTokens: 32, // ✅ AI SDK v5 compliant parameter name
    });

    // Type-safe extraction of text (AI SDK v5 compliant)
    const raw = result && typeof result === 'object' && 'text' in result
      ? String(result.text)
      : '';
    const title = sanitizeTitle(raw);
    return title.length > 0 ? title : generateTitleFromMessages(messages);
  } catch (err) {
    return generateTitleFromMessages(messages);
  }
}

function sanitizeTitle(input: string): string {
  let t = (input || '').trim();
  // Remove surrounding quotes
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith('\'') && t.endsWith('\''))) {
    t = t.slice(1, -1).trim();
  }
  // Remove trailing punctuation
  t = t.replace(/[\s\-–—:;,.!?]+$/g, '');
  // Collapse whitespace
  t = t.replace(/\s+/g, ' ').trim();
  // Title Case basic (conservative)
  t = t.split(' ').map(w => w.length > 2 ? (w[0].toUpperCase() + w.slice(1)) : w.toLowerCase()).join(' ');
  // Avoid generic defaults
  if (/^new (academic )?chat$/i.test(t)) {
    return '';
  }
  return t;
}

/**
 * Calculate total tokens from messages
 */
function calculateTotalTokens(messages: UIMessage[]): number {
  return messages.reduce((total, message) => {
    const metadata = message.metadata;
    if (metadata && typeof metadata === 'object' && 'tokens' in metadata) {
      const tokens = Number(metadata.tokens);
      return total + (!isNaN(tokens) ? tokens : 0);
    }
    return total;
  }, 0);
}

/**
 * Track AI interaction for monitoring and cost calculation
 */
async function trackAIInteraction(
  conversationId: string,
  userId: string,
  messages: UIMessage[]
): Promise<void> {
  try {
    const latestMessage = messages[messages.length - 1];

    // Only track assistant messages (AI responses)
    if (latestMessage.role !== 'assistant') {
      return;
    }

    const metadata = latestMessage.metadata || {};

    // Get dynamic fallback model name if metadata doesn't specify model
    let fallbackModel = 'gpt-4o'; // Last resort fallback
    try {
      const dynamicConfig = await getDynamicModelConfig();
      fallbackModel = dynamicConfig.primaryModelName; // ✅ Dynamic from admin panel
    } catch (error) {
    }

    // Type-safe metadata extraction
    const provider = typeof metadata === 'object' && metadata && 'provider' in metadata
      ? String(metadata.provider)
      : 'openai';
    const model = typeof metadata === 'object' && metadata && 'model' in metadata
      ? String(metadata.model)
      : fallbackModel;
    const promptTokens = typeof metadata === 'object' && metadata && 'promptTokens' in metadata
      ? Number(metadata.promptTokens) || 0
      : 0;
    const completionTokens = typeof metadata === 'object' && metadata && 'completionTokens' in metadata
      ? Number(metadata.completionTokens) || 0
      : 0;
    const totalTokens = typeof metadata === 'object' && metadata && 'tokens' in metadata
      ? Number(metadata.tokens) || 0
      : 0;
    const responseTime = typeof metadata === 'object' && metadata && 'responseTime' in metadata
      ? Number(metadata.responseTime) || 0
      : 0;
    const rawPhase =
      typeof metadata === 'object' && metadata && 'phase' in metadata
        ? (metadata as any).phase
        : undefined;
    const phase = normalizePhase(rawPhase);

    await (supabaseAdmin as any)
      .from('ai_interactions')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        provider,
        model,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        response_time: responseTime,
        interaction_data: {
          message_id: latestMessage.id,
          has_tool_calls: latestMessage.parts?.some(p => p.type === 'tool-result') || false,
          phase
        }
      });
    
  } catch (error) {
    // Don't throw - this is just tracking
  }
}

/**
 * Performance monitoring function
 */
export async function measureChatPerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<{ result: T; performance: { time: number; operation: string } }> {
  const startTime = Date.now();
  
  try {
    const result = await fn();
    const time = Date.now() - startTime;

    return {
      result,
      performance: { time, operation }
    };
  } catch (error) {
    const time = Date.now() - startTime;
    throw error;
  }
}
