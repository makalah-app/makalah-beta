/**
 * Auth Error Monitoring System
 *
 * Implements comprehensive error tracking, categorization, and analysis
 * for authentication-related issues to prevent silent failures.
 *
 * FOLLOW: global_policy.xml principles
 * - Simple, maintainable, pragmatic solutions
 * - No over-engineering
 * - Production-ready error handling
 */

import { debugLog } from '@/lib/utils/debug-log';

// Error categories for better analysis
export enum AuthErrorCategory {
  SESSION_EXPIRED = 'session_expired',
  TOKEN_REFRESH_FAILED = 'token_refresh_failed',
  SESSION_VALIDATION_FAILED = 'session_validation_failed',
  USER_NOT_FOUND = 'user_not_found',
  USER_DISABLED = 'user_disabled',
  NETWORK_ERROR = 'network_error',
  MIDDLEWARE_ERROR = 'middleware_error',
  CLIENT_STORAGE_ERROR = 'client_storage_error',
  UNKNOWN_ERROR = 'unknown_error'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Auth error interface
export interface AuthError {
  id: string;
  category: AuthErrorCategory;
  severity: ErrorSeverity;
  message: string;
  timestamp: number;
  userId?: string;
  context?: Record<string, any>;
  stack?: string;
  resolved: boolean;
  resolvedAt?: number;
}

// Error trend analysis
interface ErrorTrend {
  category: AuthErrorCategory;
  count: number;
  firstOccurrence: number;
  lastOccurrence: number;
  frequency: number; // errors per hour
}

class AuthErrorMonitor {
  private errors: Map<string, AuthError> = new Map();
  private trends: Map<AuthErrorCategory, ErrorTrend> = new Map();
  private maxStoredErrors = 100; // Keep last 100 errors
  private readonly errorRetentionMs = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Record an authentication error with full context
   */
  recordError(error: AuthError): void {
    try {
      // Generate unique error ID
      const errorId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const enrichedError: AuthError = {
        ...error,
        id: errorId,
        timestamp: Date.now(),
        resolved: false
      };

      // Store error
      this.errors.set(errorId, enrichedError);

      // Update trends
      this.updateTrends(error.category);

      // Cleanup old errors
      this.cleanupOldErrors();

      // Log for debugging
      debugLog('auth:monitor:error', 'recorded', {
        errorId,
        category: error.category,
        severity: error.severity,
        message: error.message,
        userId: error.userId
      });

      // Store in localStorage for persistence across reloads
      this.persistError(enrichedError);

    } catch (monitoringError) {
      debugLog('auth:monitor:exception', 'failed', monitoringError instanceof Error ? monitoringError.message : 'Unknown monitoring error');
    }
  }

  /**
   * Mark an error as resolved
   */
  resolveError(errorId: string, resolution?: string): void {
    const error = this.errors.get(errorId);
    if (error) {
      error.resolved = true;
      error.resolvedAt = Date.now();

      debugLog('auth:monitor:resolved', 'resolved', {
        errorId,
        category: error.category,
        resolution
      });

      this.persistError(error);
    }
  }

