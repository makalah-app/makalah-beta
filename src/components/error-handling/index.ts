/**
 * ERROR HANDLING COMPONENTS INDEX - Task 08 Error Handling Implementation
 * 
 * Central export untuk all error handling components, utilities, dan integrations.
 * Provides comprehensive error handling solution untuk Makalah AI application.
 * 
 * INTEGRATION:
 * - ZERO modifications to protected Task patterns
 * - Exports all error boundary components
 * - Provides utility functions dan hooks
 * - Maintains clean import structure
 */

// Error Boundary Components
export { default as ChatErrorBoundary, withChatErrorBoundary } from './ChatErrorBoundary';
export { default as APIErrorBoundary, withAPIErrorBoundary } from './APIErrorBoundary';
export { default as StreamingErrorBoundary, withStreamingErrorBoundary } from './StreamingErrorBoundary';
export { default as DatabaseErrorBoundary, withDatabaseErrorBoundary } from './DatabaseErrorBoundary';
export { default as FileErrorBoundary, withFileErrorBoundary } from './FileErrorBoundary';
export { default as UniversalErrorBoundary, withUniversalErrorBoundary } from './UniversalErrorBoundary';

// Error Handling Components
export { default as ErrorNotification, useErrorNotifications, ErrorNotificationContainer } from './ErrorNotification';
export { default as ErrorRecoveryModal } from './ErrorRecoveryModal';
export { default as ErrorReportingPanel } from './ErrorReportingPanel';

// Integration Components
export { default as ChatErrorIntegration, ChatErrorProvider } from './ChatErrorIntegration';

// Error Management & Utilities
export { default as ErrorManager, errorManager } from '../../lib/error-handling/ErrorManager';
export { default as ErrorLogger, errorLogger } from '../../lib/error-handling/ErrorLogger';
export * from '../../lib/error-handling/error-utils';

// File Upload Error Handling (from existing implementation)
export * from '../../lib/ai/error-handling/file-upload-errors';

// Types
export type {
  ErrorReport,
} from './ErrorReportingPanel';

export type {
  ManagedError,
  ErrorType,
  ErrorSeverity,
  ErrorCategory,
  RecoveryAction,
} from '../../lib/error-handling/ErrorManager';

export type {
  EnhancedError,
  ErrorClassification,
  RecoverySuggestion,
  DiagnosticInfo,
} from '../../lib/error-handling/error-utils';

/**
 * Main Error Handling Setup Function
 *
 * Initializes comprehensive error handling untuk the application.
 * Call this once dalam your app's root component.
 */
/*
export function setupErrorHandling(config?: {
  enableLogging?: boolean;
  enableReporting?: boolean;
  enablePerformanceTracking?: boolean;
  userId?: string;
  environment?: string;
}) {
  // Function commented out to fix build errors
  // TODO: Implement proper error handling setup
}
*/

/**
 * Error Handling Configuration untuk Chat Components
 *
 * Pre-configured error boundaries untuk chat functionality.
 */
/*
export const ChatErrorConfig = {
  // Individual component wrappers
  StreamingWrapper: withStreamingErrorBoundary,
  APIWrapper: withAPIErrorBoundary,
  DatabaseWrapper: withDatabaseErrorBoundary,
  FileWrapper: withFileErrorBoundary,
  ChatWrapper: withChatErrorBoundary,
};
*/

/**
 * Error Handling Hooks
 */
export { useChatErrorHandling } from './ChatErrorIntegration';

/**
 * Utility Functions
 */
export {
  classifyError,
  generateRecoverySuggestions,
  collectDiagnostics,
  enhanceError,
  shouldReportError,
  formatErrorForUser,
  createDebouncedErrorHandler,
} from '../../lib/error-handling/error-utils';

/**
 * Constants
 */
export const ERROR_HANDLING_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  NOTIFICATION_TIMEOUT: 5000,
  BATCH_SIZE: 25,
  PERFORMANCE_THRESHOLD: 100,
} as const;

export const ERROR_TYPES = {
  CHAT: 'chat',
  API: 'api',
  STREAMING: 'streaming',
  DATABASE: 'database',
  FILE: 'file',
  COMPONENT: 'component',
  NETWORK: 'network',
  UNKNOWN: 'unknown',
} as const;

export const ERROR_SEVERITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;