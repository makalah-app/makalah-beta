/**
 * ERROR NOTIFICATION - Task 08 Error Handling Implementation
 * 
 * Intelligent notification system untuk menampilkan errors dengan
 * contextual information, severity-based styling, dan action buttons.
 * 
 * INTEGRATION:
 * - ZERO modifications to existing notification systems
 * - Works with all error boundary components
 * - Provides consistent error communication across app
 * - Maintains accessibility standards
 * 
 * FEATURES:
 * - Severity-based visual styling
 * - Auto-dismiss with user control
 * - Contextual action buttons
 * - Screen reader accessibility
 */

'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';

export interface ErrorNotificationProps {
  error?: {
    id: string;
    title: string;
    message: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    type?: 'chat' | 'api' | 'streaming' | 'database' | 'file' | 'component';
    retryable?: boolean;
    timestamp?: number;
    context?: Record<string, any>;
  };
  onRetry?: () => void;
  onDismiss?: () => void;
  onAction?: (actionType: string) => void;
  autoDismiss?: number; // seconds
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
  maxWidth?: number;
  showIcon?: boolean;
  showTimestamp?: boolean;
  enableActions?: boolean;
}

/**
 * ErrorNotification
 * 
 * Displays error notifications dengan severity-based styling,
 * contextual actions, dan comprehensive accessibility support.
 */