  /**
   * Get recent errors for analysis
   */
  getRecentErrors(limit: number = 10): AuthError[] {
    const now = Date.now();
    return Array.from(this.errors.values())
      .filter(error => !error.resolved && (now - error.timestamp) < this.errorRetentionMs)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get error trends for analysis
   */
  getErrorTrends(): Map<AuthErrorCategory, ErrorTrend> {
    return new Map(this.trends.entries());
  }

  /**
   * Check if error rate is critical
   */
  isErrorRateCritical(): boolean {
    const recentErrors = this.getRecentErrors(20); // Last 20 errors
    const criticalErrors = recentErrors.filter(error =>
      error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH
    );

    // Critical if more than 5 critical errors in last hour
    return criticalErrors.length >= 5;
  }

  /**
   * Get error summary for dashboard
   */
  getErrorSummary(): {
    totalErrors: number;
    unresolvedErrors: number;
    criticalErrors: number;
    errorsByCategory: Record<AuthErrorCategory, number>;
    topCategories: Array<{ category: AuthErrorCategory; count: number }>;
  } {
    const now = Date.now();
    const recentErrors = Array.from(this.errors.values()).filter(error =>
      !error.resolved && (now - error.timestamp) < this.errorRetentionMs
    );

    const errorsByCategory: Record<AuthErrorCategory, number> = {} as any;
    const categoryCounts = new Map<AuthErrorCategory, number>();

    recentErrors.forEach(error => {
      categoryCounts.set(error.category, (categoryCounts.get(error.category) || 0) + 1);
      errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + 1;
    });

    const topCategories = Array.from(categoryCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalErrors: recentErrors.length,
      unresolvedErrors: recentErrors.filter(e => !e.resolved).length,
      criticalErrors: recentErrors.filter(e => e.severity === ErrorSeverity.CRITICAL).length,
      errorsByCategory,
      topCategories
    };
  }

  /**
   * Update error trends for analysis
   */
  private updateTrends(category: AuthErrorCategory): void {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    // Get errors in this category from last hour
    const categoryErrors = Array.from(this.errors.values()).filter(error =>
      error.category === category &&
      !error.resolved &&
      error.timestamp > oneHourAgo
    );

    const currentTrend = this.trends.get(category) || {
      category,
      count: 0,
      firstOccurrence: now,
      lastOccurrence: now,
      frequency: 0
    };

    // Update trend data
    if (categoryErrors.length > 0) {
      const timestamps = categoryErrors.map(e => e.timestamp);
      const firstOccurrence = Math.min(...timestamps);
      const lastOccurrence = Math.max(...timestamps);

      this.trends.set(category, {
        category,
        count: categoryErrors.length,
        firstOccurrence,
        lastOccurrence,
        frequency: categoryErrors.length // per hour
      });
    }
  }

  /**
   * Clean up old errors to prevent memory leaks
   */
  private cleanupOldErrors(): void {
    const cutoffTime = Date.now() - this.errorRetentionMs;

    for (const [errorId, error] of this.errors.entries()) {
      if (error.timestamp < cutoffTime) {
        this.errors.delete(errorId);
      }
    }

    // Keep only the most recent maxStoredErrors
    if (this.errors.size > this.maxStoredErrors) {
      const sortedErrors = Array.from(this.errors.entries())
        .sort(([, a], [, b]) => b.timestamp - a.timestamp)
        .slice(this.maxStoredErrors);

      this.errors.clear();
      sortedErrors.forEach(([id, error]) => {
        this.errors.set(id, error);
      });
    }
  }

  /**
   * Persist error to localStorage for cross-session tracking
   */
  private persistError(error: AuthError): void {
    try {
      if (typeof window !== 'undefined') {
        const storedErrors = this.getStoredErrors();
        storedErrors.push(error);

        // Keep only last 50 errors in localStorage
        const recentErrors = storedErrors
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(-50);

        localStorage.setItem('auth_errors', JSON.stringify(recentErrors));
      }
    } catch (storageError) {
      debugLog('auth:monitor:storage-error', 'failed', storageError instanceof Error ? storageError.message : 'Unknown storage error');
    }
  }

  /**
   * Load stored errors from localStorage
   */
  private getStoredErrors(): AuthError[] {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem('auth_errors');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
}

// Global singleton instance
export const authErrorMonitor = new AuthErrorMonitor();

// Convenience exports
export const recordAuthError = (error: Omit<AuthError, 'id' | 'timestamp' | 'resolved' | 'resolvedAt'>) => {
  authErrorMonitor.recordError(error as AuthError);
};

export const resolveAuthError = (errorId: string, resolution?: string) => {
  authErrorMonitor.resolveError(errorId, resolution);
};

export const getAuthErrorSummary = () => {
  return authErrorMonitor.getErrorSummary();
};

export const isAuthErrorRateCritical = () => {
  return authErrorMonitor.isErrorRateCritical();
};