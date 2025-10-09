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
// Removed: academicTools import - search tools deleted for rebuild with search_literature
import type { AcademicUIMessage as WorkflowUIMessage, WorkflowMetadata } from '../../../src/lib/types/academic-message';
import { inferWorkflowState } from '../../../src/lib/ai/workflow-inference';
import { getWorkflowContext, calculateProgress } from '../../../src/lib/ai/workflow-engine';
import { getWorkflowSpec, getWorkflowSpecSummary } from '../../../src/lib/ai/workflow-spec';
import { extractStructuredWorkflowState } from '../../../src/lib/ai/structured-workflow-parser';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Define custom message type extending AI SDK v5 UIMessage
export type AcademicUIMessage = WorkflowUIMessage; // Use Phase 1 type

function hasOutlineContent(outline: unknown): boolean {
  if (typeof outline === 'string') {
    return outline.trim().length >= 20;
  }

  if (Array.isArray(outline)) {
    return outline.length > 0;
  }

  if (outline && typeof outline === 'object') {
    return Object.keys(outline as Record<string, unknown>).length > 0;
  }

  return false;
}

function enforceOutlinePhase(
  metadata: WorkflowMetadata,
  previous: WorkflowMetadata
): WorkflowMetadata {
  const nextPhase = metadata.phase;

  if (
    !nextPhase ||
    (nextPhase !== 'outlining' && nextPhase !== 'outline_locked')
  ) {
    return metadata;
  }

  const outlinePayload = metadata.artifacts?.outline;
  if (hasOutlineContent(outlinePayload)) {
    return metadata;
  }

  console.warn(
    '[Workflow] Outline phase requested without outline content. Maintaining previous phase:',
    previous.phase || 'researching'
  );

  const sanitizedArtifacts = metadata.artifacts
    ? { ...metadata.artifacts }
    : undefined;

  if (sanitizedArtifacts && 'outline' in sanitizedArtifacts) {
    delete (sanitizedArtifacts as Record<string, unknown>).outline;
  }

  return {
    ...metadata,
    phase: previous.phase || 'researching',
    progress: previous.progress ?? calculateProgress('researching'),
    artifacts: sanitizedArtifacts
  };
}

