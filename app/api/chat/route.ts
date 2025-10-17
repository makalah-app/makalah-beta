/**
 * CHAT API ROUTE - DUAL PROVIDER IMPLEMENTATION
 * 
 * AI SDK v5 compliant streaming dengan OpenAI GPT-4o primary
 * dan OpenRouter Gemini 2.5 Flash fallback. Enhanced academic workflow support.
 */

import {
  type UIMessage,
  convertToModelMessages
} from 'ai';
import { Agent } from '@ai-sdk-tools/agents';
import { openai } from '@ai-sdk/openai';
import { getDynamicModelConfig } from '../../../src/lib/ai/dynamic-config';
import { getUserIdWithSystemFallback } from '../../../src/lib/database/supabase-server-auth';
import { getValidUserUUID } from '../../../src/lib/utils/uuid-generator';
import { getProviderManager } from '../../../src/lib/ai/providers';
import { artifactWriterAgent } from '../../../src/lib/ai/agents/artifact-writer';
import { supabaseMemoryProvider } from '../../../src/lib/ai/memory/supabase-memory-provider';
import { setContext, clearContext } from '../../../src/lib/ai/tools/artifact-context';

const WORKING_MEMORY_TEMPLATE = `# Ringkasan Konteks

## Topik Utama
- (isi ringkasan poin penting tentang topik dan tujuan penulisan)

## Instruksi & Preferensi Pengguna
- (catat gaya bahasa, struktur, atau arahan spesifik yang harus diingat)

## Catatan Tindak Lanjut
- (ringkas hal yang sudah / belum dikerjakan, revisi yang diminta, dan fokus berikutnya)
`;

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // Extract chatId from headers for persistence
    const chatId = req.headers.get('X-Chat-Id') || undefined;

    // Extract user ID from authenticated session - NO FALLBACK to 'system'
    let userId = await getUserIdWithSystemFallback();
    
    // Parse request body
    const rawPayload: any = await req.json();
    const {
      messages,
      testMode = false,
      userId: clientUserId
    }: {
      messages: UIMessage[];
      testMode?: boolean;
      customKey?: string;
      userId?: string;
      username?: string;
    } = rawPayload || {};

    // ENHANCED FALLBACK: if SSR session missing, use client-provided userId with validation
    const headerUserId = req.headers.get('X-User-Id') || undefined;
    if (!userId) {
      const candidate = clientUserId || headerUserId;
      const valid = getValidUserUUID(candidate || undefined);
      if (valid !== '00000000-0000-4000-8000-000000000000') {
        userId = valid;
      }
    }

    // 🔒 AUTHENTICATION GUARD: Require valid user ID for all operations
    // No fallback - must have either authenticated session or valid client-provided UUID
    if (!userId) {
      return new Response(JSON.stringify({
        error: 'AUTHENTICATION_REQUIRED',
        message: 'Valid user authentication required for all chat operations',
      }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // Validate and ensure messages have proper structure
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('Messages array is required and must not be empty');
    }

    // Simple message validation - trust LLM intelligence
    // Ensure messages have proper AI SDK v5 UIMessage structure
    const validatedMessages: UIMessage[] = messages.map(msg => {
      // If message already has proper v5 structure, use it
      if (msg.id && msg.parts) {
        return msg;
      }

      // Convert legacy format to v5 structure
      const textContent = (msg as any).content ||
                         msg.parts?.map((p: any) => p.type === 'text' ? p.text : '').join('') ||
                         '';

      return {
        id: msg.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: msg.role,
        parts: [{ type: 'text' as const, text: textContent }],
        metadata: msg.metadata
      } as UIMessage;
    });

    // Use simple validated messages - trust LLM intelligence

    // Get provider manager
    const providerManager = getProviderManager();

    // Get dynamic model configuration from database
    const dynamicConfig = await getDynamicModelConfig();

    // ✅ MOKA as proper orchestrator Agent
    const mokaAgent = new Agent({
      name: 'MOKA',  // ✅ Orchestrator identity

      model: dynamicConfig.primaryProvider === 'openai'
        ? (openai as any).responses(dynamicConfig.primaryModelName || 'gpt-4o')
        : dynamicConfig.primaryModel,

      instructions: () => {
        // ✅ Load system prompt from database
        return dynamicConfig.systemPrompt?.trim() || '';
      },

      handoffs: [artifactWriterAgent],  // ✅ Explicit specialist registration

      tools: {
        // OpenAI native web search
        web_search: (openai as any).tools.webSearch({
          searchContextSize: 'high',
        }),
      },

      maxTurns: 10,

      modelSettings: {  // ✅ FIXED: temperature & topP must be in modelSettings
        temperature: dynamicConfig.config.temperature,
        topP: dynamicConfig.config.topP,
      },
      memory: {
        provider: supabaseMemoryProvider,
        workingMemory: {
          enabled: true,
          scope: 'chat',
          template: WORKING_MEMORY_TEMPLATE,
        },
        history: {
          enabled: true,
          limit: 12,
        },
      },
    });

    // Track response time for health monitoring
    const responseStartTime = Date.now();

    // ✅ LOAD CHAT HISTORY FROM DATABASE (Fix for conversation memory)
    // Load previous messages for context if chatId exists
    let allMessages: UIMessage[] = [];
    if (chatId) {
      try {
        const { loadChat } = await import('../../../src/lib/database/chat-store');
        const historyMessages = await loadChat(chatId);

        // Combine history + new user message (last message from client)
        const newUserMessage = validatedMessages[validatedMessages.length - 1];
        allMessages = [...historyMessages, newUserMessage];
      } catch (loadError) {
        console.error('[CHAT HISTORY ERROR]', loadError);
        // Fallback: use only client messages if loading fails
        allMessages = validatedMessages;
      }
    } else {
      // No chatId = new conversation, use client messages
      allMessages = validatedMessages;
    }

    // ✅ Convert UIMessage[] to ModelMessage[] for Agent
    const modelMessages = convertToModelMessages(allMessages);

    // ✅ Use Agent's built-in streaming
    return mokaAgent.toUIMessageStream({
      messages: modelMessages,
      maxRounds: 5,  // Allow up to 5 agent handoffs
      context: {  // ✅ Pass user data to Agent context
        userId,
        chatId,
      },
      beforeStream: async ({ writer }) => {
        // ✅ ARTIFACT CONTEXT: Set context for tool access
        setContext({
          writer,
          userId,
          sessionId: chatId,
          metadata: {
            requestTime: Date.now(),
            userAgent: req.headers.get('user-agent') || undefined,
          },
        });
        return true; // Continue streaming
      },
      onFinish: () => {
        // Record success for provider health tracking
        const responseEndTime = Date.now();
        const responseTime = responseEndTime - responseStartTime;
        providerManager.recordSuccess(
          dynamicConfig.primaryProvider === 'openai' ? 'openai' : 'openrouter',
          responseTime
        );
        // ✅ ARTIFACT CONTEXT: Clear context after completion
        clearContext();
      },
    });
    
  } catch (error) {

    // 🛡️ GRACEFUL DEGRADATION: Try to return stream with error if possible
    try {
      // Simple error response instead of complex stream

      return new Response(JSON.stringify({
        error: 'Kedua provider AI tidak tersedia',
        message: 'Silakan coba beberapa saat lagi',
        providers: {
          primary: 'OpenAI GPT-4o',
          fallback: 'OpenRouter Gemini 2.5 Flash'
        },
        timestamp: Date.now(),
        isRetryable: true
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Error': 'true',
          'X-Provider-Status': 'both_unavailable'
        }
      });
    } catch (streamError) {
      // 🚨 ULTIMATE FALLBACK: Plain JSON response

      return new Response(JSON.stringify({
        error: 'Sistem tidak dapat memproses permintaan',
        message: 'Kedua provider AI tidak tersedia. Silakan refresh halaman dan coba lagi.',
        provider_status: 'both_unavailable',
        timestamp: Date.now(),
        suggestion: 'Refresh halaman dan coba lagi. Jika masalah berlanjut, hubungi tim support.',
        providers: {
          primary: 'OpenAI GPT-4o',
          fallback: 'OpenRouter Gemini 2.5 Flash'
        }
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Provider-Status': 'error',
          'X-Error-Type': 'ultimate_fallback'
        },
      });
    }
  }
}
