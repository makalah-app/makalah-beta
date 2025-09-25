// @ts-nocheck
/**
 * ERROR MANAGER - Task 08 Error Handling Implementation
 * 
 * Central error management system untuk handling, logging, dan recovery
 * coordination dengan intelligent error classification dan monitoring.
 * 
 * INTEGRATION:
 * - ZERO modifications to protected Task patterns
 * - Coordinates with all error boundaries
 * - Provides centralized error state management
 * - Maintains error history and analytics
 * 
 * FEATURES:
 * - Centralized error state management
 * - Error correlation and pattern detection
 * - Automatic recovery coordination
 * - Performance impact monitoring
 */

// ErrorReport interface defined inline
interface ErrorReport {
  errorId: string;
  title: string;
  description: string;
  reproductionSteps: string[];
  expectedBehavior: string;
  actualBehavior: string;
  userFeedback: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  tags: string[];
  diagnostics: Record<string, any>;
  timestamp: number;
}

export interface ManagedError {
  id: string;
  title: string;
  message: string;
  type: ErrorType;
  severity: ErrorSeverity;
  category: ErrorCategory;
  timestamp: number;
  resolved: boolean;
  retryCount: number;
  maxRetries: number;
  retryable: boolean;
  context: Record<string, any>;
  source: ErrorSource;
  stack?: string;
  diagnostics?: Record<string, any>;
  relatedErrors: string[];
  performanceImpact: PerformanceMetrics;
  recoveryActions: RecoveryAction[];
  userReported: boolean;
}

export type ErrorType = 'chat' | 'api' | 'streaming' | 'database' | 'file' | 'component' | 'network' | 'unknown';
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'functional' | 'performance' | 'security' | 'accessibility' | 'compatibility';
export type ErrorSource = 'boundary' | 'handler' | 'manual' | 'monitoring';

export interface PerformanceMetrics {
  memoryImpact: number;
  renderingDelay: number;
  networkDelay?: number;
  databaseDelay?: number;
  recoveryTime?: number;
}

export interface RecoveryAction {
  id: string;
  type: 'retry' | 'fallback' | 'reload' | 'reset' | 'custom';
  name: string;
  description: string;
  executed: boolean;
  success?: boolean;
  executedAt?: number;
  result?: any;
}

export interface ErrorPattern {
  id: string;
  pattern: RegExp;
  type: ErrorType;
  category: ErrorCategory;
  severity: ErrorSeverity;
  retryable: boolean;
  description: string;
  suggestedRecovery: RecoveryAction[];
}

export interface ErrorManagerConfig {
  maxErrorHistory: number;
  errorRetentionTime: number; // milliseconds
  enablePatternDetection: boolean;
  enableAutoRecovery: boolean;
  performanceThreshold: number;
  reportingEndpoint?: string;
}

/**
 * ErrorManager
 * 
 * Centralized error management dengan pattern detection,
 * automatic recovery, dan comprehensive monitoring.
 */