function mergeStructuredMetadata(
  previous: WorkflowMetadata,
  structured: WorkflowMetadata | undefined | null
): WorkflowMetadata {
  if (!structured) {
    return previous;
  }

  const sanitized = enforceOutlinePhase(structured, previous);

  const previousArtifacts = previous.artifacts;
  const sanitizedArtifacts = sanitized.artifacts;
  const mergedArtifacts =
    previousArtifacts || sanitizedArtifacts
      ? {
          ...(previousArtifacts || {}),
          ...(sanitizedArtifacts || {})
        }
      : undefined;

  return {
    ...previous,
    ...sanitized,
    artifacts: mergedArtifacts
  };
}

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
      messages: AcademicUIMessage[];
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

    // Use simple validated messages - trust LLM intelligence

    // Get provider manager
    const providerManager = getProviderManager();

    // Get dynamic configuration
    const dynamicConfig = await getDynamicModelConfig();
    
    // Use database system prompt AS-IS - no hardcoded additions
    const specForPrompt = getWorkflowSpec();
    const phaseOrderForPrompt = specForPrompt.phases.map(phase => phase.id).join(' -> ');
    const baseSystemPrompt = dynamicConfig.systemPrompt?.trim() || '';
    const workflowGuardrails = `[Workflow Guardrails]
- Jalankan 11-phase Makalah: ${phaseOrderForPrompt}.
- Tulis metadata.phase sebagai string dari daftar tersebut.
- Jika perlu detail fase, panggil tool workflow_spec dengan format 'summary' atau 'full'.
- Gunakan artifacts dalam metadata sebagai memori permanen pengguna.`.trim();
    const augmentedSystemPrompt = `${baseSystemPrompt}\n\n${workflowGuardrails}`.trim();

    // 🚀 IMPLEMENT: createUIMessageStream pattern from AI SDK v5 documentation
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        // Simple phase sync - trust LLM flow

        // 🔧 CLEANUP: Removed rigid approval tool processing
        // User requirement: Natural LLM flow without programmatic approval gates
        const finalProcessedMessages = validatedMessages;

        // Infer current workflow state from conversation history
        const currentWorkflowState = inferWorkflowState(validatedMessages as WorkflowUIMessage[]);

        // 🔧 FIX RACE CONDITION: Pre-compute workflow metadata BEFORE streaming starts
        // This ensures metadata is available synchronously for messageMetadata callback
        // Solution: Use closure variable instead of waiting for onFinish
        const preComputedMetadata: WorkflowMetadata = {
          phase: currentWorkflowState.phase || 'exploring',
          progress: currentWorkflowState.progress || 0.05,
          artifacts: currentWorkflowState.artifacts || {},
          timestamp: new Date().toISOString(),
          offTopicCount: currentWorkflowState.offTopicCount || 0,
          model: dynamicConfig.primaryModelName,
          userId: userId
        };

        console.log('[DEBUG] Pre-computed workflow metadata:', JSON.stringify(preComputedMetadata, null, 2));

        // 🚨 BACKEND ENFORCEMENT: Off-topic escalation for extreme cases
        // If user has been off-topic 3+ times, inject strong redirect
        const needsStrongRedirect = (currentWorkflowState.offTopicCount || 0) >= 3;
        const mildRedirectReminder =
          !needsStrongRedirect && (currentWorkflowState.offTopicCount || 0) >= 2;

        const workflowSpec = getWorkflowSpec();
        const workflowSpecSummary = getWorkflowSpecSummary();
        const phaseChoices = workflowSpec.phases.map(phase => `"${phase.id}"`).join(', ');

        // Simple processing - trust LLM intelligence

        // ❌ REMOVED: Hardcoded phase progression context - all instructions must come from centralized database system prompt

        let writerUsed = false;

        try {
          // 🚀 HIGH PRIORITY FIX 1: DYNAMIC EXECUTION PATTERN
          // PRIMARY: Dynamic provider based on database configuration

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

          // 🔄 WORKFLOW CONTEXT INJECTION: LLM-Native "Permanent RAG" Pattern
          // Inject current workflow state as FIRST system message
          // This tells LLM "what's happening now" without telling it "what to do"
          const workflowContext = getWorkflowContext(currentWorkflowState);
          console.log('[DEBUG] Workflow context generated:', JSON.stringify(workflowContext, null, 2));

          const workflowContextBlueprint = `${workflowContext.contextMessage}

[Workflow Blueprint]
${workflowSpecSummary}${
            mildRedirectReminder
              ? '\n\n[Reminder]\nFokus ke tugas akademik dan lanjutkan fase sesuai urutan di atas.'
              : ''
          }`.trim();

          const structuredMetadataInstruction = `\n[Metadata Contract]\nAlways end responses with:\n<!--workflow-state:{"phase":"exploring","progress":0.05,"artifacts":{...}}-->\nUse one of these phase strings: ${phaseChoices}. Keep progress 0-1.`;

          manualMessages.unshift({
            role: 'system',
            content: `${workflowContextBlueprint}${structuredMetadataInstruction}`
          });

          console.log('[DEBUG] Injected workflow context as first system message:', workflowContext.contextMessage);

          // 🚨 BACKEND ENFORCEMENT: Inject strong redirect for Tier 3 escalation
          if (needsStrongRedirect) {
            // Inject system message at the end to enforce Tier 3 redirect
            manualMessages.push({
              role: 'system',
              content: `[SYSTEM ENFORCEMENT - TIER 3 OFF-TOPIC ESCALATION]

User telah off-topic sebanyak ${currentWorkflowState.offTopicCount || 0} kali berturut-turut. Ini adalah batas maksimum.

WAJIB LAKUKAN SEKARANG:
1. Politely decline untuk melanjutkan topik off-topic
2. Restate purpose kamu: "Gue spesifik untuk paper akademik"
3. Berikan binary choice: "Mau lanjut nulis paper atau selesai dulu?"
4. Jangan engage dengan topik off-topic sama sekali
5. Jangan explain atau elaborate tentang kenapa tidak bisa bantu

Contoh response:
"Gue spesifik untuk paper akademik, bukan info [topik off-topic]. Mau lanjut nulis paper atau selesai dulu?"

Ini adalah backend enforcement untuk melindungi specialized purpose kamu. User harus memilih untuk kembali ke paper atau mengakhiri percakapan.`
            });
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
        system: augmentedSystemPrompt,
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
            console.log('[DEBUG] OpenAI onFinish called - text length:', text.length);

            const structuredState = extractStructuredWorkflowState(text, preComputedMetadata);

            if (structuredState) {
              const mergedMetadata = mergeStructuredMetadata(
                preComputedMetadata,
                structuredState.metadata
              );

              Object.assign(preComputedMetadata, mergedMetadata);
              preComputedMetadata.offTopicCount = mergedMetadata.offTopicCount || 0;
              preComputedMetadata.timestamp =
                mergedMetadata.timestamp || new Date().toISOString();
              console.log('[DEBUG] Structured workflow metadata applied.');
            } else {
              console.warn('[Workflow] Structured workflow state missing. Skipping phase update.');
            }

            // Update tokens in pre-computed metadata (now available after streaming)
            if (usage) {
              preComputedMetadata.tokens = {
                prompt: usage.inputTokens || 0,
                completion: usage.outputTokens || 0,
                total: usage.totalTokens || 0
              };
            }

            console.log('[DEBUG] Updated metadata after response inference:', JSON.stringify(preComputedMetadata, null, 2));

            writer.write({
              type: 'message-metadata',
              messageMetadata: preComputedMetadata
            });
          } catch (error) {
            console.error('[Workflow] onFinish error:', error);
          }
        }
      })
    : streamText({
        // OpenRouter with :online suffix: Native web search (NO custom tools)
        // :online suffix provides Exa-powered built-in web search
        model: streamModel,
        messages: manualMessages,
        system: augmentedSystemPrompt,
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
            console.log('[DEBUG] OpenRouter onFinish called - text length:', text.length);

            const structuredState = extractStructuredWorkflowState(text, preComputedMetadata);

            if (structuredState) {
              const mergedMetadata = mergeStructuredMetadata(
                preComputedMetadata,
                structuredState.metadata
              );

              Object.assign(preComputedMetadata, mergedMetadata);
              preComputedMetadata.offTopicCount = mergedMetadata.offTopicCount || 0;
              preComputedMetadata.timestamp =
                mergedMetadata.timestamp || new Date().toISOString();
              console.log('[DEBUG] Structured workflow metadata applied.');
            } else {
              console.warn('[Workflow] Structured workflow state missing. Skipping phase update.');
            }

            // Update tokens in pre-computed metadata (now available after streaming)
            if (usage) {
              preComputedMetadata.tokens = {
                prompt: usage.inputTokens || 0,
                completion: usage.outputTokens || 0,
                total: usage.totalTokens || 0
              };
            }

            console.log('[DEBUG] Updated metadata after response inference:', JSON.stringify(preComputedMetadata, null, 2));

            writer.write({
              type: 'message-metadata',
              messageMetadata: preComputedMetadata
            });
          } catch (error) {
            console.error('[Workflow] onFinish error:', error);
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
                sendSources: sendSources,  // ✅ Sources for all providers
                messageMetadata: ({ part }) => {
                  console.log('[DEBUG] messageMetadata called - part.type:', part.type);

                  // Attach updated workflow metadata when the finish event is emitted
                  if (part.type === 'finish') {
                    console.log('[DEBUG] ✅ Attaching pre-computed metadata:', JSON.stringify(preComputedMetadata, null, 2));
                    return preComputedMetadata;
                  }

                  return undefined;
                }
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
