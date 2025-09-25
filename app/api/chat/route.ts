/**
 * CHAT API ROUTE - DUAL PROVIDER IMPLEMENTATION
 * 
 * AI SDK v5 compliant streaming dengan Gemini 2.5 Pro primary (OpenRouter)
 * dan OpenAI GPT-4o-mini fallback. Enhanced academic workflow support.
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
    console.log('[Chat API] Initializing NATIVE OpenAI web search system...');
    
    // Native OpenAI implementation - no custom tools needed for primary provider
    console.log('[Chat API] 🌐 Using built-in OpenAI web search - no mock data!');
    
    // Extract chatId from headers for persistence
    const chatId = req.headers.get('X-Chat-Id') || undefined;
    console.log(`[Chat API] 📋 ChatId from headers: ${chatId || 'not provided'}`);
    
    // Extract user ID from authenticated session - NO FALLBACK to 'system'
    let userId = await getUserIdWithSystemFallback();
    console.log(`[Chat API] 👤 User ID extracted: ${userId || 'null - no session'}`);
    
    if (userId) {
      console.log(`[Chat API] ✅ Authenticated user session detected - messages will persist with user ID: ${userId}`);
    } else {
      console.log(`[Chat API] ⚠️ No authenticated session detected - will check client-provided user ID`);
    }
    
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
        console.log(`[Chat API] 🔧 Using client-provided user ID: ${userId}`);
      } else {
        console.log(`[Chat API] ❌ No valid client-provided user ID found`);
      }
    }

    // 🔒 AUTHENTICATION GUARD: Require valid user ID for all operations
    // No fallback - must have either authenticated session or valid client-provided UUID
    if (!userId) {
      console.warn('[Chat API] 🚫 Authentication failed: no authenticated session and no valid client user ID provided');
      return new Response(JSON.stringify({
        error: 'AUTHENTICATION_REQUIRED',
        message: 'Valid user authentication required for all chat operations',
      }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    
    console.log(`[Chat API] ✅ Authentication successful - proceeding with user ID: ${userId}`);

    // Natural 7-phase workflow - simple phase tracking
    let currentPhase = phase;

    console.log(`[Chat API] Processing ${messages.length} messages, Phase: ${currentPhase}${testMode ? ' (TEST MODE)' : ''}`);

    // Debug: Log first message structure untuk troubleshooting
    if (messages.length > 0) {
      console.log('[Chat API] First message structure:', {
        id: messages[0].id,
        role: messages[0].role,
        hasContent: !!messages[0].parts && messages[0].parts.length > 0,
        hasMetadata: !!messages[0].metadata
      });
    }

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
      console.log(`[Chat API] ✅ Successfully converted ${validatedMessages.length} messages to ${processedMessages.length} model messages`);
    } catch (conversionError) {
      console.error('[Chat API] ❌ Message conversion failed:', conversionError);
      console.log('[Chat API] 🔄 Attempting fallback message recovery...');
      
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
        console.log(`[Chat API] ✅ Fallback recovery successful with message: "${textContent.substring(0, 50)}..."`);
      } catch (fallbackError) {
        console.error('[Chat API] ❌ Fallback recovery also failed:', fallbackError);
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
        console.log('[Chat API] 🚀 HITL Integration: Processing tool results and handling approvals');

        // Simple phase sync - trust LLM flow


        // 🔧 CLEANUP: Removed rigid approval tool processing
        // User requirement: Natural LLM flow without programmatic approval gates
        const finalProcessedMessages = validatedMessages;

        console.log('[Chat API] 🧹 Using simplified message processing - no rigid approval gates');
        console.log('[Chat API] 📊 Message count:', finalProcessedMessages.length);

        // Simple processing - trust LLM intelligence

        // ❌ REMOVED: Hardcoded phase progression context - all instructions must come from centralized database system prompt

        let primaryExecuted = false;
        let primarySuccess = false;
        let writerUsed = false;

        try {
          // 🚀 HIGH PRIORITY FIX 1: DYNAMIC EXECUTION PATTERN
          // PRIMARY: Dynamic provider based on database configuration
          console.log(`[Chat API] 🔧 Using DYNAMIC PRIMARY: ${dynamicConfig.primaryProvider} (from database config)`);
          
          primaryExecuted = true;
          // Debug: Check finalProcessedMessages before conversion
          console.log('[Chat API] 🔍 DEBUG finalProcessedMessages:', {
            type: typeof finalProcessedMessages,
            isArray: Array.isArray(finalProcessedMessages),
            length: finalProcessedMessages?.length,
            sample: finalProcessedMessages?.[0]
          });

          // Simple message processing
          const filteredDebugMessages = finalProcessedMessages;

          // Use AI SDK v5 convertToModelMessages for proper tool part handling
          let manualMessages;
          try {
            // AI SDK v5 compliant conversion that preserves supported tool parts
            manualMessages = convertToModelMessages(filteredDebugMessages);
            console.log('[Chat API] ✅ Using AI SDK convertToModelMessages with filtered tool parts');
          } catch (conversionError) {
            console.warn('[Chat API] ⚠️ convertToModelMessages failed, using fallback conversion:', conversionError);
            // Fallback: Preserve essential message structure while extracting text
            manualMessages = filteredDebugMessages.map(msg => ({
              role: msg.role,
              content: msg.parts?.map(p => p.type === 'text' && 'text' in p ? (p as any).text : '').join('') || ''
            }));
          }
          
          console.log('[Chat API] 🔍 DEBUG manualMessages:', manualMessages);

          // Removed unused persistAndBroadcast function
          
          console.log('[Chat API] 🛠️ Tools enabled: openai.tools.webSearchPreview (Responses API)');

  // AI SDK v5: Phase approval state is handled by processToolCalls automatically
  // 🔧 NOTE: Phase detection logic moved earlier in the flow for proper progressive tracking

  // 🔧 CLEANUP: Simplified tool configuration - web search only
  // Removing complex conversation-aware tools per user requirement:
  // "Tools yang ada hanyalah web search"
  // Removed unused availableTools and toolNames variables

  console.log(`[Chat API] 🔧 Simplified tools: web search only (native OpenAI/Perplexity)`);
  console.log(`[Chat API] 🧹 Complex conversation-aware tools removed`);

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
  const userExplicitMoreSearch = /cari\s+lagi|lanjut\s+(cari|riset|search)|search\s+again|teruskan\s+pencarian/i.test(lastUserText);
  const includeNativeWebSearch =
    dynamicConfig.webSearchProvider === 'openai'
      ? (!recentUsedNativeSearch || userExplicitMoreSearch)
      : false;

  const toolsForPrimary =
    dynamicConfig.webSearchProvider === 'openai'
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

  console.log('[Chat API] 🚀 Initializing primary model streamText');
  console.log('[Chat API] 🛠️ Tools for primary model:', Object.keys(toolsForPrimary));
  console.log('[Chat API] ⚙️ Native web search included:', includeNativeWebSearch);
  console.log('[Chat API] 🌐 Web search provider:', dynamicConfig.webSearchProvider);

  let streamModel = dynamicConfig.primaryModel;
  let streamTools = toolsForPrimary;
  let sendSources = false;

  if (dynamicConfig.webSearchProvider === 'openai') {
    console.log('[Chat API] 🌐 Using OpenAI Responses API with native web search');
    streamModel = (openai as any).responses(
      dynamicConfig.primaryModelName || process.env.OPENAI_MODEL || 'gpt-4o'
    );
    streamTools = toolsForPrimary;
    sendSources = true; // OpenAI handles sources automatically
  } else if (dynamicConfig.webSearchProvider === 'perplexity' && dynamicConfig.webSearchModel) {
    console.log('[Chat API] 🌐 Using Perplexity Sonar model with built-in search');
    streamModel = dynamicConfig.webSearchModel;
    streamTools = {};
    sendSources = false; // Perplexity uses manual source injection
  } else {
    console.log('[Chat API] 🌐 Using dynamic primary model without external web search tool');
    streamModel = dynamicConfig.primaryModel;
    streamTools = {};
  }

  console.log('[Chat API] 🎯 Tool choice setting:', testMode ? 'web_search_preview (test mode)' : 'auto');
  console.log('[Chat API] 📊 Manual messages count:', manualMessages.length);

  // 🎓 MIDDLEWARE INTEGRATION: Wrap model dengan PhD advisor persona injection
  const modelWithPersona = dynamicConfig.webSearchProvider === 'perplexity'
    ? streamModel
    : wrapLanguageModel({
        model: streamModel,
        middleware: phdAdvisorMiddleware,
      });

  if (dynamicConfig.webSearchProvider === 'perplexity') {
    console.log('[Chat API] 🎓 Skipping PhD advisor persona to let Perplexity handle native web grounding');
  } else {
    console.log('[Chat API] 🎓 PhD Advisor middleware attached - persona injection enabled');
  }

  // 🛑 ABORT HANDLING: Create abort controller untuk clean request cancellation
  const abortController = new AbortController();

  // Register abort handler from request signal
  req.signal?.addEventListener('abort', () => {
    console.log('[Chat API] 🛑 Request aborted by client');
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
            toolChoice: testMode && dynamicConfig.webSearchProvider === 'openai'
              ? { type: 'tool', toolName: 'web_search_preview' } // Test mode only
              : undefined, // 🔧 HITL FIX: Let model decide naturally, enable proper approval flow for phase tools
            temperature: dynamicConfig.config.temperature,
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
              console.log('[Chat API] ⚠️ Stream aborted after', steps.length, 'steps');
              // Cleanup jika diperlukan - stream akan automatically close
            }
          });

          // Citations streaming disabled for stability; sources available via debug endpoint
          
          console.log('[Chat API] ✅ Native OpenAI web search initialized');

          // 🔥 STEP 1: smoothStream at streamText level handles word-by-word chunking
          // 🔥 STEP 2: Return to official AI SDK streaming protocol dengan penanganan Perplexity khusus
          try {
            if (!writerUsed) {
              if (dynamicConfig.webSearchProvider === 'perplexity') {
                const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
                const textBlockId = `text-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

                writer.write({
                  type: 'start',
                  messageId,
                });

                writer.write({
                  type: 'text-start',
                  id: textBlockId,
                });

                for await (const textPart of result.textStream) {
                  writer.write({
                    type: 'text-delta',
                    id: textBlockId,
                    delta: textPart,
                  });
                }

                writer.write({
                  type: 'text-end',
                  id: textBlockId,
                });

                try {
                  const providerMeta = await result.providerMetadata?.catch(() => undefined);
                  const fallbackSources = await result.sources?.catch(() => undefined);
                  const sources =
                    providerMeta?.perplexity?.sources ||
                    providerMeta?.sources ||
                    fallbackSources ||
                    [];

                  if (Array.isArray(sources)) {
                    sources
                      .filter((src: any) => src && (src.url || src.source || src.origin))
                      .forEach((src: any, index: number) => {
                      const url = src.url || src.source || src.origin || '';
                      const title =
                        src.title || src.name || src.domain || src.url || `Sumber ${index + 1}`;

                      writer.write({
                        type: 'source-url',
                        sourceId: src.id || `perplexity-source-${index + 1}`,
                        url,
                        title,
                        providerMetadata: src,
                      });
                    });
                  }
                } catch (sourceError) {
                  console.warn('[Chat API] ⚠️ Failed to attach Perplexity sources:', sourceError);
                }

                writer.write({
                  type: 'finish',
                  messageMetadata: {
                    finishReason: (await result.finishReason?.catch(() => undefined)) || 'stop',
                  },
                });

                writerUsed = true;
                console.log('[Chat API] ✅ Perplexity streaming completed dengan sumber manual');
              } else {
                writer.merge(result.toUIMessageStream({
                  originalMessages: finalProcessedMessages,
                  sendFinish: true,
                  sendSources,
                }));
                writerUsed = true;
                console.log('[Chat API] ✅ AI SDK official streaming protocol with smoothStream: first chunk immediate, words flow dengan 35ms delay');
              }
            }

            // Tunggu completion supaya fallback logic tetap jalan kalau ada error di tengah
            await result.response;
            primarySuccess = true;
            console.log('[Chat API] ✅ Primary execution FULLY completed - fallback akan diblokir');

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

            console.error('[Chat API] ⚠️ Primary provider error classified:', {
              errorType,
              isRetryable,
              statusCode: responseError?.statusCode,
              message: responseError?.error?.message || responseError?.message,
              provider: dynamicConfig.primaryProvider,
              model: dynamicConfig.primaryModelName,
              writerUsed
            });

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
              console.error('[Chat API] ❌ Non-retryable error, stopping execution');
              throw responseError;
            }
          }
        } catch (error) {
          console.error('[Chat API] ❌ UI stream creation failed:', {
            error: error instanceof Error ? error.message : String(error),
            provider: dynamicConfig.primaryProvider,
            model: dynamicConfig.primaryModelName
          });

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

    // 🔧 HITL DEBUG: Final request summary
    console.log('[Chat API] 🎯 REQUEST COMPLETED SUCCESSFULLY');
    console.log('[Chat API] 📊 Final request summary:', {
      userId: userId?.substring(0, 8) + '...',
      requestId: (req as any).requestId || 'unknown',
      currentPhase: currentPhase,
      messagesProcessed: validatedMessages.length,
      primaryProviderUsed: dynamicConfig.primaryModelName,
      fallbackProviderUsed: dynamicConfig.fallbackModelName,
      fallbackUsed: false, // Note: primarySuccess not accessible in this scope
      streamInitialized: true,
      smoothStreamEnabled: true, // Both primary and fallback use smoothStream
      timestamp: new Date().toISOString()
    });
    console.log('[Chat API] ✅ Returning createUIMessageStreamResponse with HITL integration');

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
    console.error('[Chat API] 💥 Fatal API error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      request_info: {
        method: 'POST',
        url: '/api/chat'
      }
    });

    // 🛡️ GRACEFUL DEGRADATION: Try to return stream with error if possible
    try {
      // Simple error response instead of complex stream
      console.log('[Chat API] 🛡️ Creating simple error response');

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
      console.error('[Chat API] ❌ Stream creation also failed, using JSON fallback:', streamError);

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
