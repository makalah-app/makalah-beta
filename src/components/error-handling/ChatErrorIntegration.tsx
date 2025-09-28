/**
 * CHAT ERROR INTEGRATION - Task 08 Error Handling Implementation
 * 
 * Integration wrapper untuk chat system dengan comprehensive error handling,
 * seamless error recovery, dan protection untuk Task 01-07 patterns.
 * 
 * INTEGRATION:
 * - ZERO modifications to protected Task 01-07 chat patterns
 * - Wraps existing chat components dengan error boundaries
 * - Provides seamless error handling untuk chat operations
 * - Maintains chat functionality during errors
 * 
 * FEATURES:
 * - Comprehensive chat error boundary wrapper
 * - Streaming error recovery without losing messages
 * - AI SDK v5 error handling integration  
 * - User-friendly error states for chat
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import ChatErrorBoundary from './ChatErrorBoundary';
import StreamingErrorBoundary from './StreamingErrorBoundary';
import APIErrorBoundary from './APIErrorBoundary';
import DatabaseErrorBoundary from './DatabaseErrorBoundary';
import FileErrorBoundary from './FileErrorBoundary';
import ErrorNotification from './ErrorNotification';
import { errorManager } from '../../lib/error-handling/ErrorManager';
import { enhanceError, formatErrorForUser } from '../../lib/error-handling/error-utils';

interface ChatErrorIntegrationProps {
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo, recovery: () => void) => void;
  enableAutoRecovery?: boolean;
  enableErrorNotifications?: boolean;
  enableDiagnostics?: boolean;
  userId?: string;
  chatId?: string;
}

/**
 * ChatErrorIntegration
 * 
 * Comprehensive error handling wrapper untuk chat system yang
 * melindungi semua chat operations tanpa memodifikasi existing code.
 */
