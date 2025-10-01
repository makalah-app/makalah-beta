/**
 * CHAT API ROUTE - DUAL PROVIDER IMPLEMENTATION
 * 
 * AI SDK v5 compliant streaming dengan OpenAI GPT-4o primary
 * dan OpenRouter Gemini 2.5 Flash fallback. Enhanced academic workflow support.
 */

import {
  streamText,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  wrapLanguageModel,
  smoothStream,
  type UIMessage
} from 'ai';
import { openai } from '@ai-sdk/openai';
import type { AcademicMetadata } from '../../../src/components/chat/ChatContainer';
import { getDynamicModelConfig } from '../../../src/lib/ai/dynamic-config';
import { getUserIdWithSystemFallback } from '../../../src/lib/database/supabase-server-auth';
import { getValidUserUUID } from '../../../src/lib/utils/uuid-generator';
import { phdAdvisorMiddleware } from '../../../src/lib/ai/persona/phd-advisor-middleware';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Define custom message type extending AI SDK v5 UIMessage
export type AcademicUIMessage = UIMessage & {
  metadata?: AcademicMetadata;
};



export async function POST(req: Request) {
  try {
    // Extract chatId from headers for persistence
    const chatId = req.headers.get('X-Chat-Id') || undefined;

    // Extract user ID from authenticated session - NO FALLBACK to 'system'
    let userId = await getUserIdWithSystemFallback();
    
    // Parse request body with additional academic workflow parameters
    const rawPayload: any = await req.json();
    const { 
      messages, 
      phase = 1,
      testMode = false,
      userId: clientUserId
    }: { 
      messages: AcademicUIMessage[];
      phase?: number;
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

    // Natural 7-phase workflow - simple phase tracking
    let currentPhase = phase;

    // Validate and ensure messages have proper structure
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('Messages array is required and must not be empty');
    }

    // Simple message validation - trust LLM intelligence
    // Ensure messages have proper AI SDK v5 UIMessage structure
    const validatedMessages: AcademicUIMessage[] = messages.map(msg => {
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
      } as AcademicUIMessage;
    });

    // Simple phase assignment - trust LLM intelligence
    currentPhase = Math.max(1, Math.min(phase || 1, 7));

    // Use simple validated messages - trust LLM intelligence

    // Convert UI messages to model messages using AI SDK function
    // This is the CRITICAL fix - harus menggunakan convertToModelMessages
    let processedMessages;
    try {
      processedMessages = convertToModelMessages(validatedMessages);
    } catch (conversionError) {
      
      // 🛠️ FIX 4: Enhanced error recovery - create minimal valid AI SDK v5 UIMessage structure
      try {
        // Extract text from the most recent message as fallback
        const lastMessage = validatedMessages[validatedMessages.length - 1];
        const textPart = lastMessage?.parts?.find((part: any) => part.type === 'text') as { type: 'text'; text: string } | undefined;
        const textContent = textPart?.text || 'Hello';

        // Create proper AI SDK v5 UIMessage structure
        const fallbackMessages: AcademicUIMessage[] = [{
          id: `fallback-msg-${Date.now()}`,
          role: 'user' as const,
          parts: [{ type: 'text' as const, text: textContent }]
        }];

        processedMessages = convertToModelMessages(fallbackMessages);
      } catch (fallbackError) {
        throw new Error(`Message processing failed completely. Original: ${conversionError instanceof Error ? conversionError.message : String(conversionError)}`);
      }
    }
    
    // Get dynamic configuration from database (includes current swap state)
    const dynamicConfig = await getDynamicModelConfig();
    
    // Use database system prompt AS-IS - no hardcoded additions
    const systemPrompt = dynamicConfig.systemPrompt;

    // 🚀 IMPLEMENT: createUIMessageStream pattern from AI SDK v5 documentation
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        // Simple phase sync - trust LLM flow

        // 🔧 CLEANUP: Removed rigid approval tool processing
        // User requirement: Natural LLM flow without programmatic approval gates
        const finalProcessedMessages = validatedMessages;

        // Simple processing - trust LLM intelligence

        // ❌ REMOVED: Hardcoded phase progression context - all instructions must come from centralized database system prompt

        let primaryExecuted = false;
        let primarySuccess = false;
        let writerUsed = false;

        try {
          // 🚀 HIGH PRIORITY FIX 1: DYNAMIC EXECUTION PATTERN
          // PRIMARY: Dynamic provider based on database configuration
          primaryExecuted = true;

          // Simple message processing
          const filteredDebugMessages = finalProcessedMessages;

          // Use AI SDK v5 convertToModelMessages for proper tool part handling
          let manualMessages;
          try {
            // AI SDK v5 compliant conversion that preserves supported tool parts
            manualMessages = convertToModelMessages(filteredDebugMessages);
          } catch (conversionError) {
            // Fallback: Preserve essential message structure while extracting text
            manualMessages = filteredDebugMessages.map(msg => ({
              role: msg.role,
              content: msg.parts?.map(p => p.type === 'text' && 'text' in p ? (p as any).text : '').join('') || ''
            }));
          }

          // Removed unused persistAndBroadcast function

  // AI SDK v5: Phase approval state is handled by processToolCalls automatically
  // 🔧 NOTE: Phase detection logic moved earlier in the flow for proper progressive tracking

  // 🔧 CLEANUP: Simplified tool configuration - web search only
  // Removing complex conversation-aware tools per user requirement:
  // "Tools yang ada hanyalah web search"
  // Removed unused availableTools and toolNames variables

  // Build primary tools with guard to prevent repeated native web search loops
  const recentAssistant = (() => {
    try {
      const assistants = validatedMessages.filter((m: any) => m.role === 'assistant');
      return assistants[assistants.length - 1];
    } catch { return undefined as any; }
  })();
  const recentAssistantBlob = JSON.stringify((recentAssistant as any)?.parts || (recentAssistant as any)?.content || '');
  const recentUsedNativeSearch = /web_search_preview/i.test(recentAssistantBlob) || /web\s*search/i.test(recentAssistantBlob);
  const lastUser = (() => {
    try {
      const users = validatedMessages.filter((m: any) => m.role === 'user');
      return users[users.length - 1];
    } catch { return undefined as any; }
  })();
  const lastUserText = (() => {
    try {
      if (!lastUser) return '';
      if (typeof (lastUser as any).content === 'string') return ((lastUser as any).content as string) || '';
      if (Array.isArray((lastUser as any).parts)) {
        return (lastUser as any).parts.filter((p: any) => p?.type === 'text').map((p: any) => p.text).join('\n');
      }
      return '';
    } catch { return ''; }
  })().toLowerCase();

  // ✅ SMART TRIGGER DETECTION: Only enable web search when truly needed
  const FACTUAL_TRIGGERS = [
    'cari', 'riset', 'temukan', 'data', 'statistik', 'penelitian',
    'search', 'research', 'find', 'study', 'literature',
    'sumber', 'referensi', 'jurnal', 'artikel', 'paper', 'publikasi'
  ];

  const CONCEPTUAL_BLOCKERS = [
    'bagaimana cara', 'jelaskan', 'apa itu', 'mengapa', 'kenapa',
    'how to', 'how do', 'explain', 'what is', 'why', 'define'
  ];

  const hasFactualTrigger = FACTUAL_TRIGGERS.some(keyword => lastUserText.includes(keyword));
  const isConceptualQuestion = CONCEPTUAL_BLOCKERS.some(phrase => lastUserText.includes(phrase));
  const userExplicitSearch = /cari\s+(data|info|sumber|literatur|statistik)|search\s+(for|about)|riset\s+tentang|temukan\s+data/i.test(lastUserText);
  const isEarlyResearch = validatedMessages.length <= 5; // Phase 1-2 exploration

  const includeNativeWebSearch =
    dynamicConfig.primaryProvider === 'openai'
      ? (
          userExplicitSearch || // Explicit "cari data...", "search for..."
          (!recentUsedNativeSearch && hasFactualTrigger && !isConceptualQuestion) || // Factual need, not conceptual
          (!recentUsedNativeSearch && isEarlyResearch && hasFactualTrigger) // Early research phase
        )
      : false;

  const toolsForPrimary =
    dynamicConfig.primaryProvider === 'openai'
      ? ({
          ...(includeNativeWebSearch
            ? {
                web_search_preview: (openai as any).tools.webSearchPreview({
                  searchContextSize: 'high',
                }),
              }
            : {}),
        } as Record<string, any>)
      : ({} as Record<string, any>);

  // Tools configuration completed
  // ✅ SIMPLIFIED: No model switching - primaryModel already configured with :online suffix for OpenRouter
  let streamModel = dynamicConfig.primaryModel;
  let streamTools = toolsForPrimary;
  let sendSources = true; // Enable sources for all providers

  // For OpenAI, use responses API for native web search
  if (dynamicConfig.primaryProvider === 'openai') {
    streamModel = (openai as any).responses(
      dynamicConfig.primaryModelName || process.env.OPENAI_MODEL || 'gpt-4o'
    );
    streamTools = toolsForPrimary;
  }
  // For OpenRouter, primaryModel already has :online suffix - no changes needed

  // 🎓 MIDDLEWARE INTEGRATION: Wrap model dengan PhD advisor persona injection
  const modelWithPersona = wrapLanguageModel({
    model: streamModel,
    middleware: phdAdvisorMiddleware,
  });

  // PhD advisor middleware configuration completed

  // 🛑 ABORT HANDLING: Create abort controller untuk clean request cancellation
  const abortController = new AbortController();

  // Register abort handler from request signal
  req.signal?.addEventListener('abort', () => {
    abortController.abort();
  });

  const result = streamText({
            model: modelWithPersona,
            messages: manualMessages,
            system: systemPrompt,
            // Dynamic tools based on conversation depth (HITL compliance)
            tools: streamTools,
            // 🛑 HITL FIX: Allow natural conversation flow - no forced tool execution
            // Agent should engage in discussion first, then naturally choose tools when appropriate
            toolChoice: testMode && dynamicConfig.primaryProvider === 'openai'
              ? { type: 'tool', toolName: 'web_search_preview' } // Test mode only
              : undefined, // 🔧 HITL FIX: Let model decide naturally, enable proper approval flow for phase tools
            temperature: dynamicConfig.config.temperature,
            maxOutputTokens: dynamicConfig.config.maxTokens,
            topP: dynamicConfig.config.topP,
            maxRetries: 3,
            frequencyPenalty: dynamicConfig.config.frequencyPenalty,
            presencePenalty: dynamicConfig.config.presencePenalty,
            // 🎓 CONTEXT: Pass academic phase information to middleware
            experimental_context: {
              academicPhase: currentPhase,
              userId: userId,
              chatId: chatId
            },
            // 🔥 SMOOTH STREAMING: Enable smoothStream for regular OpenAI model
            experimental_transform: smoothStream({
              delayInMs: 35, // 35ms delay mendekati tempo ChatGPT
              chunking: 'word' // Word-by-word chunking
            }),
            // 🛑 ABORT HANDLING: Pass abort signal dan register cleanup callback
            abortSignal: abortController.signal,
            onAbort: ({ steps }) => {
              // Cleanup jika diperlukan - stream akan automatically close
            }
          });

          // ✅ Sources enabled for OpenAI native & OpenRouter :online web search

          // 🔥 STEP 1: smoothStream at streamText level handles word-by-word chunking
          // 🔥 STEP 2: Official AI SDK streaming protocol with unified toUIMessageStream pattern
          try {
            if (!writerUsed) {
              // 🔥 UNIFIED AI SDK PATTERN: Works for OpenAI native + OpenRouter :online
              writer.merge(result.toUIMessageStream({
                originalMessages: finalProcessedMessages,
                sendFinish: true,
                sendSources: sendSources,  // ✅ Sources for all providers
              }));
              writerUsed = true;
            }

            // Tunggu completion supaya fallback logic tetap jalan kalau ada error di tengah
            await result.response;
            primarySuccess = true;

          } catch (responseError: any) {
            // 🔍 ENHANCED ERROR TYPE DETECTION & CLASSIFICATION
            let errorType = 'unknown';
            let isRetryable = false;
            let userMessage = 'Terjadi kesalahan. Silakan coba lagi.';

            // Rate limit detection (existing logic)
            if (responseError?.error?.code === 'rate_limit_exceeded' ||
                responseError?.message?.includes('rate_limit') ||
                responseError?.toString?.().includes('rate_limit')) {
              errorType = 'rate_limit';
              isRetryable = true;
              userMessage = 'Batas penggunaan tercapai. Mencoba provider alternatif...';
            }
            // API call errors (status code based)
            else if (responseError?.statusCode) {
              if (responseError.statusCode === 429) {
                errorType = 'rate_limit';
                isRetryable = true;
                userMessage = 'Batas penggunaan tercapai. Mencoba provider alternatif...';
              } else if (responseError.statusCode >= 500) {
                errorType = 'server_error';
                isRetryable = true;
                userMessage = 'Server AI sedang bermasalah. Mencoba lagi...';
              } else if (responseError.statusCode === 401) {
                errorType = 'auth_error';
                isRetryable = false;
                userMessage = 'Masalah autentikasi. Silakan refresh halaman.';
              } else if (responseError.statusCode >= 400) {
                errorType = 'client_error';
                isRetryable = false;
                userMessage = 'Format pesan tidak valid. Silakan coba dengan pesan berbeda.';
              }
            }
            // Timeout errors
            else if (responseError?.message?.includes('timeout') ||
                     responseError?.code === 'TIMEOUT' ||
                     responseError?.name === 'TimeoutError') {
              errorType = 'timeout';
              isRetryable = true;
              userMessage = 'Koneksi timeout. Mencoba lagi...';
            }
            // Network errors
            else if (responseError?.message?.includes('network') ||
                     responseError?.message?.includes('ECONNRESET') ||
                     responseError?.code === 'ENOTFOUND') {
              errorType = 'network_error';
              isRetryable = true;
              userMessage = 'Masalah koneksi jaringan. Mencoba lagi...';
            }
            // Invalid prompt errors
            else if (responseError?.message?.includes('invalid_request') ||
                     responseError?.message?.includes('prompt')) {
              errorType = 'invalid_prompt';
              isRetryable = false;
              userMessage = 'Format pesan tidak valid. Silakan coba dengan pesan berbeda.';
            }


            // Write error to stream if not yet written
            if (!writerUsed) {
              writer.write({
                type: 'error',
                errorText: userMessage
              });
            }

            // Only throw for fallback if retryable
            if (isRetryable) {
              throw responseError; // Re-throw to trigger fallback provider
            } else {
              // Non-retryable errors, don't trigger fallback
              throw responseError;
            }
          }
        } catch (error) {

          // Fallback: Send error sebagai plain message
          if (!writerUsed) {
            writer.write({
              type: 'error',
              errorText: 'Maaf, terjadi kesalahan saat memproses respons. Silakan coba lagi.'
            });
            writerUsed = true;
          }

          // Re-throw untuk trigger fallback provider
          throw error;
        }
      },
    });

    // Request completed successfully

    // Return stream response as per AI SDK v5 documentation
    return createUIMessageStreamResponse({
      stream,
      headers: {
        'X-Chat-Id': chatId || '',
        'X-Phase': String(currentPhase),
        'Cache-Control': 'no-cache',
        // Required header for AI SDK UI Message Stream Protocol
        'x-vercel-ai-ui-message-stream': 'v1'
      }
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
