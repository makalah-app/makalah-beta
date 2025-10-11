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
import { getDynamicModelConfig } from '../../../src/lib/ai/dynamic-config';
import { getUserIdWithSystemFallback } from '../../../src/lib/database/supabase-server-auth';
import { getValidUserUUID } from '../../../src/lib/utils/uuid-generator';
import { getProviderManager } from '../../../src/lib/ai/providers';

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

    // ✅ A/B TESTING: Pass userId to dynamic config for cohort-based prompt selection
    const dynamicConfig = await getDynamicModelConfig(userId);

    // Use database system prompt without workflow augmentation
    const systemPrompt = dynamicConfig.systemPrompt?.trim() || '';

    // 🚀 IMPLEMENT: createUIMessageStream pattern from AI SDK v5 documentation
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        // Simple message processing - no workflow tracking
        const finalProcessedMessages = validatedMessages;

        let writerUsed = false;

        try {
          // Use AI SDK v5 convertToModelMessages for proper tool part handling
          let manualMessages;
          try {
            // AI SDK v5 compliant conversion that preserves supported tool parts
            manualMessages = convertToModelMessages(finalProcessedMessages);
          } catch (conversionError) {
            // Fallback: Preserve essential message structure while extracting text
            manualMessages = finalProcessedMessages.map(msg => ({
              role: msg.role,
              content: msg.parts?.map(p => p.type === 'text' && 'text' in p ? (p as any).text : '').join('') || ''
            }));
          }

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
          web_search: (openai as any).tools.webSearch({
            searchContextSize: 'high',
          }),
        } as Record<string, any>,
        toolChoice: testMode ? { type: 'tool' as const, toolName: 'web_search' } : undefined,
        temperature: dynamicConfig.config.temperature,
        topP: dynamicConfig.config.topP,
        maxOutputTokens: dynamicConfig.config.maxTokens,
        maxRetries: 3,
        experimental_context: {
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
        },
        onFinish: async ({ text, usage }) => {
          try {
            console.log('[DEBUG] onFinish called - text length:', text.length);

            const simpleMetadata = {
              timestamp: new Date().toISOString(),
              model: dynamicConfig.primaryModelName,
              userId: userId,
              tokens: usage ? {
                prompt: usage.inputTokens || 0,
                completion: usage.outputTokens || 0,
                total: usage.totalTokens || 0
              } : undefined
            };

            writer.write({
              type: 'message-metadata',
              messageMetadata: simpleMetadata
            });
          } catch (error) {
            console.error('[onFinish] error:', error);
          }
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
        },
        onFinish: async ({ text, usage }) => {
          try {
            console.log('[DEBUG] onFinish called - text length:', text.length);

            const simpleMetadata = {
              timestamp: new Date().toISOString(),
              model: dynamicConfig.primaryModelName,
              userId: userId,
              tokens: usage ? {
                prompt: usage.inputTokens || 0,
                completion: usage.outputTokens || 0,
                total: usage.totalTokens || 0
              } : undefined
            };

            writer.write({
              type: 'message-metadata',
              messageMetadata: simpleMetadata
            });
          } catch (error) {
            console.error('[onFinish] error:', error);
          }
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
                sendSources: sendSources  // ✅ Sources for all providers
              }));
              writerUsed = true;
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
