/**
 * API ERROR BOUNDARY - Task 08 Error Handling Implementation
 * 
 * Specialized error boundary for API operations dengan intelligent
 * error classification, retry mechanisms, dan seamless fallback handling.
 * 
 * INTEGRATION:
 * - ZERO modifications to protected Task 01-07 patterns
 * - Handles API errors from chat, file upload, database operations
 * - Provides contextual recovery based on HTTP status codes
 * - Maintains application stability during API failures
 * 
 * FEATURES:
 * - HTTP status code classification
 * - Automatic retry with exponential backoff
 * - Rate limiting integration
 * - Offline detection and handling
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface APIErrorBoundaryProps {
  children: ReactNode;
  fallbackComponent?: ReactNode;
  onError?: (error: APIError, errorInfo: ErrorInfo, errorId: string) => void;
  onRetry?: (errorId: string, attempt: number) => void;
  enableAutoRetry?: boolean;
  retryDelay?: number;
  maxRetries?: number;
  apiEndpoint?: string;
}

interface APIError extends Error {
  status?: number;
  statusText?: string;
  endpoint?: string;
  method?: string;
  retryable?: boolean;
}

interface APIErrorBoundaryState {
  hasError: boolean;
  error?: APIError;
  errorInfo?: ErrorInfo;
  errorId: string;
  errorCategory: 'client' | 'server' | 'network' | 'timeout' | 'auth' | 'unknown';
  retryCount: number;
  retryAfter?: number;
  isRetrying: boolean;
  lastRetryTime: number;
  offlineMode: boolean;
  rateLimited: boolean;
}

/**
 * APIErrorBoundary
 * 
 * Advanced error boundary untuk API operations dengan intelligent
 * classification, automatic retry mechanisms, dan comprehensive
 * error recovery strategies.
 */
export class APIErrorBoundary extends Component<APIErrorBoundaryProps, APIErrorBoundaryState> {
  private retryTimer?: NodeJS.Timeout;
  private offlineListener?: () => void;
  private onlineListener?: () => void;

  constructor(props: APIErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      errorId: '',
      errorCategory: 'unknown',
      retryCount: 0,
      isRetrying: false,
      lastRetryTime: 0,
      offlineMode: false,
      rateLimited: false,
    };

