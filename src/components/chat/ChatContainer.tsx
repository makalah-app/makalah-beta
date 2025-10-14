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
  DefaultChatTransport
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
// Pure chat - workflow types removed
// Now using standard UIMessage from AI SDK v5

interface ChatContainerProps {
  className?: string;
  initialMessages?: UIMessage[];
  chatId?: string;
  // Testing & Development props
  debugMode?: boolean;
  testMode?: boolean;
  onMessageStream?: (message: UIMessage) => void;
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
  const scrollableContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef<boolean>(false);
  // ❌ REMOVED: Complex workflow state management - replaced with simple local state
  // Natural LLM conversation doesn't need rigid phase tracking
  // ❌ REMOVED: Complex phase tracking refs - no longer needed for natural LLM flow
  // - phaseStartIndexRef: Phase start index tracking
  // - lastCountRef: Discussion count tracking
  const [isLoadingInitialMessages, setIsLoadingInitialMessages] = useState<boolean>(false);
  const [loadedMessages, setLoadedMessages] = useState<UIMessage[]>(initialMessages);
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
  const editAreaRef = useRef<HTMLDivElement>(null); // Track edit area for click outside detection
  const reactId = useId();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const lastPersistedCountRef = useRef<number>(0);
  const isPersistingRef = useRef<boolean>(false);
  const refreshCountRef = useRef<number>(0); // Track history refresh count (limit to 3 per conversation)

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

