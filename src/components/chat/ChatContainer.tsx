'use client';

/**
 * ChatContainer - Main chat interface container component
 * 
 * DOCUMENTATION COMPLIANCE:
 * - Implements useChat hook patterns from /docs/07-reference/02-ai-sdk-ui/01-use-chat.mdx
 * - Status management: 'submitted' | 'streaming' | 'ready' | 'error'
 * - Transport-based architecture dengan DefaultChatTransport
 * - Message parts handling with UIMessage structure
 * 
 * DESIGN COMPLIANCE:
 * - Dark mode default from chat-page-styleguide.md
 * - Academic-focused styling dengan modern UI patterns
 * - 2-column desktop layout integration
 */

import React, { useState, useRef, useEffect, useId, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import {
  UIMessage,
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls
} from 'ai';
// ❌ REMOVED: Unused tool UI imports - no longer needed after cleanup
// - isToolUIPart: Used in removed gate-closed signal handling
// - getToolName: Used in removed gate-closed signal handling
import { MessageDisplay } from './MessageDisplay';
import { ChatInput } from './ChatInput';
import { StreamingHandler } from './StreamingHandler';
// ApprovalGatesContainer removed - using native OpenAI web search
import { LoadingIndicator } from '../ui/LoadingIndicator';
import { ErrorDisplay } from '../ui/ErrorDisplay';
// Database persistence imports
import { loadChat } from '../../lib/database/chat-store';
import { supabaseChatClient } from '../../lib/database/supabase-client';
// Approval types removed - using native OpenAI web search
// Approval helpers removed - using native OpenAI web search
// import { useTheme } from '../theme/ThemeProvider';
// Additional imports for race condition fix
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { SYSTEM_USER_UUID } from '../../lib/utils/uuid-generator';
// ❌ REMOVED: WorkflowProvider import - rigid phase state management
// Natural LLM conversation doesn't need complex workflow state synchronization
// ❌ REMOVED: Unused HITL imports - not used in natural LLM conversation flow
// - academicTools: Complex tool management not needed
// - APPROVAL: Approval constants not used in natural conversation

// Enhanced academic metadata type - simplified for native OpenAI web search
export interface AcademicMetadata {
  phase?: number;
  timestamp?: number;
  model?: string;
  tokens?: number;
  artifacts?: string[];
  userId?: string;
  sequenceNumber?: number;
  persistedAt?: string;
}

// Standard UIMessage with enhanced academic metadata
export type AcademicUIMessage = UIMessage<AcademicMetadata>;

interface ChatContainerProps {
  className?: string;
  initialMessages?: AcademicUIMessage[];
  chatId?: string;
  // Testing & Development props
  debugMode?: boolean;
  testMode?: boolean;
  onMessageStream?: (message: AcademicUIMessage) => void;
  onError?: (error: Error) => void;
}

const ChatContainerComponent: React.FC<ChatContainerProps> = ({
  initialMessages = [],
  chatId,
  debugMode = true,
  testMode = false,
  onMessageStream,
  onError: externalErrorHandler,
}) => {
  // const { theme } = useTheme();
  const chatAreaRef = useRef<HTMLDivElement>(null);
  // ❌ REMOVED: Complex workflow state management - replaced with simple local state
  // Natural LLM conversation doesn't need rigid phase tracking
  // ❌ REMOVED: Complex phase tracking refs - no longer needed for natural LLM flow
  // - phaseStartIndexRef: Phase start index tracking
  // - lastCountRef: Discussion count tracking
  const [isLoadingInitialMessages, setIsLoadingInitialMessages] = useState<boolean>(false);
  const [loadedMessages, setLoadedMessages] = useState<AcademicUIMessage[]>(initialMessages);
  // 🔥 ERROR HANDLING STATE: Enhanced error management
  const [errorState, setErrorState] = useState<{
    message: string;
    type: string;
    isRetryable: boolean;
    provider?: string;
    timestamp?: number;
  } | null>(null);
  const hasLoadedRef = useRef<boolean>(false); // Track if loading has been attempted
  const lastChatIdRef = useRef<string | undefined>(undefined); // Track chatId changes
  const isExistingConversation = useRef<boolean>(false); // Track if conversation should have messages
  const reactId = useId();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const lastPersistedCountRef = useRef<number>(0);
  const isPersistingRef = useRef<boolean>(false);

  // ✅ CRITICAL FIX: Enhanced user ID extraction with multiple fallbacks
  const getUserId = useCallback((): string => {
    // 1. Try authenticated user ID
    if (user?.id) {
      return user.id;
    }

    // 2. Try localStorage fallback (for client-side persistence)
    if (typeof window !== 'undefined') {
      const storedUserId = localStorage.getItem('userId');
      if (storedUserId && storedUserId !== 'undefined' && storedUserId !== 'null') {
        return storedUserId;
      }
    }

    // 3. Fallback to SYSTEM_USER_UUID as last resort
    return SYSTEM_USER_UUID;
  }, [user?.id]);

  // Citations state from native-openai web search
  // citations disabled for now
  const [citations] = useState<Array<{ title?: string; url: string; snippet?: string }>>([]);

  // AI SDK useChat integration with native OpenAI web search
  const chatHookResult = useChat<AcademicUIMessage>({
    id: chatId || `academic-chat-${reactId}`,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      headers: {
        'Content-Type': 'application/json',
        'X-Chat-Mode': 'academic-workflow',
        'X-Debug-Mode': debugMode ? 'true' : 'false',
        'X-Chat-Id': chatId || '', // Pass chatId for persistence coordination
        'X-User-Id': getUserId(), // Enhanced user ID extraction with fallbacks
      },
    }),
    messages: loadedMessages,
    // ❌ REMOVED: Automatic submission disabled to prevent web search response duplication
    // sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,

    // ✅ Handle automatic tools (web search)
    async onToolCall({ toolCall }) {
      if (toolCall.dynamic) return;

      // Web search is handled automatically, no user interaction needed
      if (toolCall.toolName === 'web_search') {
        // Tool executes automatically on server
        return;
      }
    },
    
    // Event handlers from documentation patterns
    onFinish: (arg: any) => {
      const message = (arg && arg.message) ? arg.message : arg;
      console.log('[ChatContainer] Message completed:', message?.id);
      
      // ❌ REMOVED: Phase information extraction - 4 lines of rigid phase control
      // Natural LLM conversation doesn't need phase metadata tracking
      
      // Notify external handlers
      if (onMessageStream && message) {
        onMessageStream(message as any);
      }
      
      // Refresh chat history shortly after stream completes to surface new item with smart title
      try {
        if (typeof window !== 'undefined' && (window as any).refreshChatHistory) {
          // Single refresh to prevent multiple history updates
          setTimeout(() => {
            try { (window as any).refreshChatHistory(); } catch {}
          }, 500);
        }
      } catch {}

      // Auto-scroll to bottom
      scrollToBottom();
    },
    
    onError: (error) => {
      console.error('[ChatContainer] Chat error:', error);

      // 🔍 ENHANCED ERROR PARSING & CLASSIFICATION
      let errorData: {
        message: string;
        type: string;
        isRetryable: boolean;
        provider?: string;
        timestamp?: number;
      };

      if (typeof error === 'object' && error !== null) {
        // Parse structured error dari server
        if ('error' in error && typeof error.error === 'object' && error.error !== null) {
          const errorObj = error.error as Record<string, any>;
          errorData = {
            message: errorObj.message || 'Terjadi kesalahan sistem',
            type: errorObj.type || 'unknown',
            isRetryable: errorObj.isRetryable || false,
            provider: errorObj.provider,
            timestamp: Date.now()
          };
        } else {
          errorData = {
            message: error.message || String(error),
            type: 'client_error',
            isRetryable: false,
            timestamp: Date.now()
          };
        }
      } else {
        errorData = {
          message: String(error),
          type: 'unknown',
          isRetryable: false,
          timestamp: Date.now()
        };
      }

      // 🎯 SET ERROR STATE untuk UI display
      setErrorState(errorData);

      // 🛑 STOP LOADING indicator jika ada
      setIsLoadingInitialMessages(false);

      // 🔄 RETRY LOGIC: Auto-clear retryable errors setelah delay
      if (errorData.isRetryable) {
        console.log('[ChatContainer] Error is retryable, will auto-clear in 5 seconds');
        setTimeout(() => {
          setErrorState(null);
        }, 5000);
      }

      // Log classification untuk debugging
      console.log('[ChatContainer] Error classified:', {
        type: errorData.type,
        isRetryable: errorData.isRetryable,
        provider: errorData.provider,
        message: errorData.message
      });

      if (externalErrorHandler) {
        externalErrorHandler(error);
      }
    },
    
    onData: (dataPart: any) => {
      console.log('[ChatContainer] Streaming data part:', dataPart);
      
      // Handle AI SDK v5 compliant history refresh notification (transient)
      if (dataPart.type === 'data-history') {
        try {
          console.log('[ChatContainer] 📣 Received data-history:', dataPart.data);

          // Always refresh sidebar list
          if (typeof window !== 'undefined' && (window as any).refreshChatHistory) {
            (window as any).refreshChatHistory();
          }

          // ❌ REMOVED: Complex message reloading logic - 7 lines of rigid database sync
          // Natural LLM conversation doesn't need complex artifact-based reloading
          console.log('[ChatContainer] ⏭️ Simple refresh without complex reloading logic');
        } catch (e) {
          console.warn('[ChatContainer] history refresh failed:', e);
        }
      }

      // 🔥 HANDLE ERROR EVENTS FROM STREAM
      if (dataPart.type === 'error') {
        try {
          console.log('[ChatContainer] 📣 Received error from stream:', dataPart.error);

          const streamError = dataPart.error;
          setErrorState({
            message: streamError.message || 'Terjadi kesalahan streaming',
            type: streamError.type || 'stream_error',
            isRetryable: streamError.isRetryable || false,
            provider: streamError.provider,
            timestamp: Date.now()
          });

          // Auto-clear retryable stream errors
          if (streamError.isRetryable) {
            setTimeout(() => {
              setErrorState(null);
            }, 5000);
          }
        } catch (e) {
          console.warn('[ChatContainer] Error processing stream error:', e);
        }
      }

      // ❌ REMOVED: Phase transition data handling - 12 lines of rigid phase control
      // Natural LLM conversation transitions phases naturally without special data events

      // ❌ REMOVED: System instruction handling for phase progression - 12 lines of rigid control
      // Natural LLM conversation doesn't need system instructions to manage phases

      // ❌ REMOVED: Phase sync enhancement from metadata - 12 lines of rigid synchronization
      // Natural LLM conversation doesn't need metadata-based phase synchronization

      // ❌ REMOVED: Complex artifact injection logic - 47 lines of rigid state management
      // Including message finding, duplicate guards, and parts manipulation
      // Natural LLM conversation handles artifacts through simple streaming without complex injection

      // ❌ REMOVED: Gate-closed signal handling - 79 lines of rigid programmatic control
      // Including duplicate detection, phase completion tracking, and auto-advance logic
      // Natural LLM conversation doesn't need "gate" concept or rigid phase progression

      // ❌ REMOVED: Phase announcement handling - 12 lines of rigid phase management
      // Natural LLM conversation announces phases naturally without special handlers

      // Handle standard data parts
      if (dataPart.type === 'data') {
        // ❌ REMOVED: Academic workflow specific data handling - 3 lines of rigid phase control
        // Natural LLM conversation doesn't need special phase data handling

        // Handle transient notifications
        if (dataPart.data?.type === 'notification' && dataPart.data?.message) {
          console.log('[Notification]', dataPart.data.message);
        }

        // citations streaming disabled
      }
    },
    
    // Experimental throttling for smooth UI updates
    experimental_throttle: 50,
  });

  // Debug useChat hook result
  if (debugMode) {
    console.log('[ChatContainer] useChat result:', chatHookResult);
    console.log('[ChatContainer] sendMessage type:', typeof chatHookResult.sendMessage);
  }

  // Log initial status only in debug mode
  if (debugMode) {
    console.log('[ChatContainer] Initial useChat status:', chatHookResult.status);
  }

  // Destructure values dari useChat hook including addToolResult for HITL
  const {
    messages,
    sendMessage,
    addToolResult,
    status,
    error,
    stop,
    regenerate,
    clearError,
    setMessages,
  } = chatHookResult;
  const previousStatusRef = useRef(status);

  const persistChatHistory = useCallback(async () => {
    console.log('[ChatContainer] persistChatHistory called', {
      chatId,
      messagesLength: messages.length,
      hasAssistant: messages.some(message => message.role === 'assistant'),
      lastPersistedCount: lastPersistedCountRef.current,
      isPersisting: isPersistingRef.current
    });

    if (!chatId) {
      console.log('[ChatContainer] persistChatHistory: No chatId, skipping');
      return;
    }

    if (messages.length === 0) {
      console.log('[ChatContainer] persistChatHistory: No messages, skipping');
      return;
    }

    if (!messages.some(message => message.role === 'assistant')) {
      console.log('[ChatContainer] persistChatHistory: No assistant message yet, skipping');
      return;
    }

    if (messages.length === lastPersistedCountRef.current) {
      console.log('[ChatContainer] persistChatHistory: Already persisted this count, skipping');
      return;
    }

    if (isPersistingRef.current) {
      console.log('[ChatContainer] persistChatHistory: Already persisting, skipping');
      return;
    }

    console.log('[ChatContainer] persistChatHistory: Starting persist...');
    const effectiveUserId = getUserId(); // Use consistent user ID extraction
    const timestamp = new Date().toISOString();

    const payloadMessages = messages.map((message, index) => {
      const createdAtRaw = (message as any).createdAt;
      let createdAtIso: string;
      if (createdAtRaw instanceof Date) {
        createdAtIso = createdAtRaw.toISOString();
      } else if (typeof createdAtRaw === 'string') {
        createdAtIso = createdAtRaw;
      } else {
        createdAtIso = timestamp;
      }

      const baseMetadata =
        typeof message.metadata === 'object' && message.metadata !== null
          ? message.metadata
          : {};

      return {
        ...message,
        createdAt: createdAtIso,
        metadata: {
          ...baseMetadata,
          userId: baseMetadata?.userId || effectiveUserId,
          phase: typeof baseMetadata?.phase === 'number' ? baseMetadata.phase : 1,
          sequenceNumber: index,
          persistedAt: timestamp,
        },
      };
    });

    isPersistingRef.current = true;

    // Add timeout protection & retry logic
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    let retryCount = 0;
    const maxRetries = 2;

    const attemptSync = async (): Promise<boolean> => {
      try {
        const response = await fetch('/api/chat/sync', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': effectiveUserId,
          },
          body: JSON.stringify({
            conversationId: chatId,
            messages: payloadMessages,
            forceSync: true,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          throw new Error(`Chat sync failed (${response.status}): ${errorText}`);
        }

        clearTimeout(timeout);
        console.log('[ChatContainer] persistChatHistory: Sync successful!');
        return true;
      } catch (error: any) {
        clearTimeout(timeout);

        if (error.name === 'AbortError') {
          console.warn(`[ChatContainer] Chat sync timeout (attempt ${retryCount + 1}/${maxRetries + 1})`);
          return false;
        }

        console.error(`[ChatContainer] Chat sync error (attempt ${retryCount + 1}):`, error);
        return false;
      }
    };

    // Try sync with retry logic
    let syncSuccess = await attemptSync();

    // Retry if failed (but not for abort errors)
    while (!syncSuccess && retryCount < maxRetries) {
      retryCount++;
      console.log(`[ChatContainer] Retrying chat sync (attempt ${retryCount + 1}/${maxRetries + 1})...`);

      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));

      syncSuccess = await attemptSync();
    }

    if (syncSuccess) {
      lastPersistedCountRef.current = messages.length;

      // Send success signal for UI updates
      if (typeof window !== 'undefined') {
        // Notify about successful persistence
        window.postMessage({
          type: 'chat-persisted',
          chatId,
          messageCount: messages.length,
          timestamp: new Date().toISOString()
        }, '*');

        // Also try legacy refresh method
        const refreshHistory = (window as any).refreshChatHistory;
        if (typeof refreshHistory === 'function') {
          setTimeout(() => {
            try {
              refreshHistory();
            } catch (refreshError) {
              console.warn('[ChatContainer] refreshChatHistory failed:', refreshError);
            }
          }, 500);
        }
      }
    } else {
      console.error(`[ChatContainer] ❌ Chat persistence failed after ${maxRetries + 1} attempts`);
      // DO NOT REFRESH PAGE - just log error
      // User can continue chatting, we'll try to save on next message
    }

    isPersistingRef.current = false;
  }, [chatId, user?.id, getUserId, messages]); // ✅ FIX: Include messages to prevent stale closure

  // ❌ REMOVED: Complex message reloading function - 39 lines of rigid state management
  // Including artifact counting, phase updating, and elaborate error handling
  // Natural LLM conversation uses simple message loading without complex reloading logic

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  };

  // ✅ CRITICAL FIX: Auto-scroll with proper dependency management
  const messagesLengthRef = useRef(messages.length);

  useEffect(() => {
    // Only scroll if message count actually changed (prevents excessive scrolling)
    if (messages.length !== messagesLengthRef.current) {
      messagesLengthRef.current = messages.length;
      scrollToBottom();
    }
  }, [messages.length]); // ✅ FIXED: Depend on length only, not full messages array

  // ❌ REMOVED: Complex phase tracking logic - 22 lines of rigid state management
  // Including phase start index tracking and discussion count per phase
  // Natural LLM conversation flows without needing phase index calculations

  // Detect if conversation is existing (navigated from history) or new
  useEffect(() => {
    if (!chatId) {
      isExistingConversation.current = false;
      lastPersistedCountRef.current = 0;
      return;
    }

    // Detect navigation from SimpleHistoryList or direct URL with existing chatId
    const fromHistoryNavigation = (
      typeof window !== 'undefined' && 
      (document.referrer.includes('chatId=') || 
       window.location.search.includes('chatId='))
    );
    
    // Also check if we're coming from a page that should have existing data
    const hasUrlChatId = searchParams.get('chatId') === chatId;
    
    isExistingConversation.current = fromHistoryNavigation && hasUrlChatId && chatId !== undefined;
    
    if (debugMode) {
      console.log(`[ChatContainer] Conversation detection:`, {
        chatId,
        fromHistoryNavigation,
        hasUrlChatId,
        isExisting: isExistingConversation.current
      });
    }
  }, [chatId, searchParams, debugMode]);

  // ✅ FIXED: Load initial messages with stable dependencies - PREVENT SETMESSAGES LOOP
  useEffect(() => {
    console.log(`[ChatContainer] useEffect triggered with chatId: ${chatId}`);

    const loadInitialMessages = async () => {
      // Only proceed if we have a chatId
      if (!chatId) {
        return;
      }

      // Check if chatId has changed - if so, reset loading state
      if (lastChatIdRef.current !== chatId) {
        hasLoadedRef.current = false;
        lastChatIdRef.current = chatId;
        setLoadedMessages([]); // Reset messages for new chat
      }

      // Only load if we haven't loaded for this chatId yet
      // ✅ FIXED: Check refs instead of state to avoid circular dependency
      if (hasLoadedRef.current) {
        return;
      }

      console.log(`[ChatContainer] Loading initial messages for chat ${chatId}`);
      hasLoadedRef.current = true; // Mark as loading attempted
      setIsLoadingInitialMessages(true);

      try {
        // Simple message loading without retry complexity
        const loadedChatMessages = await loadChat(chatId, supabaseChatClient as any);

        if (loadedChatMessages.length > 0) {
          console.log(`[ChatContainer] ✅ Loaded ${loadedChatMessages.length} messages from database`);
          setLoadedMessages(loadedChatMessages as AcademicUIMessage[]);
          // ✅ CRITICAL FIX: Use setTimeout to break the sync update loop that causes infinite re-renders
          setTimeout(() => {
            setMessages(loadedChatMessages as AcademicUIMessage[]);
          }, 0);
          lastPersistedCountRef.current = loadedChatMessages.length;
        } else {
          console.log(`[ChatContainer] No messages found for chat ${chatId} - starting fresh`);
          // ✅ CRITICAL FIX: Use setTimeout to break the sync update loop
          setTimeout(() => {
            setMessages([]);
          }, 0);
          lastPersistedCountRef.current = 0;
        }
      } catch (error) {
        console.error(`[ChatContainer] Failed to load initial messages:`, error);
        // Continue with empty chat - also async to prevent loops
        setTimeout(() => {
          setMessages([]);
        }, 0);
      } finally {
        setIsLoadingInitialMessages(false);
      }
    };

    loadInitialMessages();
  }, [chatId]); // ✅ FIXED: Removed setMessages to prevent infinite re-renders

  // Approval handlers removed - using native OpenAI web search

  // Handle message regeneration
  const handleRegenerateMessage = () => {
    try {
      regenerate(); // AI SDK v5 uses regenerate() for regeneration
    } catch (error) {
      console.error('[ChatContainer] Regenerate error:', error);
    }
  };

  // Handle stop streaming
  const handleStopStreaming = () => {
    stop();
  };

  useEffect(() => {
    console.log('[ChatContainer] Status change detected:', {
      previousStatus: previousStatusRef.current,
      currentStatus: status,
      willPersist: previousStatusRef.current === 'streaming' && status === 'ready'
    });

    if (previousStatusRef.current === 'streaming' && status === 'ready') {
      console.log('[ChatContainer] ✅ Status changed from streaming to ready - CALLING persistChatHistory');
      persistChatHistory();
    }

    previousStatusRef.current = status;
  }, [status, persistChatHistory]);

  // handleSendMessage function removed - now using sendMessage directly

  const hasMessages = messages.length > 0;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      {/* ChatGPT-style Layout with State-based Positioning */}
      {!hasMessages ? (
        /* EMPTY STATE: Input centered vertically */
        <div className="flex min-h-full items-center justify-center p-4 md:p-6">
          <div className="w-full max-w-[576px] md:max-w-[840px] mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2">
                Makalah AI Assistant
              </h2>
              <p className="text-sm md:text-base text-muted-foreground">
                Mulai percakapan akademik dengan AI assistant untuk penulisan paper
              </p>
            </div>

            {/* Error Display for Empty State */}
            {(error || errorState) && (
              <div className="mb-6">
                <ErrorDisplay
                  error={(errorState || error) as Error}
                  onRetry={() => {
                    clearError();
                    setErrorState(null);
                  }}
                  onClear={() => {
                    clearError();
                    setErrorState(null);
                  }}
                />
              </div>
            )}

            {/* Centered Chat Input - Responsive */}
            <ChatInput
              className="transition-all duration-300 ease-in-out"
              sendMessage={sendMessage}
              disabled={status !== 'ready'}
              status={status}
              placeholder="Enter message..."
              testMode={testMode}
              onStop={handleStopStreaming}
            />
          </div>
        </div>
      ) : (
        /* WITH MESSAGES: Scrollable messages + Fixed bottom input */
        <>
          {/* Messages Area - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="w-full max-w-[576px] md:max-w-[840px] mx-auto p-3 md:p-4" ref={chatAreaRef}>
              {/* Enhanced Error Display */}
              {(error || errorState) && (
                <div className="mb-4">
                  <ErrorDisplay
                    error={(errorState || error) as Error}
                    onRetry={() => {
                      clearError();
                      setErrorState(null);
                      if (errorState?.isRetryable) {
                        console.log('[ChatContainer] Manual retry triggered for retryable error');
                      }
                    }}
                    onClear={() => {
                      clearError();
                      setErrorState(null);
                    }}
                  />
                </div>
              )}

              {/* Messages */}
              <div className="space-y-4">
                {messages.map((message) => (
                  <MessageDisplay
                    key={message.id}
                    message={message}
                    onRegenerate={() => handleRegenerateMessage()}
                    debugMode={debugMode}
                    addToolResult={addToolResult}
                    sendMessage={sendMessage}
                    citations={citations}
                    allMessages={messages}
                  />
                ))}
              </div>

              {/* Streaming Indicator */}
              {status === 'streaming' && (
                <div className="mt-4">
                  <StreamingHandler
                    status={status}
                  />
                </div>
              )}

              {/* Loading State */}
              {status === 'submitted' && (
                <div className="mt-4">
                  <LoadingIndicator
                    message="Loading..."
                  />
                </div>
              )}
            </div>
          </div>

          {/* Fixed Bottom Input Area - Responsive */}
          <div className="shrink-0 border-t border-border bg-background">
            <div className="w-full max-w-[576px] md:max-w-[840px] mx-auto p-3 md:p-4">
              <ChatInput
                className="transition-all duration-200 ease-in-out"
                sendMessage={sendMessage}
                disabled={status !== 'ready'}
                status={status}
                placeholder="Enter message..."
                testMode={testMode}
                onStop={handleStopStreaming}
              />
            </div>
          </div>
        </>
      )}

      {/* Pass HITL functions to MessageDisplay */}
      <div style={{ display: 'none' }}>
        {JSON.stringify({ addToolResult: !!addToolResult })}
      </div>
    </div>
  );
};

// ✅ REACT PERFORMANCE: Wrap dengan React.memo untuk prevent unnecessary re-renders
// Custom comparison function untuk deep comparison of chatId
export const ChatContainer = React.memo(ChatContainerComponent, (prevProps, nextProps) => {
  // Compare all relevant props to prevent stale prop issues
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.debugMode === nextProps.debugMode &&
    prevProps.testMode === nextProps.testMode &&
    prevProps.className === nextProps.className &&
    prevProps.onError === nextProps.onError &&
    prevProps.onMessageStream === nextProps.onMessageStream &&
    JSON.stringify(prevProps.initialMessages) === JSON.stringify(nextProps.initialMessages)
  );
});

ChatContainer.displayName = 'ChatContainer';

export default ChatContainer;
