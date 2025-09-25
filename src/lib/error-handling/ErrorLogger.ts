/* @ts-nocheck */
/**
 * ERROR LOGGER - Task 08 Error Handling Implementation
 * 
 * Comprehensive error logging system dengan structured logging,
 * performance monitoring, dan intelligent log management.
 * 
 * INTEGRATION:
 * - ZERO modifications to protected Task patterns
 * - Provides centralized logging untuk all error boundaries
 * - Supports multiple log destinations
 * - Maintains log performance and storage efficiency
 * 
 * FEATURES:
 * - Structured error logging dengan context
 * - Performance impact monitoring
 * - Log level management and filtering
 * - Batch logging for efficiency
 */

interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
    cause?: any;
  };
  context: LogContext;
  metadata: LogMetadata;
  tags: string[];
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';
type LogCategory = 'error' | 'performance' | 'security' | 'user-action' | 'system' | 'api';

interface LogContext {
  userId?: string;
  sessionId: string;
  chatId?: string;
  component?: string;
  action?: string;
  url: string;
  userAgent: string;
  timestamp: number;
  additional?: Record<string, any>;
}

interface LogMetadata {
  source: 'boundary' | 'handler' | 'manual' | 'system';
  environment: string;
  version?: string;
  buildId?: string;
  performanceImpact: {
    memoryDelta?: number;
    timeDelta?: number;
    cpuUsage?: number;
  };
  correlationId?: string;
  parentId?: string;
}

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  enableRemote: boolean;
  enablePerformanceTracking: boolean;
  batchSize: number;
  batchInterval: number; // milliseconds
  maxStorageEntries: number;
  remoteEndpoint?: string;
  remoteHeaders?: Record<string, string>;
  excludePatterns?: RegExp[];
  includeStackTrace: boolean;
  enableSampling: boolean;
  samplingRate: number; // 0-1
}

/**
 * ErrorLogger
 * 
 * Advanced logging system dengan structured logging, batching,
 * performance monitoring, dan multiple destinations.
 */