  // ✅ EAGER PERSISTENCE: Ensure conversation exists before sending message
  // Prevents data loss if user refreshes during streaming
  const ensureConversationExists = useCallback(async (messageText: string): Promise<void> => {
    if (!chatId) return;

    try {
      await fetch('/api/chat/conversations/ensure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': getUserId(),
        },
        body: JSON.stringify({
          conversationId: chatId,
          initialMessage: messageText
        })
      });

      // Success - conversation created or already exists
    } catch (error) {
      // Silent failure - normal persistence flow will handle it as fallback
    }
  }, [chatId, getUserId]);

  // Citations state from native-openai web search
  // citations disabled for now
  const [citations] = useState<Array<{ title?: string; url: string; snippet?: string }>>([]);

  // 📝 EDIT MESSAGE STATE: Enhanced edit functionality
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // AI SDK useChat integration with native OpenAI web search
  const chatHookResult = useChat<UIMessage>({
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

      // ❌ REMOVED: Phase information extraction - 4 lines of rigid phase control
      // Natural LLM conversation doesn't need phase metadata tracking

      // Notify external handlers
      if (onMessageStream && message) {
        onMessageStream(message as any);
      }

      // Refresh chat history ONLY for first 3 messages to update sidebar with new conversation
      // After 3 messages, conversation already visible in sidebar, no need to refresh
      try {
        if (refreshCountRef.current < 3) {
          if (typeof window !== 'undefined' && (window as any).refreshChatHistory) {
            setTimeout(() => {
              try {
                (window as any).refreshChatHistory();
                refreshCountRef.current++; // Increment after successful refresh call
              } catch {}
            }, 500);
          }
        }
      } catch {}

      // Auto-scroll to bottom
      scrollToBottom();
    },
    
    onError: (error) => {
      // Chat error occurred - silent handling for production

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
        setTimeout(() => {
          setErrorState(null);
        }, 5000);
      }

      if (externalErrorHandler) {
        externalErrorHandler(error);
      }
    },
    
    onData: (dataPart: any) => {
      // 🔥 HANDLE ERROR EVENTS FROM STREAM
      if (dataPart.type === 'error') {
        try {
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
          // Error processing stream - silent handling for production
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
          // Notification handled silently
        }

        // citations streaming disabled
      }
    },
    
    // Experimental throttling for smooth UI updates
    experimental_throttle: 50,
  });

  // Debug mode logging removed for production

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
    if (!chatId) {
      return;
    }

    if (messages.length === 0) {
      return;
    }

    if (!messages.some(message => message.role === 'assistant')) {
      return;
    }

    if (messages.length === lastPersistedCountRef.current) {
      return;
    }

    if (isPersistingRef.current) {
      return;
    }

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
          userId: (baseMetadata as any)?.userId || effectiveUserId,
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
        
        return true;
      } catch (error: any) {
        clearTimeout(timeout);

        if (error.name === 'AbortError') {
          // Chat sync timeout - silent handling for production
          return false;
        }

        // Chat sync error - silent handling for production
        return false;
      }
    };

    // Try sync with retry logic
    let syncSuccess = await attemptSync();

    // Retry if failed (but not for abort errors)
    while (!syncSuccess && retryCount < maxRetries) {
      retryCount++;
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

        // History refresh handled by onFinish callback for real-time updates
        // No refresh needed here as onFinish already triggers sidebar update
      }
    } else {
      // Chat persistence failed - silent handling for production
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
    if (scrollableContainerRef.current) {
      scrollableContainerRef.current.scrollTo({
        top: scrollableContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // ✅ CRITICAL FIX: Auto-scroll with proper dependency management
  const messagesLengthRef = useRef(messages.length);

  useEffect(() => {
    // Only scroll if message count actually changed (prevents excessive scrolling)
    if (messages.length !== messagesLengthRef.current || shouldScrollRef.current) {
      messagesLengthRef.current = messages.length;
      shouldScrollRef.current = false;
      // Small delay to ensure DOM is updated before scrolling
      setTimeout(() => scrollToBottom(), 50);
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
      refreshCountRef.current = 0; // Reset refresh counter for new conversation
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
    
    // Conversation detection completed
  }, [chatId, searchParams, debugMode]);

  // ✅ FIXED: Load initial messages with stable dependencies - PREVENT SETMESSAGES LOOP
  useEffect(() => {
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
        refreshCountRef.current = 0; // Reset refresh counter for new chat
      }

      // Only load if we haven't loaded for this chatId yet
      // ✅ FIXED: Check refs instead of state to avoid circular dependency
      if (hasLoadedRef.current) {
        return;
      }

      hasLoadedRef.current = true; // Mark as loading attempted
      setIsLoadingInitialMessages(true);

      try {
        // Simple message loading without retry complexity
        const loadedChatMessages = await loadChat(chatId, supabaseChatClient as any);

        if (loadedChatMessages.length > 0) {
          // ✅ FIX: Filter out tool-call parts from historical messages to prevent re-execution
          // Keep tool-result parts to show search results, but remove tool-call parts that trigger execution
          const historicalMessages = loadedChatMessages.map((msg) => {
            if (msg.role === 'assistant' && msg.parts) {
              // Keep only non-tool-call parts (text, source-url, tool-result)
              const filteredParts = msg.parts.filter(part =>
                part.type !== 'tool-call'
              );
              return { ...msg, parts: filteredParts } as UIMessage;
            }
            return msg as UIMessage;
          });

          setLoadedMessages(historicalMessages);
          // ✅ CRITICAL FIX: Use setTimeout to break the sync update loop that causes infinite re-renders
          setTimeout(() => {
            setMessages(historicalMessages);
          }, 0);
          lastPersistedCountRef.current = historicalMessages.length;
        } else {
          // ✅ CRITICAL FIX: Use setTimeout to break the sync update loop
          setTimeout(() => {
            setMessages([]);
          }, 0);
          lastPersistedCountRef.current = 0;
        }
      } catch (error) {
        // Failed to load initial messages - silent handling for production
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
      // Regenerate error - silent handling for production
    }
  };

  // Handle stop streaming
  const handleStopStreaming = () => {
    stop();
  };

  // 📝 EDIT MESSAGE HANDLERS: Enhanced edit functionality
  const handleStartEdit = useCallback((messageId: string, currentText: string) => {
    setEditingMessageId(messageId);
    setEditingText(currentText);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditingText('');
  }, []);

  const handleEditingTextChange = useCallback((text: string) => {
    setEditingText(text);
  }, []);

  const handleSaveEdit = useCallback(async (messageId: string, newContent: string) => {
    // Validation
    if (!newContent.trim()) {
      alert('Message cannot be empty');
      return;
    }

    // Find message index
    const messageIndex = messages.findIndex(m => m.id === messageId);

    if (messageIndex !== -1) {
      // Remove the edited message and all messages after it
      setMessages(currentMessages => {
        // Cut messages up to BEFORE the edited message (exclude the edited message)
        const updatedMessages = currentMessages.slice(0, messageIndex);
        return updatedMessages;
      });

      // Clear edit mode
      setEditingMessageId(null);
      setEditingText('');

      // Trigger new AI response
      setTimeout(() => {
        sendMessage({
          text: newContent,
          metadata: {
            timestamp: Date.now()
          }
        });
      }, 100); // Small delay to ensure state is updated
    }
  }, [messages, setMessages, sendMessage]);

  // 📝 ESCAPE KEY HANDLER: Handle escape key to cancel edit mode
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingMessageId) {
        handleCancelEdit();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [editingMessageId, handleCancelEdit]);

  // 📝 CLICK OUTSIDE HANDLER: Handle click outside edit area to cancel edit mode
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Check if editing mode is active
      if (!editingMessageId) return;

      // Check if click is outside edit area
      if (editAreaRef.current && !editAreaRef.current.contains(e.target as Node)) {
        handleCancelEdit();
      }
    };

    // Add listener when editing
    if (editingMessageId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingMessageId, handleCancelEdit]);

  useEffect(() => {
    if (previousStatusRef.current === 'streaming' && status === 'ready') {
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
              <h2 className="text-xl md:text-5xl font-thin text-foreground mb-2">
                Mau bikin paper apa?
              </h2>
              <p className="text-sm md:text-base text-muted-foreground">
                Ayo diskusi dari elaborasi ide hingga paper utuh!
                <br />
                Gunakan gaya percakapan alami, tak perlu prompt rumit
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
              sendMessage={async (message) => {
                // Extract text from message
                const messageText = typeof message === 'string' ? message : (message.text || '');

                // Ensure conversation exists BEFORE sending message
                await ensureConversationExists(messageText);

                shouldScrollRef.current = true;
                sendMessage(message);
              }}
              disabled={status !== 'ready'}
              status={status}
              placeholder="Ketik obrolan..."
              testMode={testMode}
              onStop={handleStopStreaming}
            />
          </div>
        </div>
      ) : (
        /* WITH MESSAGES: 2-column layout with sidebar (desktop only) */
        <div className="flex h-full gap-4">
          {/* Main chat area */}
          <div className="flex-1 flex flex-col">
            {/* Messages Area - Scrollable */}
            <div className="flex-1 overflow-y-auto" ref={scrollableContainerRef}>
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
                        // Manual retry triggered for retryable error
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
                {messages.map((message, index) => {
                  const isLastMessage = index === messages.length - 1;
                  const isAssistantMessage = message.role === 'assistant';
                  const isStreaming = (status === 'streaming' || status === 'submitted');

                  // Show StreamingHandler before the last assistant message when streaming
                  const showStreamingHandlerBefore = isLastMessage && isAssistantMessage && isStreaming;

                  return (
                    <div key={message.id}>
                      {showStreamingHandlerBefore && (
                        <div className="mb-0.5">
                          <StreamingHandler
                            status={status}
                          />
                        </div>
                      )}
                      <MessageDisplay
                        message={message}
                        onRegenerate={() => handleRegenerateMessage()}
                        debugMode={debugMode}
                        addToolResult={addToolResult}
                        sendMessage={sendMessage}
                        citations={citations}
                        allMessages={messages}
                        // 📝 EDIT MESSAGE PROPS: Enhanced edit functionality
                        isEditing={editingMessageId === message.id}
                        editingText={editingMessageId === message.id ? editingText : ''}
                        onStartEdit={handleStartEdit}
                        onSaveEdit={handleSaveEdit}
                        onCancelEdit={handleCancelEdit}
                        onEditingTextChange={handleEditingTextChange}
                        editAreaRef={editAreaRef}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Loading State */}
              {status === 'submitted' && (
                <div className="mt-4">
                  <LoadingIndicator
                    message="Loading..."
                    size="xs"
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
                  sendMessage={async (message) => {
                    // Extract text from message
                    const messageText = typeof message === 'string' ? message : (message.text || '');

                    // Ensure conversation exists BEFORE sending message
                    await ensureConversationExists(messageText);

                    shouldScrollRef.current = true;
                    sendMessage(message);
                  }}
                  disabled={status !== 'ready'}
                  status={status}
                  placeholder="Ketik obrolan..."
                  testMode={testMode}
                  onStop={handleStopStreaming}
                />
              </div>
            </div>
          </div>

        </div>
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
