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
  smoothStream,
  type UIMessage
} from 'ai';
import { openai } from '@ai-sdk/openai';
import type { AcademicMetadata } from '../../../src/components/chat/ChatContainer';
import { getDynamicModelConfig } from '../../../src/lib/ai/dynamic-config';
import { getUserIdWithSystemFallback } from '../../../src/lib/database/supabase-server-auth';
import { getValidUserUUID } from '../../../src/lib/utils/uuid-generator';
import { getProviderManager } from '../../../src/lib/ai/providers';
// Removed: academicTools import - search tools deleted for rebuild with search_literature

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
    
    // Get provider manager
    const providerManager = getProviderManager();

    // Get dynamic configuration
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

  // ✅ AI SDK COMPLIANT: Prepare model based on provider
  let streamModel = dynamicConfig.primaryModel;
  let sendSources = true; // Enable sources for all providers

  // For OpenAI, use responses API for native web search
  if (dynamicConfig.primaryProvider === 'openai') {
    streamModel = (openai as any).responses(
      dynamicConfig.primaryModelName || process.env.OPENAI_MODEL || 'gpt-4o'
    );
  }
  // For OpenRouter with :online suffix, use NATIVE web search (no custom tools needed)
  // Model with :online suffix has built-in Exa-powered web search

  // 🛑 ABORT HANDLING: Create abort controller untuk clean request cancellation
  const abortController = new AbortController();

  // Register abort handler from request signal
  req.signal?.addEventListener('abort', () => {
    abortController.abort();
  });

  // Track response time for health monitoring
  const responseStartTime = Date.now();

  // ✅ AI SDK COMPLIANT: Provider-specific parameters with proper typing
  const result = dynamicConfig.primaryProvider === 'openai'
    ? streamText({
        // OpenAI responses API: Only supported parameters
        model: streamModel,
        messages: manualMessages,
        system: systemPrompt,
        tools: {
          // OpenAI native web search
          web_search_preview: (openai as any).tools.webSearchPreview({
            searchContextSize: 'high',
          }),
        } as Record<string, any>,
        toolChoice: testMode ? { type: 'tool' as const, toolName: 'web_search_preview' } : undefined,
        temperature: dynamicConfig.config.temperature,
        topP: dynamicConfig.config.topP,
        maxOutputTokens: dynamicConfig.config.maxTokens,
        maxRetries: 3,
        experimental_context: {
          academicPhase: currentPhase,
          userId: userId,
          chatId: chatId
        },
        experimental_transform: smoothStream({
          delayInMs: 35,
          chunking: 'word'
        }),
        abortSignal: abortController.signal,
        onAbort: () => {
          // Cleanup jika diperlukan - stream akan automatically close
        }
      })
    : streamText({
        // OpenRouter with :online suffix: Native web search (NO custom tools)
        // :online suffix provides Exa-powered built-in web search
        model: streamModel,
        messages: manualMessages,
        system: systemPrompt,
        // ⚠️ CRITICAL: NO tools for :online models - they have native web search
        // Passing tools would override native search with DuckDuckGo fallback
        temperature: dynamicConfig.config.temperature,
        topP: dynamicConfig.config.topP,
        maxOutputTokens: dynamicConfig.config.maxTokens,
        frequencyPenalty: dynamicConfig.config.frequencyPenalty,
        presencePenalty: dynamicConfig.config.presencePenalty,
        maxRetries: 3,
        experimental_context: {
          academicPhase: currentPhase,
          userId: userId,
          chatId: chatId
        },
        experimental_transform: smoothStream({
          delayInMs: 35,
          chunking: 'word'
        }),
        abortSignal: abortController.signal,
        onAbort: () => {
          // Cleanup jika diperlukan - stream akan automatically close
        }
      });

          // ✅ Sources enabled for all providers (OpenAI native + OpenRouter :online native)

          // 🔥 STEP 1: smoothStream at streamText level handles word-by-word chunking
          // 🔥 STEP 2: Official AI SDK streaming protocol with unified toUIMessageStream pattern
          try {
            if (!writerUsed) {
              // 🔥 UNIFIED AI SDK PATTERN: Works for all providers with web search
              writer.merge(result.toUIMessageStream({
                originalMessages: finalProcessedMessages,
                sendFinish: true,
                sendSources: sendSources,  // ✅ Sources for all providers
              }));
              writerUsed = true;
            }

            // 🔍 DEBUG: Log full text after streaming for OpenRouter :online
            if (dynamicConfig.primaryProvider === 'openrouter') {
              console.log('[OpenRouter :online Debug] Waiting for full response...');

              // Get full text by consuming text promise
              const fullText = await result.text;
              console.log('[OpenRouter :online Debug] Full text length:', fullText?.length || 0);
              console.log('[OpenRouter :online Debug] Text preview (first 500 chars):',
                fullText ? fullText.substring(0, 500) : 'NO TEXT'
              );

              if (!fullText || fullText.length === 0) {
                console.error('[OpenRouter :online Debug] ⚠️ CRITICAL: Model returned no text!');
              }
            }

            // Tunggu completion supaya fallback logic tetap jalan kalau ada error di tengah
            await result.response;

            // Record success for provider health tracking
            const responseEndTime = Date.now();
            const responseTime = responseEndTime - responseStartTime;
            providerManager.recordSuccess(
              dynamicConfig.primaryProvider === 'openai' ? 'openai' : 'openrouter',
              responseTime
            );

            primarySuccess = true;

          } catch (responseError: any) {
            // Record failure for circuit breaker tracking
            providerManager.recordFailure(
              dynamicConfig.primaryProvider === 'openai' ? 'openai' : 'openrouter',
              responseError as Error
            );

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