export const ChatErrorIntegration: React.FC<ChatErrorIntegrationProps> = ({
  children,
  onError,
  enableAutoRecovery = true,
  enableErrorNotifications = true,
  enableDiagnostics = true,
  userId,
  chatId,
}) => {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    title: string;
    message: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    type?: string;
    retryable?: boolean;
    timestamp?: number;
  }>>([]);

  const [errorState, setErrorState] = useState<{
    hasError: boolean;
    errorType?: string;
    canRecover: boolean;
    recoveryAttempts: number;
  }>({
    hasError: false,
    canRecover: false,
    recoveryAttempts: 0,
  });

  const recoveryCallbacks = useRef<Map<string, () => void>>(new Map());
  const errorCount = useRef<Map<string, number>>(new Map());

  // Subscribe to error manager events
  useEffect(() => {
    const unsubscribe = errorManager.subscribe((managedError) => {
      if (managedError.context?.component?.includes('Chat') || 
          managedError.context?.chatId === chatId) {
        
        const formatted = formatErrorForUser(managedError as any);
        
        if (enableErrorNotifications) {
          addNotification({
            id: managedError.id,
            title: formatted.title,
            message: formatted.message,
            severity: managedError.severity,
            type: managedError.type,
            retryable: managedError.retryable,
            timestamp: managedError.timestamp,
          });
        }
      }
    });

    return unsubscribe;
  }, [chatId, enableErrorNotifications]);

  const addNotification = useCallback((notification: typeof notifications[0]) => {
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove low severity notifications
    if (notification.severity === 'low') {
      setTimeout(() => {
        removeNotification(notification.id);
      }, 5000);
    }
  }, []);

  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const handleError = useCallback((
    error: Error,
    errorInfo: React.ErrorInfo,
    errorType: string,
    errorId: string
  ) => {
    const enhanced = enhanceError(error, {
      component: 'Chat',
      chatId,
      userId,
      errorType,
      userFacing: true,
    });

    // Register dengan error manager
    const managedError = errorManager.register(enhanced, {
      type: errorType as any,
      source: 'boundary',
      component: 'Chat',
      userId,
      additionalContext: { chatId, errorInfo },
    });

    // Update error state
    setErrorState({
      hasError: true,
      errorType,
      canRecover: managedError.retryable,
      recoveryAttempts: managedError.retryCount,
    });

    // Create recovery callback
    const recoveryCallback = () => {
      setErrorState(prev => ({
        ...prev,
        hasError: false,
        recoveryAttempts: prev.recoveryAttempts + 1,
      }));
      
      errorManager.resolve(errorId, { method: 'user-recovery' });
    };

    recoveryCallbacks.current.set(errorId, recoveryCallback);

    // Call user error handler
    onError?.(error, errorInfo, recoveryCallback);

    // Auto-recovery for retryable errors
    if (enableAutoRecovery && managedError.retryable && managedError.retryCount < managedError.maxRetries) {
      setTimeout(() => {
        errorManager.attemptRecovery(errorId);
      }, 2000);
    }
  }, [chatId, userId, onError, enableAutoRecovery]);

  const handleChatError = useCallback((error: Error, errorInfo: React.ErrorInfo, errorId: string) => {
    handleError(error, errorInfo, 'chat', errorId);
  }, [handleError]);

  const handleStreamingError = useCallback((error: Error, errorInfo: React.ErrorInfo, errorId: string) => {
    handleError(error, errorInfo, 'streaming', errorId);
  }, [handleError]);

  const handleAPIError = useCallback((error: Error, errorInfo: React.ErrorInfo, errorId: string) => {
    handleError(error, errorInfo, 'api', errorId);
  }, [handleError]);

  const handleDatabaseError = useCallback((error: Error, errorInfo: React.ErrorInfo, errorId: string) => {
    handleError(error, errorInfo, 'database', errorId);
  }, [handleError]);

  const handleFileError = useCallback((error: Error, errorInfo: React.ErrorInfo, errorId: string) => {
    handleError(error, errorInfo, 'file', errorId);
  }, [handleError]);

  const handleNotificationRetry = useCallback((notificationId: string) => {
    const recoveryCallback = recoveryCallbacks.current.get(notificationId);
    if (recoveryCallback) {
      recoveryCallback();
      removeNotification(notificationId);
    } else {
      // Attempt recovery via error manager
      errorManager.attemptRecovery(notificationId);
      removeNotification(notificationId);
    }
  }, [removeNotification]);

  const handleNotificationAction = useCallback((notificationId: string, actionType: string) => {
    switch (actionType) {
      case 'details':
        const error = errorManager.getError(notificationId);
        if (error && enableDiagnostics) {
          console.log('Error Details:', error);
          // Here you could open a detailed error modal
        }
        break;
        
      case 'status':
        // Show system status or health check
        console.log('System Status Check');
        break;
        
      default:
        console.log('Unknown action:', actionType);
    }
  }, [enableDiagnostics]);

  // Recovery handler for streaming errors
  const handleStreamRecovery = useCallback((errorId: string, recoveryMethod: string) => {
    console.log(`[ChatErrorIntegration] Stream recovery: ${recoveryMethod} for ${errorId}`);
    
    setErrorState(prev => ({
      ...prev,
      hasError: false,
    }));
    
    errorManager.resolve(errorId, { method: recoveryMethod });
  }, []);

  return (
    <div className="chat-error-integration">
      {/* Nested Error Boundaries - Order is important! */}
      <ChatErrorBoundary
        onError={handleChatError}
        enableRetry={enableAutoRecovery}
        maxRetries={3}
        showTechnicalDetails={enableDiagnostics}
        fallbackComponent={
          <div style={{
            padding: '20px',
            textAlign: 'center',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            margin: '16px',
          }}>
            <h3 style={{ color: '#dc2626', margin: '0 0 8px 0' }}>
              Chat Unavailable
            </h3>
            <p style={{ color: '#991b1b', margin: '0 0 12px 0' }}>
              The chat interface encountered an error and needs to be reloaded.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Reload Chat
            </button>
          </div>
        }
      >
        <StreamingErrorBoundary
          onError={handleStreamingError}
          onStreamRecover={handleStreamRecovery}
          enableAutoRecovery={enableAutoRecovery}
          fallbackToPoll={true}
          preserveMessages={true}
          fallbackComponent={
            <div style={{
              padding: '12px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fbbf24',
              borderRadius: '6px',
              margin: '8px',
              fontSize: '14px',
            }}>
              <strong>Streaming Unavailable</strong>
              <p style={{ margin: '4px 0 0 0' }}>
                Using polling mode for updates. Your messages are preserved.
              </p>
            </div>
          }
        >
          <APIErrorBoundary
            onError={handleAPIError}
            enableAutoRetry={enableAutoRecovery}
            maxRetries={3}
            fallbackComponent={
              <div style={{
                padding: '12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                margin: '8px',
                fontSize: '14px',
              }}>
                <strong>Service Error</strong>
                <p style={{ margin: '4px 0 0 0' }}>
                  AI service temporarily unavailable. Please try again.
                </p>
              </div>
            }
          >
            <DatabaseErrorBoundary
              onError={handleDatabaseError}
              enableOfflineMode={true}
              enableRetry={enableAutoRecovery}
              tableName="messages"
              fallbackComponent={
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #7dd3fc',
                  borderRadius: '6px',
                  margin: '8px',
                  fontSize: '14px',
                }}>
                  <strong>Offline Mode</strong>
                  <p style={{ margin: '4px 0 0 0' }}>
                    Working with cached data. Changes will sync when online.
                  </p>
                </div>
              }
            >
              <FileErrorBoundary
                onError={handleFileError}
                enableRetry={enableAutoRecovery}
                enableCleanup={true}
                operationType="upload"
                fallbackComponent={
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#fefce8',
                    border: '1px solid #facc15',
                    borderRadius: '6px',
                    margin: '8px',
                    fontSize: '14px',
                  }}>
                    <strong>File Upload Error</strong>
                    <p style={{ margin: '4px 0 0 0' }}>
                      Unable to process file. Please try a different file.
                    </p>
                  </div>
                }
              >
                {/* Protected Chat Components */}
                {children}
              </FileErrorBoundary>
            </DatabaseErrorBoundary>
          </APIErrorBoundary>
        </StreamingErrorBoundary>
      </ChatErrorBoundary>

      {/* Error Notifications */}
      {enableErrorNotifications && (
        <div 
          className="chat-error-notifications"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          {notifications.map((notification, index) => (
            <div
              key={notification.id}
              style={{
                marginBottom: '8px',
                pointerEvents: 'auto',
              }}
            >
              <ErrorNotification
                error={notification as any}
                onRetry={() => handleNotificationRetry(notification.id)}
                onDismiss={() => removeNotification(notification.id)}
                onAction={(actionType) => handleNotificationAction(notification.id, actionType)}
                autoDismiss={notification.severity === 'low' ? 5 : 0}
                position="top-right"
                showIcon={true}
                showTimestamp={true}
                enableActions={true}
              />
            </div>
          ))}
        </div>
      )}

      {/* Error State Indicator (for debugging) */}
      {process.env.NODE_ENV === 'development' && errorState.hasError && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            padding: '8px 12px',
            backgroundColor: '#1f2937',
            color: '#f9fafb',
            borderRadius: '6px',
            fontSize: '12px',
            zIndex: 9998,
          }}
        >
          Error State: {errorState.errorType} | 
          Recoverable: {errorState.canRecover ? 'Yes' : 'No'} |
          Attempts: {errorState.recoveryAttempts}
        </div>
      )}
    </div>
  );
};