export class ErrorLogger {
  private config: LoggerConfig;
  private logQueue: LogEntry[] = [];
  private batchTimer?: NodeJS.Timeout;
  private sessionId: string;
  private performanceBaseline: {
    memory: number;
    timestamp: number;
  };
  private logCounts = new Map<string, number>();
  private lastFlush = Date.now();

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: 'info',
      enableConsole: true,
      enableStorage: true,
      enableRemote: false,
      enablePerformanceTracking: true,
      batchSize: 50,
      batchInterval: 5000, // 5 seconds
      maxStorageEntries: 1000,
      includeStackTrace: true,
      enableSampling: true,
      samplingRate: 1.0, // Log all by default
      excludePatterns: [
        /non-passive/i,
        /deprecated/i,
        /ResizeObserver.*loop/i,
      ],
      ...config,
    };

    this.sessionId = this.generateSessionId();
    this.performanceBaseline = this.capturePerformanceBaseline();
    
    this.setupBatchProcessing();
    this.setupUnloadHandler();
    
    console.log('[ErrorLogger] Initialized dengan config:', this.config);
  }

  /**
   * Logs an error dengan full context
   */
  logError(
    error: Error,
    context: Partial<LogContext> = {},
    metadata: Partial<LogMetadata> = {}
  ): string {
    return this.log('error', 'error', error.message, {
      error: {
        name: error.name,
        message: error.message,
        stack: this.config.includeStackTrace ? error.stack : undefined,
        cause: (error as any).cause,
      },
      context: {
        ...context,
        sessionId: this.sessionId,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      },
      metadata: {
        source: 'handler',
        environment: process.env.NODE_ENV || 'production',
        performanceImpact: this.calculatePerformanceImpact(),
        ...metadata,
      },
    });
  }

  /**
   * Logs a warning
   */
  logWarning(
    message: string,
    context: Partial<LogContext> = {},
    metadata: Partial<LogMetadata> = {}
  ): string {
    return this.log('warn', 'system', message, { context, metadata });
  }

  /**
   * Logs informational message
   */
  logInfo(
    message: string,
    category: LogCategory = 'system',
    context: Partial<LogContext> = {},
    metadata: Partial<LogMetadata> = {}
  ): string {
    return this.log('info', category, message, { context, metadata });
  }

  /**
   * Logs debug information
   */
  logDebug(
    message: string,
    context: Partial<LogContext> = {},
    metadata: Partial<LogMetadata> = {}
  ): string {
    return this.log('debug', 'system', message, { context, metadata });
  }

  /**
   * Logs critical errors
   */
  logCritical(
    error: Error,
    context: Partial<LogContext> = {},
    metadata: Partial<LogMetadata> = {}
  ): string {
    const logId = this.log('critical', 'error', error.message, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: (error as any).cause,
      },
      context: {
        ...context,
        sessionId: this.sessionId,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      },
      metadata: {
        source: 'handler',
        environment: process.env.NODE_ENV || 'production',
        performanceImpact: this.calculatePerformanceImpact(),
        ...metadata,
      },
    });

    // Critical errors are flushed immediately
    this.flushLogs();
    
    return logId;
  }

  /**
   * Logs performance metrics
   */
  logPerformance(
    metric: string,
    value: number,
    context: Partial<LogContext> = {}
  ): string {
    return this.log('info', 'performance', `Performance metric: ${metric} = ${value}ms`, {
      context: {
        ...context,
        action: 'performance-measurement',
      },
      metadata: {
        source: 'system',
        performanceImpact: {
          timeDelta: value,
          ...this.calculatePerformanceImpact(),
        },
      },
    });
  }

  /**
   * Logs user actions
   */
  logUserAction(
    action: string,
    context: Partial<LogContext> = {}
  ): string {
    return this.log('info', 'user-action', `User action: ${action}`, {
      context: {
        ...context,
        action,
      },
      metadata: {
        source: 'manual',
      },
    });
  }

  /**
   * Main logging method
   */
  private log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data: {
      error?: LogEntry['error'];
      context?: Partial<LogContext>;
      metadata?: Partial<LogMetadata>;
    } = {}
  ): string {
    // Check log level
    if (!this.shouldLog(level)) {
      return '';
    }

    // Check sampling
    if (!this.shouldSample()) {
      return '';
    }

    // Check exclude patterns
    if (this.isExcluded(message)) {
      return '';
    }

    const logId = this.generateLogId();
    const entry: LogEntry = {
      id: logId,
      timestamp: Date.now(),
      level,
      category,
      message,
      error: data.error,
      context: {
        sessionId: this.sessionId,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        ...data.context,
      },
      metadata: {
        source: 'manual',
        environment: process.env.NODE_ENV || 'production',
        performanceImpact: this.calculatePerformanceImpact(),
        correlationId: this.generateCorrelationId(),
        ...data.metadata,
      },
      tags: this.generateTags(level, category, data.context, data.error),
    };

    // Add to queue
    this.logQueue.push(entry);

    // Update counts
    const key = `${level}-${category}`;
    this.logCounts.set(key, (this.logCounts.get(key) || 0) + 1);

    // Console logging
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Check if immediate flush needed
    if (level === 'critical' || this.logQueue.length >= this.config.batchSize) {
      this.flushLogs();
    }

    return logId;
  }

  /**
   * Checks if message should be logged based on level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error', 'critical'];
    const configLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= configLevelIndex;
  }

  /**
   * Checks if message should be sampled
   */
  private shouldSample(): boolean {
    if (!this.config.enableSampling) return true;
    return Math.random() < this.config.samplingRate;
  }

  /**
   * Checks if message matches exclude patterns
   */
  private isExcluded(message: string): boolean {
    return this.config.excludePatterns?.some(pattern => pattern.test(message)) || false;
  }

  /**
   * Logs to browser console dengan structured format
   */
  private logToConsole(entry: LogEntry): void {
    const prefix = `[${entry.level.toUpperCase()}] [${entry.category}]`;
    const timestamp = new Date(entry.timestamp).toISOString();
    
    const logMethod = this.getConsoleMethod(entry.level);
    
    if (entry.error) {
      logMethod(
        `${prefix} ${timestamp}`,
        entry.message,
        '\nError:', entry.error,
        '\nContext:', entry.context,
        '\nMetadata:', entry.metadata
      );
    } else {
      logMethod(
        `${prefix} ${timestamp}`,
        entry.message,
        '\nContext:', entry.context,
        '\nMetadata:', entry.metadata
      );
    }
  }

  /**
   * Gets appropriate console method untuk log level
   */
  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case 'debug': return console.debug;
      case 'info': return console.info;
      case 'warn': return console.warn;
      case 'error': return console.error;
      case 'critical': return console.error;
      default: return console.log;
    }
  }

  /**
   * Flushes pending logs to storage dan remote
   */
  private flushLogs(): void {
    if (this.logQueue.length === 0) return;

    const logsToFlush = [...this.logQueue];
    this.logQueue = [];

    // Storage logging
    if (this.config.enableStorage) {
      this.flushToStorage(logsToFlush);
    }

    // Remote logging
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      this.flushToRemote(logsToFlush);
    }

    this.lastFlush = Date.now();
    
    console.log(`[ErrorLogger] Flushed ${logsToFlush.length} log entries`);
  }

  /**
   * Flushes logs to browser storage
   */
  private flushToStorage(logs: LogEntry[]): void {
    try {
      const existingLogs = this.getStoredLogs();
      const allLogs = [...existingLogs, ...logs];
      
      // Trim to max entries
      const trimmedLogs = allLogs.slice(-this.config.maxStorageEntries);
      
      localStorage.setItem('error-logs', JSON.stringify(trimmedLogs));
    } catch (error) {
      console.warn('[ErrorLogger] Failed to store logs:', error);
    }
  }

  /**
   * Flushes logs to remote endpoint
   */
  private async flushToRemote(logs: LogEntry[]): Promise<void> {
    if (!this.config.remoteEndpoint) return;

    try {
      const payload = {
        sessionId: this.sessionId,
        timestamp: Date.now(),
        logs: logs,
        metadata: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          environment: this.config.environment,
        },
      };

      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.remoteHeaders,
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.warn('[ErrorLogger] Failed to send logs to remote:', error);
    }
  }

  /**
   * Gets logs from storage
   */
  private getStoredLogs(): LogEntry[] {
    try {
      const stored = localStorage.getItem('error-logs');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('[ErrorLogger] Failed to retrieve stored logs:', error);
      return [];
    }
  }

  /**
   * Sets up batch processing timer
   */
  private setupBatchProcessing(): void {
    this.batchTimer = setInterval(() => {
      if (this.logQueue.length > 0) {
        this.flushLogs();
      }
    }, this.config.batchInterval);
  }

  /**
   * Sets up unload handler untuk final flush
   */
  private setupUnloadHandler(): void {
    const handleUnload = () => {
      this.flushLogs();
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    // Periodic flush for long-running sessions
    setInterval(() => {
      const timeSinceLastFlush = Date.now() - this.lastFlush;
      if (timeSinceLastFlush > 30000 && this.logQueue.length > 0) { // 30 seconds
        this.flushLogs();
      }
    }, 30000);
  }

  /**
   * Calculates performance impact
   */
  private calculatePerformanceImpact(): LogMetadata['performanceImpact'] {
    const impact: LogMetadata['performanceImpact'] = {
      timeDelta: Date.now() - this.performanceBaseline.timestamp,
    };

    if (this.config.enablePerformanceTracking && 'memory' in performance) {
      const currentMemory = (performance as any).memory?.usedJSHeapSize || 0;
      impact.memoryDelta = currentMemory - this.performanceBaseline.memory;
    }

    return impact;
  }

  /**
   * Captures performance baseline
   */
  private capturePerformanceBaseline(): { memory: number; timestamp: number } {
    return {
      memory: 'memory' in performance ? (performance as any).memory?.usedJSHeapSize || 0 : 0,
      timestamp: Date.now(),
    };
  }

  /**
   * Generates tags untuk log entry
   */
  private generateTags(
    level: LogLevel,
    category: LogCategory,
    context?: Partial<LogContext>,
    error?: LogEntry['error']
  ): string[] {
    const tags = [level, category];
    
    if (context?.component) tags.push(`component:${context.component}`);
    if (context?.userId) tags.push(`user:${context.userId}`);
    if (context?.chatId) tags.push(`chat:${context.chatId}`);
    if (error?.name) tags.push(`error:${error.name}`);
    
    // Browser/environment tags
    tags.push(`env:${process.env.NODE_ENV || 'production'}`);
    tags.push(`browser:${this.getBrowserName()}`);
    
    return tags;
  }

  /**
   * Gets browser name untuk tagging
   */
  private getBrowserName(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('firefox')) return 'firefox';
    if (userAgent.includes('chrome')) return 'chrome';
    if (userAgent.includes('safari')) return 'safari';
    if (userAgent.includes('edge')) return 'edge';
    
    return 'unknown';
  }

  /**
   * Utility methods
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateLogId(): string {
    return `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCorrelationId(): string {
    return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Gets logging statistics
   */
  getStats(): {
    totalLogs: number;
    queueSize: number;
    logCounts: Record<string, number>;
    sessionId: string;
    lastFlush: number;
    performanceBaseline: { memory: number; timestamp: number };
  } {
    return {
      totalLogs: Array.from(this.logCounts.values()).reduce((a, b) => a + b, 0),
      queueSize: this.logQueue.length,
      logCounts: Object.fromEntries(this.logCounts),
      sessionId: this.sessionId,
      lastFlush: this.lastFlush,
      performanceBaseline: this.performanceBaseline,
    };
  }

  /**
   * Gets recent logs untuk debugging
   */
  getRecentLogs(limit: number = 10): LogEntry[] {
    const stored = this.getStoredLogs();
    return stored.slice(-limit);
  }

  /**
   * Clears stored logs
   */
  clearLogs(): void {
    try {
      localStorage.removeItem('error-logs');
      this.logCounts.clear();
      console.log('[ErrorLogger] Logs cleared');
    } catch (error) {
      console.warn('[ErrorLogger] Failed to clear logs:', error);
    }
  }

  /**
   * Updates configuration
   */
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[ErrorLogger] Configuration updated:', this.config);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    
    // Final flush
    this.flushLogs();
    
    console.log('[ErrorLogger] Destroyed');
  }
}

// Global logger instance
export const errorLogger = new ErrorLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  enableConsole: true,
  enableStorage: true,
  enableRemote: false, // Configure for production
  enablePerformanceTracking: true,
  batchSize: 25,
  batchInterval: 3000,
  maxStorageEntries: 500,
  samplingRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
});

export default ErrorLogger;