export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  onRetry,
  onDismiss,
  onAction,
  autoDismiss = 0,
  position = 'top-right',
  maxWidth = 400,
  showIcon = true,
  showTimestamp = true,
  enableActions = true,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(autoDismiss);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();
  const notificationRef = useRef<HTMLDivElement>(null);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  // Auto-dismiss timer
  useEffect(() => {
    if (autoDismiss > 0 && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleDismiss();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [autoDismiss, handleDismiss, isPaused]);

  // Focus management for accessibility
  useEffect(() => {
    if (error?.severity === 'critical' || error?.severity === 'high') {
      notificationRef.current?.focus();
    }
  }, [error]);

  if (!error || !isVisible) return null;

  const handleRetry = () => {
    onRetry?.();
    handleDismiss();
  };

  const handleMouseEnter = () => {
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  const getSeverityConfig = () => {
    const configs = {
      low: {
        backgroundColor: '#f0f9ff',
        borderColor: '#0ea5e9',
        textColor: '#0c4a6e',
        iconColor: '#0ea5e9',
        icon: 'ℹ️',
        progressColor: '#0ea5e9',
      },
      medium: {
        backgroundColor: '#fffbeb',
        borderColor: '#f59e0b',
        textColor: '#92400e',
        iconColor: '#f59e0b',
        icon: '⚠️',
        progressColor: '#f59e0b',
      },
      high: {
        backgroundColor: '#fef2f2',
        borderColor: '#ef4444',
        textColor: '#991b1b',
        iconColor: '#ef4444',
        icon: '⚠️',
        progressColor: '#ef4444',
      },
      critical: {
        backgroundColor: '#fef2f2',
        borderColor: '#dc2626',
        textColor: '#7f1d1d',
        iconColor: '#dc2626',
        icon: '🚨',
        progressColor: '#dc2626',
      },
    };

    return configs[error.severity || 'medium'];
  };

  const getPositionStyles = () => {
    const positions = {
      'top-right': { top: '20px', right: '20px' },
      'top-left': { top: '20px', left: '20px' },
      'bottom-right': { bottom: '20px', right: '20px' },
      'bottom-left': { bottom: '20px', left: '20px' },
      'top-center': { top: '20px', left: '50%', transform: 'translateX(-50%)' },
    };

    return positions[position];
  };

  const getTypeLabel = () => {
    const labels = {
      chat: 'Chat Error',
      api: 'Service Error',
      streaming: 'Connection Error',
      database: 'Data Error',
      file: 'File Error',
      component: 'Display Error',
    };

    return labels[error.type || 'component'] || 'System Error';
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return new Date(timestamp).toLocaleTimeString();
  };

  const config = getSeverityConfig();

  return (
    <div
      ref={notificationRef}
      className="error-notification"
      style={{
        position: 'fixed',
        ...getPositionStyles(),
        maxWidth: `${maxWidth}px`,
        backgroundColor: config.backgroundColor,
        border: `1px solid ${config.borderColor}`,
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        zIndex: 9999,
        color: config.textColor,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        animation: 'slideIn 0.3s ease-out',
      }}
      role="alert"
      aria-live={error.severity === 'critical' ? 'assertive' : 'polite'}
      aria-atomic="true"
      tabIndex={-1}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Progress Bar for Auto-dismiss */}
      {autoDismiss > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '3px',
            width: `${(timeRemaining / autoDismiss) * 100}%`,
            backgroundColor: config.progressColor,
            borderRadius: '8px 8px 0 0',
            transition: 'width 1s linear',
          }}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8px' }}>
        {showIcon && (
          <div
            style={{
              fontSize: '16px',
              marginRight: '8px',
              marginTop: '2px',
            }}
            aria-hidden="true"
          >
            {config.icon}
          </div>
        )}
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h4
              style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: '600',
                color: config.textColor,
              }}
            >
              {error.title}
            </h4>
            
            <button
              onClick={handleDismiss}
              style={{
                background: 'none',
                border: 'none',
                color: config.textColor,
                cursor: 'pointer',
                fontSize: '16px',
                padding: '0 4px',
                opacity: 0.6,
                lineHeight: 1,
              }}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
          
          {/* Type and Timestamp */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11px',
              opacity: 0.7,
              marginTop: '2px',
            }}
          >
            <span>{getTypeLabel()}</span>
            {showTimestamp && error.timestamp && (
              <>
                <span>•</span>
                <span>{formatTimestamp(error.timestamp)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Message */}
      <div
        style={{
          fontSize: '13px',
          lineHeight: '1.4',
          marginBottom: enableActions ? '12px' : 0,
        }}
      >
        {error.message}
      </div>

      {/* Actions */}
      {enableActions && (
        <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
          {error.retryable && onRetry && (
            <button
              onClick={handleRetry}
              style={{
                padding: '6px 12px',
                backgroundColor: config.borderColor,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
              }}
            >
              Try Again
            </button>
          )}
          
          {onAction && (
            <button
              onClick={() => onAction('details')}
              style={{
                padding: '6px 12px',
                backgroundColor: 'transparent',
                color: config.textColor,
                border: `1px solid ${config.borderColor}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Details
            </button>
          )}
          
          {error.type === 'api' && onAction && (
            <button
              onClick={() => onAction('status')}
              style={{
                padding: '6px 12px',
                backgroundColor: 'transparent',
                color: config.textColor,
                border: `1px solid ${config.borderColor}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Check Status
            </button>
          )}
        </div>
      )}

      {/* Keyboard Navigation Hint */}
      {error.severity === 'critical' && (
        <div
          style={{
            fontSize: '10px',
            opacity: 0.6,
            marginTop: '8px',
            borderTop: `1px solid ${config.borderColor}`,
            paddingTop: '8px',
          }}
        >
          Press Escape to dismiss
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Hook for managing error notifications
 */
export const useErrorNotifications = () => {
  const [notifications, setNotifications] = useState<ErrorNotificationProps['error'][]>([]);

  const addNotification = (error: ErrorNotificationProps['error']) => {
    if (!error) return;
    
    setNotifications(prev => [...prev, { ...error, timestamp: Date.now() }]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif?.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
  };
};

/**
 * Container component untuk multiple notifications
 */
export const ErrorNotificationContainer: React.FC<{
  notifications: ErrorNotificationProps['error'][];
  onRetry?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onAction?: (id: string, actionType: string) => void;
  position?: ErrorNotificationProps['position'];
  maxNotifications?: number;
}> = ({
  notifications,
  onRetry,
  onDismiss,
  onAction,
  position = 'top-right',
  maxNotifications = 5,
}) => {
  // Show only the most recent notifications
  const visibleNotifications = notifications.slice(-maxNotifications);

  return (
    <div
      className="error-notification-container"
      aria-label="Error notifications"
      style={{
        position: 'fixed',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {visibleNotifications.map((notification, index) => notification && (
        <div
          key={notification.id}
          style={{
            marginBottom: '8px',
            pointerEvents: 'auto',
          }}
        >
          <ErrorNotification
            error={notification}
            onRetry={() => onRetry?.(notification.id)}
            onDismiss={() => onDismiss?.(notification.id)}
            onAction={(actionType) => onAction?.(notification.id, actionType)}
            position={position}
            autoDismiss={notification.severity === 'low' ? 5 : 0}
          />
        </div>
      ))}
    </div>
  );
};

export default ErrorNotification;