/**
 * Hook untuk integrating dengan chat error handling
 */
export const useChatErrorHandling = (chatId?: string, userId?: string) => {
  const [errorState, setErrorState] = useState({
    hasError: false,
    lastError: null as Error | null,
    recoveryAvailable: false,
  });

  const reportError = useCallback((error: Error, context?: Record<string, any>) => {
    const enhanced = enhanceError(error, {
      component: 'Chat',
      chatId,
      userId,
      ...context,
    });

    const managedError = errorManager.register(enhanced, {
      type: 'chat',
      source: 'manual',
      component: 'Chat',
      userId,
      additionalContext: { chatId, ...context },
    });

    setErrorState({
      hasError: true,
      lastError: error,
      recoveryAvailable: managedError.retryable,
    });

    return managedError.id;
  }, [chatId, userId]);

  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      lastError: null,
      recoveryAvailable: false,
    });
  }, []);

  const attemptRecovery = useCallback(async (errorId: string) => {
    try {
      const success = await errorManager.attemptRecovery(errorId);
      if (success) {
        clearError();
      }
      return success;
    } catch (e) {
      console.error('Recovery attempt failed:', e);
      return false;
    }
  }, [clearError]);

  return {
    errorState,
    reportError,
    clearError,
    attemptRecovery,
    errorStats: errorManager.getStatistics(),
  };
};

/**
 * Provider untuk chat-wide error handling context
 */
export const ChatErrorProvider: React.FC<{
  children: React.ReactNode;
  chatId?: string;
  userId?: string;
}> = ({ children, chatId, userId }) => {
  return (
    <ChatErrorIntegration
      chatId={chatId}
      userId={userId}
      enableAutoRecovery={true}
      enableErrorNotifications={true}
      enableDiagnostics={process.env.NODE_ENV === 'development'}
    >
      {children}
    </ChatErrorIntegration>
  );
};

export default ChatErrorIntegration;