    // Setup offline/online detection
    this.setupNetworkListeners();
  }

  static getDerivedStateFromError(error: Error): Partial<APIErrorBoundaryState> {
    const errorId = `api-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const apiError = APIErrorBoundary.enhanceError(error);
    const errorCategory = APIErrorBoundary.classifyError(apiError);
    
    // API error intercepted - silent handling for production

    return {
      hasError: true,
      error: apiError,
      errorId,
      errorCategory,
      rateLimited: apiError.status === 429,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { errorId, errorCategory } = this.state;
    
    // Enhanced API error logging - silent handling for production

    // Store error info
    this.setState({ errorInfo });

    // Call error callback
    this.props.onError?.(this.state.error!, errorInfo, errorId);

    // Setup automatic retry if enabled
    if (this.props.enableAutoRetry && this.canRetry()) {
      this.scheduleRetry();
    }
  }

  /**
   * Enhances basic Error dengan API-specific information
   */
  private static enhanceError(error: Error): APIError {
    const apiError = error as APIError;
    
    // Extract API information from error message atau properties
    if (error.message.includes('fetch')) {
      if (error.message.includes('timeout')) {
        apiError.retryable = true;
      }
      if (error.message.includes('network')) {
        apiError.retryable = true;
      }
    }

    // Check if it's already an enhanced API error
    if (!apiError.status && error.message.includes('status')) {
      const statusMatch = error.message.match(/status[:\s]+(\d+)/i);
      if (statusMatch) {
        apiError.status = parseInt(statusMatch[1], 10);
      }
    }

    // Set retry based on status
    if (apiError.status) {
      apiError.retryable = APIErrorBoundary.isStatusRetryable(apiError.status);
    }

    return apiError;
  }

  /**
   * Classifies API error berdasarkan status code dan error type
   */
  private static classifyError(error: APIError): APIErrorBoundaryState['errorCategory'] {
    const { status, message } = error;
    
    if (status) {
      if (status >= 400 && status < 500) {
        if (status === 401 || status === 403) return 'auth';
        return 'client';
      }
      if (status >= 500) return 'server';
    }

    if (message?.toLowerCase().includes('timeout')) return 'timeout';
    if (message?.toLowerCase().includes('network') || message?.toLowerCase().includes('fetch')) return 'network';
    
    return 'unknown';
  }

  /**
   * Determines if HTTP status code is retryable
   */
  private static isStatusRetryable(status: number): boolean {
    // 2xx - Success (tidak perlu retry)
    if (status >= 200 && status < 300) return false;
    
    // 4xx - Client errors (mostly not retryable)
    if (status >= 400 && status < 500) {
      // Retryable client errors
      return status === 408 || status === 429;
    }
    
    // 5xx - Server errors (retryable)
    if (status >= 500) return true;
    
    // Other statuses
    return false;
  }

  /**
   * Sets up network connectivity listeners
   */
  private setupNetworkListeners() {
    this.offlineListener = () => {
      // Network went offline - silent handling for production
      this.setState({ offlineMode: true });
    };

    this.onlineListener = () => {
      // Network came back online - silent handling for production
      this.setState({ offlineMode: false });
      
      // Retry if we had an error and network is back
      if (this.state.hasError && this.canRetry()) {
        this.scheduleRetry();
      }
    };

    window.addEventListener('offline', this.offlineListener);
    window.addEventListener('online', this.onlineListener);
    
    // Set initial state
    this.setState({ offlineMode: !navigator.onLine });
  }

  /**
   * Determines if error can be retried
   */
  private canRetry(): boolean {
    const { maxRetries = 3 } = this.props;
    const { retryCount, error, offlineMode, rateLimited } = this.state;

    // Check retry count
    if (retryCount >= maxRetries) return false;
    
    // Don't retry if offline (unless it's a network error)
    if (offlineMode && this.state.errorCategory !== 'network') return false;
    
    // Don't retry rate limited requests immediately
    if (rateLimited) return false;

    // Check if error is retryable
    return error?.retryable ?? false;
  }

  /**
   * Schedules automatic retry dengan exponential backoff
   */
  private scheduleRetry() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }

    const { retryDelay = 1000 } = this.props;
    const { retryCount, rateLimited } = this.state;
    
    // Calculate delay dengan exponential backoff
    let delay = retryDelay * Math.pow(2, retryCount);
    
    // For rate limiting, use longer delay
    if (rateLimited) {
      delay = Math.max(delay, 30000); // Min 30 seconds for rate limiting
    }

    // Max delay of 30 seconds
    delay = Math.min(delay, 30000);

    // Scheduling retry - silent handling for production

    this.setState({ 
      isRetrying: true,
      lastRetryTime: Date.now() + delay,
    });

    this.retryTimer = setTimeout(() => {
      this.executeRetry();
    }, delay);
  }

  /**
   * Executes retry attempt
   */
  private executeRetry() {
    const { errorId, retryCount } = this.state;
    
    // Executing retry attempt - silent handling for production

    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: prevState.retryCount + 1,
      isRetrying: false,
      lastRetryTime: 0,
      rateLimited: false, // Reset rate limiting on retry
    }));

    this.props.onRetry?.(errorId, retryCount + 1);
  }

  /**
   * Handles manual retry
   */
  private handleManualRetry = (): void => {
    if (this.canRetry()) {
      this.executeRetry();
    }
  };

  /**
   * Handles clearing error (continue without retry)
   */
  private handleClearError = (): void => {
    const { errorId } = this.state;
    // Clearing error state - silent handling for production
    
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      isRetrying: false,
      lastRetryTime: 0,
    });
  };

  /**
   * Gets contextual error message based on error category
   */
  private getErrorMessage(): { title: string; message: string; suggestion: string } {
    const { errorCategory, error, offlineMode } = this.state;

    if (offlineMode) {
      return {
        title: 'No Internet Connection',
        message: 'Your device appears to be offline. Please check your internet connection.',
        suggestion: 'The system will automatically retry when connection is restored.',
      };
    }

    switch (errorCategory) {
      case 'auth':
        return {
          title: 'Authentication Required',
          message: 'Your session has expired or you need to log in again.',
          suggestion: 'Please refresh the page to re-authenticate.',
        };
      
      case 'client':
        return {
          title: 'Request Error',
          message: error?.status === 404 
            ? 'The requested resource was not found.'
            : 'There was an issue with your request.',
          suggestion: 'Please try again or contact support if the issue persists.',
        };
      
      case 'server':
        return {
          title: 'Server Error',
          message: 'The server is experiencing issues and cannot process your request.',
          suggestion: 'The system will automatically retry. Please wait a moment.',
        };
      
      case 'network':
        return {
          title: 'Connection Error',
          message: 'Unable to reach the server. This might be a temporary network issue.',
          suggestion: 'Please check your connection and try again.',
        };
      
      case 'timeout':
        return {
          title: 'Request Timeout',
          message: 'The server took too long to respond.',
          suggestion: 'This is usually temporary. The system will retry automatically.',
        };
      
      default:
        return {
          title: 'Service Unavailable',
          message: 'An unexpected error occurred while communicating with the server.',
          suggestion: 'Please try again in a few moments.',
        };
    }
  }

  /**
   * Renders retry countdown
   */
  private renderRetryCountdown(): ReactNode {
    const { isRetrying, lastRetryTime } = this.state;
    
    if (!isRetrying || !lastRetryTime) return null;

    const remaining = Math.max(0, Math.ceil((lastRetryTime - Date.now()) / 1000));

    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        fontSize: '12px',
        color: '#6b7280',
      }}>
        <div 
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid #e5e7eb',
            borderTop: '2px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        Retrying in {remaining}s...
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  /**
   * Renders error UI dengan API-specific information
   */
  private renderErrorUI(): ReactNode {
    const { error, errorId, retryCount, offlineMode } = this.state;
    const { maxRetries = 3 } = this.props;
    const errorMsg = this.getErrorMessage();

    return (
      <div 
        className="api-error-boundary"
        style={{
          padding: '20px',
          border: '2px solid #f59e0b',
          borderRadius: '8px',
          backgroundColor: '#fffbeb',
          color: '#92400e',
          maxWidth: '500px',
          margin: '16px auto',
        }}
        role="alert"
        aria-labelledby="api-error-title"
        aria-describedby="api-error-description"
      >
        {/* Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <div 
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: offlineMode ? '#6b7280' : '#f59e0b',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '12px',
              fontSize: '12px',
            }}
          >
            {offlineMode ? '⚠' : '!'}
          </div>
          <div>
            <h3 
              id="api-error-title"
              style={{ 
                margin: '0 0 4px 0', 
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              {errorMsg.title}
            </h3>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>
              {error?.status && `HTTP ${error.status}`}
              {error?.endpoint && ` • ${error.endpoint}`}
              {` • ${errorId}`}
            </div>
          </div>
        </div>

        {/* Error Description */}
        <p 
          id="api-error-description"
          style={{ 
            margin: '0 0 8px 0', 
            fontSize: '14px',
            lineHeight: '1.4',
          }}
        >
          {errorMsg.message}
        </p>
        
        <p style={{ 
          margin: '0 0 16px 0', 
          fontSize: '12px',
          opacity: 0.8,
          fontStyle: 'italic',
        }}>
          {errorMsg.suggestion}
        </p>

        {/* Retry Countdown */}
        {this.renderRetryCountdown()}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          {this.canRetry() && (
            <button
              onClick={this.handleManualRetry}
              disabled={this.state.isRetrying}
              style={{
                padding: '8px 16px',
                backgroundColor: this.state.isRetrying ? '#d1d5db' : '#f59e0b',
                color: this.state.isRetrying ? '#6b7280' : 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: this.state.isRetrying ? 'not-allowed' : 'pointer',
                fontSize: '13px',
              }}
            >
              {this.state.isRetrying ? 'Retrying...' : `Try Again (${maxRetries - retryCount} left)`}
            </button>
          )}
          
          <button
            onClick={this.handleClearError}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Continue Anyway
          </button>
        </div>

        {/* Development Details */}
        {process.env.NODE_ENV === 'development' && error && (
          <details style={{ marginTop: '16px' }}>
            <summary style={{ cursor: 'pointer', fontSize: '11px', color: '#6b7280' }}>
              Technical Details
            </summary>
            <pre style={{ 
              marginTop: '8px', 
              fontSize: '10px',
              backgroundColor: '#f3f4f6', 
              padding: '8px',
              borderRadius: '4px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
            }}>
              Status: {error.status || 'N/A'}
              Method: {error.method || 'N/A'}
              Endpoint: {error.endpoint || 'N/A'}
              Message: {error.message}
              Retryable: {error.retryable ? 'Yes' : 'No'}
            </pre>
          </details>
        )}
      </div>
    );
  }

  componentWillUnmount() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
    
    if (this.offlineListener) {
      window.removeEventListener('offline', this.offlineListener);
    }
    
    if (this.onlineListener) {
      window.removeEventListener('online', this.onlineListener);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }
      
      return this.renderErrorUI();
    }

    return this.props.children;
  }
}

/**
 * HOC for wrapping components dengan API error boundary
 */
export const withAPIErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    enableAutoRetry?: boolean;
    maxRetries?: number;
    apiEndpoint?: string;
  }
) => {
  const WrappedComponent = (props: P) => (
    <APIErrorBoundary {...options}>
      <Component {...props} />
    </APIErrorBoundary>
  );

  WrappedComponent.displayName = `withAPIErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

export default APIErrorBoundary;