export class ErrorManager {
  private errors = new Map<string, ManagedError>();
  private errorHistory: string[] = [];
  private patterns: ErrorPattern[] = [];
  private subscribers = new Set<(error: ManagedError) => void>();
  private config: ErrorManagerConfig;
  private performanceObserver?: PerformanceObserver;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<ErrorManagerConfig> = {}) {
    this.config = {
      maxErrorHistory: 100,
      errorRetentionTime: 24 * 60 * 60 * 1000, // 24 hours
      enablePatternDetection: true,
      enableAutoRecovery: true,
      performanceThreshold: 100, // ms
      ...config,
    };

    this.initializePatterns();
    this.setupPerformanceMonitoring();
    this.scheduleCleanup();
  }

  /**
   * Registers an error dengan the manager
   */
  register(
    error: Error,
    context: {
      type?: ErrorType;
      source?: ErrorSource;
      component?: string;
      userId?: string;
      additionalContext?: Record<string, any>;
    } = {}
  ): ManagedError {
    const errorId = this.generateErrorId();
    const detectedPattern = this.detectPattern(error);
    const performanceMetrics = this.measurePerformanceImpact();

    const managedError: ManagedError = {
      id: errorId,
      title: this.generateTitle(error, detectedPattern),
      message: error.message,
      type: context.type || detectedPattern?.type || this.inferType(error),
      severity: detectedPattern?.severity || this.inferSeverity(error),
      category: detectedPattern?.category || this.inferCategory(error),
      timestamp: Date.now(),
      resolved: false,
      retryCount: 0,
      maxRetries: this.getMaxRetries(error, detectedPattern),
      retryable: detectedPattern?.retryable ?? this.isRetryable(error),
      context: {
        component: context.component,
        userId: context.userId,
        userAgent: navigator.userAgent,
        url: window.location.href,
        ...context.additionalContext,
      },
      source: context.source || 'boundary',
      stack: error.stack,
      diagnostics: this.collectDiagnostics(error),
      relatedErrors: this.findRelatedErrors(error),
      performanceImpact: performanceMetrics,
      recoveryActions: detectedPattern?.suggestedRecovery || this.generateRecoveryActions(error),
      userReported: false,
    };

    // Store error
    this.errors.set(errorId, managedError);
    this.errorHistory.unshift(errorId);

    // Trim history if needed
    if (this.errorHistory.length > this.config.maxErrorHistory) {
      const removedId = this.errorHistory.pop();
      if (removedId) {
        this.errors.delete(removedId);
      }
    }

    // Notify subscribers
    this.notifySubscribers(managedError);

    // Auto-recovery if enabled
    if (this.config.enableAutoRecovery && managedError.retryable) {
      this.scheduleAutoRecovery(errorId);
    }

    console.log(`[ErrorManager] Registered error ${errorId}:`, managedError);
    return managedError;
  }

  /**
   * Updates an existing error
   */
  update(errorId: string, updates: Partial<ManagedError>): ManagedError | null {
    const error = this.errors.get(errorId);
    if (!error) return null;

    const updatedError = { ...error, ...updates };
    this.errors.set(errorId, updatedError);
    this.notifySubscribers(updatedError);

    return updatedError;
  }

  /**
   * Marks an error as resolved
   */
  resolve(errorId: string, resolution?: { method: string; data?: any }): boolean {
    const error = this.errors.get(errorId);
    if (!error) return false;

    const resolvedError = {
      ...error,
      resolved: true,
      context: {
        ...error.context,
        resolution,
        resolvedAt: Date.now(),
      },
    };

    this.errors.set(errorId, resolvedError);
    this.notifySubscribers(resolvedError);
    
    console.log(`[ErrorManager] Resolved error ${errorId}:`, resolution);
    return true;
  }

  /**
   * Attempts recovery for an error
   */
  async attemptRecovery(errorId: string, actionId?: string): Promise<boolean> {
    const error = this.errors.get(errorId);
    if (!error || error.resolved) return false;

    const action = actionId 
      ? error.recoveryActions.find(a => a.id === actionId)
      : error.recoveryActions[0];

    if (!action || action.executed) return false;

    try {
      console.log(`[ErrorManager] Attempting recovery for ${errorId} with action ${action.id}`);
      
      const startTime = performance.now();
      const result = await this.executeRecoveryAction(action, error);
      const recoveryTime = performance.now() - startTime;

      // Update action
      const updatedAction = {
        ...action,
        executed: true,
        success: true,
        executedAt: Date.now(),
        result,
      };

      // Update error
      this.update(errorId, {
        retryCount: error.retryCount + 1,
        recoveryActions: error.recoveryActions.map(a => 
          a.id === action.id ? updatedAction : a
        ),
        performanceImpact: {
          ...error.performanceImpact,
          recoveryTime,
        },
      });

      return true;
    } catch (recoveryError) {
      console.error(`[ErrorManager] Recovery failed for ${errorId}:`, recoveryError);
      
      // Update action as failed
      const failedAction = {
        ...action,
        executed: true,
        success: false,
        executedAt: Date.now(),
        result: recoveryError,
      };

      this.update(errorId, {
        retryCount: error.retryCount + 1,
        recoveryActions: error.recoveryActions.map(a => 
          a.id === action.id ? failedAction : a
        ),
      });

      return false;
    }
  }

  /**
   * Handles user error reports
   */
  handleUserReport(report: ErrorReport): string {
    const errorId = report.errorId || this.generateErrorId();
    let error = this.errors.get(errorId);

    if (!error) {
      // Create new error dari user report
      error = {
        id: errorId,
        title: report.title,
        message: report.description,
        type: (report.category as ErrorType) || 'unknown',
        severity: report.severity,
        category: 'functional',
        timestamp: report.timestamp,
        resolved: false,
        retryCount: 0,
        maxRetries: 3,
        retryable: true,
        context: {
          userReport: true,
          reproductionSteps: report.reproductionSteps,
          expectedBehavior: report.expectedBehavior,
          actualBehavior: report.actualBehavior,
          userFeedback: report.userFeedback,
        },
        source: 'manual',
        diagnostics: report.diagnostics,
        relatedErrors: [],
        performanceImpact: {
          memoryImpact: 0,
          renderingDelay: 0,
        },
        recoveryActions: [],
        userReported: true,
      };

      this.errors.set(errorId, error);
    } else {
      // Update existing error dengan user report
      this.update(errorId, {
        userReported: true,
        context: {
          ...error.context,
          userReport: report,
        },
      });
    }

    // Send to reporting endpoint if configured
    if (this.config.reportingEndpoint) {
      this.sendToReportingEndpoint(report);
    }

    return errorId;
  }

  /**
   * Gets error by ID
   */
  getError(errorId: string): ManagedError | null {
    return this.errors.get(errorId) || null;
  }

  /**
   * Gets all active errors
   */
  getActiveErrors(): ManagedError[] {
    return Array.from(this.errors.values()).filter(error => !error.resolved);
  }

  /**
   * Gets errors by criteria
   */
  getErrors(criteria: {
    type?: ErrorType;
    severity?: ErrorSeverity;
    resolved?: boolean;
    limit?: number;
  } = {}): ManagedError[] {
    let results = Array.from(this.errors.values());

    if (criteria.type) {
      results = results.filter(error => error.type === criteria.type);
    }

    if (criteria.severity) {
      results = results.filter(error => error.severity === criteria.severity);
    }

    if (criteria.resolved !== undefined) {
      results = results.filter(error => error.resolved === criteria.resolved);
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => b.timestamp - a.timestamp);

    if (criteria.limit) {
      results = results.slice(0, criteria.limit);
    }

    return results;
  }

  /**
   * Gets error statistics
   */
  getStatistics(): {
    total: number;
    active: number;
    resolved: number;
    byType: Record<ErrorType, number>;
    bySeverity: Record<ErrorSeverity, number>;
    averageRecoveryTime: number;
    successfulRecoveries: number;
    failedRecoveries: number;
  } {
    const errors = Array.from(this.errors.values());
    const active = errors.filter(e => !e.resolved);
    const resolved = errors.filter(e => e.resolved);
    
    const byType = errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<ErrorType, number>);

    const bySeverity = errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    const recoveryTimes = errors
      .map(e => e.performanceImpact.recoveryTime)
      .filter(t => t !== undefined) as number[];
    
    const averageRecoveryTime = recoveryTimes.length > 0 
      ? recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length 
      : 0;

    const successfulRecoveries = errors.filter(e => 
      e.recoveryActions.some(a => a.executed && a.success)
    ).length;

    const failedRecoveries = errors.filter(e => 
      e.recoveryActions.some(a => a.executed && !a.success)
    ).length;

    return {
      total: errors.length,
      active: active.length,
      resolved: resolved.length,
      byType,
      bySeverity,
      averageRecoveryTime,
      successfulRecoveries,
      failedRecoveries,
    };
  }

  /**
   * Subscribes to error events
   */
  subscribe(callback: (error: ManagedError) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Clears old errors
   */
  cleanup(): void {
    const cutoffTime = Date.now() - this.config.errorRetentionTime;
    const toRemove: string[] = [];

    this.errors.forEach((error, id) => {
      if (error.timestamp < cutoffTime && error.resolved) {
        toRemove.push(id);
      }
    });

    toRemove.forEach(id => {
      this.errors.delete(id);
      this.errorHistory = this.errorHistory.filter(errorId => errorId !== id);
    });

    console.log(`[ErrorManager] Cleaned up ${toRemove.length} old errors`);
  }

  /**
   * Initializes error patterns
   */
  private initializePatterns(): void {
    this.patterns = [
      {
        id: 'chunk-load-error',
        pattern: /Loading chunk \d+ failed/i,
        type: 'component',
        category: 'performance',
        severity: 'high',
        retryable: true,
        description: 'JavaScript chunk loading failed',
        suggestedRecovery: [
          {
            id: 'reload-page',
            type: 'reload',
            name: 'Reload Page',
            description: 'Reload the page to retry chunk loading',
            executed: false,
          },
        ],
      },
      {
        id: 'network-error',
        pattern: /fetch|network|connection|timeout/i,
        type: 'network',
        category: 'functional',
        severity: 'medium',
        retryable: true,
        description: 'Network connectivity issue',
        suggestedRecovery: [
          {
            id: 'retry-request',
            type: 'retry',
            name: 'Retry Request',
            description: 'Attempt the request again',
            executed: false,
          },
        ],
      },
      {
        id: 'auth-error',
        pattern: /unauthorized|forbidden|authentication|auth/i,
        type: 'api',
        category: 'security',
        severity: 'high',
        retryable: false,
        description: 'Authentication or authorization error',
        suggestedRecovery: [
          {
            id: 'refresh-auth',
            type: 'custom',
            name: 'Refresh Authentication',
            description: 'Attempt to refresh authentication',
            executed: false,
          },
        ],
      },
      {
        id: 'database-error',
        pattern: /rls|row level security|postgres|database|pgrst/i,
        type: 'database',
        category: 'functional',
        severity: 'high',
        retryable: true,
        description: 'Database operation error',
        suggestedRecovery: [
          {
            id: 'retry-query',
            type: 'retry',
            name: 'Retry Query',
            description: 'Attempt database operation again',
            executed: false,
          },
        ],
      },
    ];
  }

  /**
   * Detects error patterns
   */
  private detectPattern(error: Error): ErrorPattern | null {
    if (!this.config.enablePatternDetection) return null;

    const message = `${error.name} ${error.message} ${error.stack || ''}`;
    
    return this.patterns.find(pattern => pattern.pattern.test(message)) || null;
  }

  /**
   * Various helper methods
   */
  private generateErrorId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTitle(error: Error, pattern?: ErrorPattern | null): string {
    if (pattern) return pattern.description;
    return error.name || 'Unknown Error';
  }

  private inferType(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    
    if (message.includes('fetch') || message.includes('network')) return 'network';
    if (message.includes('chunk')) return 'component';
    if (message.includes('database') || message.includes('rls')) return 'database';
    if (message.includes('stream')) return 'streaming';
    if (message.includes('file') || message.includes('upload')) return 'file';
    if (message.includes('api')) return 'api';
    if (message.includes('chat')) return 'chat';
    
    return 'unknown';
  }

  private inferSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();
    
    if (message.includes('critical') || message.includes('chunk') || message.includes('auth')) {
      return 'critical';
    }
    if (message.includes('network') || message.includes('database')) {
      return 'high';
    }
    if (message.includes('timeout') || message.includes('retry')) {
      return 'medium';
    }
    
    return 'low';
  }

  private inferCategory(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    
    if (message.includes('auth') || message.includes('permission')) return 'security';
    if (message.includes('timeout') || message.includes('slow')) return 'performance';
    if (message.includes('accessible') || message.includes('aria')) return 'accessibility';
    if (message.includes('browser') || message.includes('compatibility')) return 'compatibility';
    
    return 'functional';
  }

  private isRetryable(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Non-retryable errors
    if (message.includes('unauthorized') || message.includes('forbidden')) return false;
    if (message.includes('invalid') || message.includes('malformed')) return false;
    if (message.includes('not found') && !message.includes('network')) return false;
    
    // Retryable errors
    if (message.includes('timeout') || message.includes('network')) return true;
    if (message.includes('chunk') || message.includes('loading')) return true;
    if (message.includes('connection')) return true;
    
    return false;
  }

  private getMaxRetries(error: Error, pattern?: ErrorPattern | null): number {
    if (pattern?.type === 'network') return 5;
    if (pattern?.type === 'database') return 3;
    if (pattern?.type === 'component') return 2;
    
    return 3;
  }

  private collectDiagnostics(error: Error): Record<string, any> {
    return {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      memory: 'memory' in performance ? (performance as any).memory : null,
      connection: 'connection' in navigator ? (navigator as any).connection : null,
      errorName: error.name,
      errorMessage: error.message,
      stackTrace: error.stack,
    };
  }

  private findRelatedErrors(error: Error): string[] {
    // Find errors dengan similar messages atau types
    const related: string[] = [];
    const errorMessage = error.message.toLowerCase();
    
    this.errors.forEach((managedError, id) => {
      if (managedError.message.toLowerCase().includes(errorMessage) || 
          errorMessage.includes(managedError.message.toLowerCase())) {
        related.push(id);
      }
    });
    
    return related;
  }

  private measurePerformanceImpact(): PerformanceMetrics {
    const metrics: PerformanceMetrics = {
      memoryImpact: 0,
      renderingDelay: 0,
    };

    if ('memory' in performance) {
      metrics.memoryImpact = (performance as any).memory.usedJSHeapSize || 0;
    }

    // Get latest navigation timing
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      metrics.renderingDelay = navigation.loadEventEnd - navigation.navigationStart;
    }

    return metrics;
  }

  private generateRecoveryActions(error: Error): RecoveryAction[] {
    const actions: RecoveryAction[] = [];
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      actions.push({
        id: 'retry-request',
        type: 'retry',
        name: 'Retry Request',
        description: 'Attempt the network request again',
        executed: false,
      });
    }

    if (message.includes('chunk') || message.includes('loading')) {
      actions.push({
        id: 'reload-page',
        type: 'reload',
        name: 'Reload Page',
        description: 'Reload the entire page',
        executed: false,
      });
    }

    if (message.includes('database') || message.includes('rls')) {
      actions.push({
        id: 'retry-db-operation',
        type: 'retry',
        name: 'Retry Database Operation',
        description: 'Attempt the database operation again',
        executed: false,
      });
    }

    // Default fallback action
    if (actions.length === 0) {
      actions.push({
        id: 'generic-retry',
        type: 'retry',
        name: 'Try Again',
        description: 'Attempt the operation again',
        executed: false,
      });
    }

    return actions;
  }

  private notifySubscribers(error: ManagedError): void {
    this.subscribers.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('[ErrorManager] Subscriber callback failed:', callbackError);
      }
    });
  }

  private scheduleAutoRecovery(errorId: string): void {
    setTimeout(() => {
      const error = this.errors.get(errorId);
      if (error && !error.resolved && error.retryCount < error.maxRetries) {
        this.attemptRecovery(errorId);
      }
    }, 2000); // 2 second delay
  }

  private async executeRecoveryAction(action: RecoveryAction, error: ManagedError): Promise<any> {
    switch (action.type) {
      case 'retry':
        // Implement retry logic based on error type
        return Promise.resolve({ success: true, method: 'retry' });
      
      case 'reload':
        window.location.reload();
        return Promise.resolve({ success: true, method: 'reload' });
      
      case 'reset':
        // Clear application state
        sessionStorage.clear();
        return Promise.resolve({ success: true, method: 'reset' });
      
      case 'fallback':
        // Switch to fallback mode
        return Promise.resolve({ success: true, method: 'fallback' });
      
      default:
        throw new Error(`Unknown recovery action type: ${action.type}`);
    }
  }

  private setupPerformanceMonitoring(): void {
    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.duration > this.config.performanceThreshold) {
            console.warn(`[ErrorManager] Performance threshold exceeded: ${entry.name} took ${entry.duration}ms`);
          }
        });
      });

      this.performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });
    } catch (e) {
      console.warn('[ErrorManager] Performance monitoring not available');
    }
  }

  private scheduleCleanup(): void {
    // Cleanup every hour
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
  }

  private async sendToReportingEndpoint(report: ErrorReport): Promise<void> {
    if (!this.config.reportingEndpoint) return;

    try {
      await fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      });
    } catch (error) {
      console.error('[ErrorManager] Failed to send report to endpoint:', error);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.subscribers.clear();
    this.errors.clear();
    this.errorHistory = [];
  }
}

// Global instance
export const errorManager = new ErrorManager({
  maxErrorHistory: 200,
  enablePatternDetection: true,
  enableAutoRecovery: true,
  performanceThreshold: 100,
});

export default ErrorManager;
