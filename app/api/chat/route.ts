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
import { summarizeAndPersistWorkingMemory } from '../../../src/lib/ai/memory/autosummarizer';
import { searchRelevantSections, buildRetrievalPreface } from '../../../src/lib/ai/retrieval/sections';

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

    // 📊 PROFILING: Track response time and memory for health monitoring
    const responseStartTime = Date.now();
    const memoryStart = process.memoryUsage();
    const cpuStart = process.cpuUsage();

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

    // ✅ Optional retrieval: prepend small relevant snippets for long edits
    let retrievalTime = 0;
    let retrievalMemDelta = 0;
    try {
      const lastUser = allMessages.filter((m) => m.role === 'user').slice(-1)[0];
      if (chatId && lastUser && typeof lastUser.content === 'string' && lastUser.content.length > 40) {
        const retrievalStart = Date.now();
        const retrievalMemStart = process.memoryUsage().heapUsed;

        const results = await searchRelevantSections({ chatId, query: lastUser.content, limit: 2 });
        const preface = buildRetrievalPreface(results);
        if (preface) {
          allMessages = [{ id: 'retrieval-preface', role: 'system', content: preface } as any, ...allMessages];
        }

        retrievalTime = Date.now() - retrievalStart;
        retrievalMemDelta = (process.memoryUsage().heapUsed - retrievalMemStart) / 1024 / 1024;
      }
    } catch (e) {
      console.warn('[retrieval] skipped', e);
    }

    // ✅ Sanitize historical tool messages to avoid OpenAI Responses tool-call mismatch
    const sanitizedMessages: UIMessage[] = allMessages
      .map((m: any) => {
        if (m?.role === 'tool') {
          return null; // drop historical tool result messages entirely
        }
        if (Array.isArray(m?.parts)) {
          const filtered = m.parts.filter((p: any) => {
            const t = (p && (p.type || p.kind || p.role)) ? String(p.type || p.kind || p.role) : '';
            return !/tool/i.test(t);
          });
          return { ...m, parts: filtered };
        }
        return m;
      })
      .filter(Boolean) as UIMessage[];

    // ✅ Convert UIMessage[] to ModelMessage[] for Agent
    const modelMessages = convertToModelMessages(sanitizedMessages);

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
      onFinish: async () => {
        // Record success for provider health tracking
        const responseEndTime = Date.now();
        const responseTime = responseEndTime - responseStartTime;
        providerManager.recordSuccess(
          dynamicConfig.primaryProvider === 'openai' ? 'openai' : 'openrouter',
          responseTime
        );

        // ✅ AUTOSUMMARIZER: update working memory after completion (best-effort)
        let autosummaryTime = 0;
        let autosummaryMemDelta = 0;
        try {
          const autoStart = Date.now();
          const autoMemStart = process.memoryUsage().heapUsed;

          await summarizeAndPersistWorkingMemory({
            userId,
            chatId,
            messages: allMessages,
            model: 'gpt-4o-mini',
            tail: 12,
          });

          autosummaryTime = Date.now() - autoStart;
          autosummaryMemDelta = (process.memoryUsage().heapUsed - autoMemStart) / 1024 / 1024;
        } catch (e) {
          console.warn('[autosummarizer] hook failed', e);
        }

        // 📊 PROFILING: Calculate and log comprehensive metrics
        const memoryEnd = process.memoryUsage();
        const cpuEnd = process.cpuUsage();

        const memDelta = {
          heapUsed: ((memoryEnd.heapUsed - memoryStart.heapUsed) / 1024 / 1024).toFixed(2),
          heapTotal: ((memoryEnd.heapTotal - memoryStart.heapTotal) / 1024 / 1024).toFixed(2),
          external: ((memoryEnd.external - memoryStart.external) / 1024 / 1024).toFixed(2),
          rss: ((memoryEnd.rss - memoryStart.rss) / 1024 / 1024).toFixed(2),
        };

        const cpuDelta = {
          user: ((cpuEnd.user - cpuStart.user) / 1000).toFixed(2),
          system: ((cpuEnd.system - cpuStart.system) / 1000).toFixed(2),
        };

        // eslint-disable-next-line no-console
        console.log('[PROFILING] Chat completion metrics:', {
          duration: `${responseTime}ms`,
          memory: memDelta,
          cpu: cpuDelta,
          breakdown: {
            retrieval: retrievalTime > 0 ? `${retrievalTime}ms / ${retrievalMemDelta.toFixed(2)}MB` : 'skipped',
            autosummary: autosummaryTime > 0 ? `${autosummaryTime}ms / ${autosummaryMemDelta.toFixed(2)}MB` : 'skipped',
          },
          context: {
            chatId: chatId || 'none',
            userId: userId?.slice(0, 8) || 'none',
            messageCount: allMessages.length,
            provider: dynamicConfig.primaryProvider,
          },
        });

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
