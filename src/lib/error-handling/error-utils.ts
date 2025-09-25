/**
 * ERROR HANDLING UTILITIES - Task 08 Error Handling Implementation
 * 
 * Comprehensive utility functions untuk error handling operations
 * dengan intelligent classification, recovery helpers, dan diagnostics.
 * 
 * INTEGRATION:
 * - ZERO modifications to protected Task patterns
 * - Provides reusable error handling utilities
 * - Supports all error boundary components
 * - Maintains consistency across error handling
 * 
 * FEATURES:
 * - Error classification and enhancement
 * - Recovery operation helpers
 * - Diagnostic information collection
 * - Performance monitoring utilities
 */

import { ErrorManager, ManagedError } from './ErrorManager';

/**
 * Enhanced error interface dengan additional context
 */
export interface EnhancedError extends Error {
  id?: string;
  type?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  retryable?: boolean;
  context?: Record<string, any>;
  timestamp?: number;
  handled?: boolean;
}

/**
 * Error classification result
 */
export interface ErrorClassification {
  type: 'chat' | 'api' | 'streaming' | 'database' | 'file' | 'component' | 'network' | 'unknown';
  category: 'functional' | 'performance' | 'security' | 'accessibility' | 'compatibility';
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  patterns: string[];
  confidence: number; // 0-1
}

/**
 * Recovery suggestion interface
 */
export interface RecoverySuggestion {
  id: string;
  method: 'retry' | 'fallback' | 'reload' | 'reset' | 'user-action';
  name: string;
  description: string;
  probability: number; // 0-1 success probability
  impact: 'low' | 'medium' | 'high'; // Impact on user experience
  automated: boolean;
  dependencies?: string[];
}

/**
 * Diagnostic information interface
 */
export interface DiagnosticInfo {
  timestamp: number;
  browser: BrowserInfo;
  system: SystemInfo;
  application: ApplicationInfo;
  error: ErrorInfo;
  performance: PerformanceInfo;
}

interface BrowserInfo {
  userAgent: string;
  language: string;
  languages: string[];
  platform: string;
  cookieEnabled: boolean;
  onLine: boolean;
  vendor: string;
  version?: string;
}

interface SystemInfo {
  screen: {
    width: number;
    height: number;
    availWidth: number;
    availHeight: number;
    colorDepth: number;
    pixelDepth: number;
    orientation?: string;
  };
  memory?: {
    deviceMemory?: number;
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  };
  connection?: {
    downlink?: number;
    effectiveType?: string;
    rtt?: number;
    saveData?: boolean;
  };
  hardware?: {
    hardwareConcurrency: number;
  };
}

interface ApplicationInfo {
  url: string;
  referrer: string;
  title: string;
  timestamp: number;
  sessionDuration: number;
  localStorage: {
    available: boolean;
    usage?: number;
    quota?: number;
  };
  sessionStorage: {
    available: boolean;
    itemCount: number;
  };
}

interface ErrorInfo {
  name: string;
  message: string;
  stack?: string;
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
  source: string;
}

interface PerformanceInfo {
  timing?: PerformanceNavigationTiming;
  memory?: any;
  resources?: PerformanceResourceTiming[];
  marks?: PerformanceMark[];
  measures?: PerformanceMeasure[];
}

/**
 * ERROR CLASSIFICATION UTILITIES
 */

/**
 * Classifies an error berdasarkan patterns dan context
 */
export function classifyError(error: Error, context?: Record<string, any>): ErrorClassification {
  const message = error.message.toLowerCase();
  const stack = error.stack?.toLowerCase() || '';
  const name = error.name.toLowerCase();
  const fullText = `${name} ${message} ${stack}`;

  // Pattern-based classification
  const patterns = detectErrorPatterns(fullText);
  const type = determineErrorType(patterns, message, stack, context);
  const category = determineErrorCategory(patterns, message, context);
  const severity = determineErrorSeverity(patterns, name, message, context);
  const retryable = determineRetryability(patterns, type, message, context);
  const confidence = calculateClassificationConfidence(patterns, type, category);

  return {
    type,
    category,
    severity,
    retryable,
    patterns,
    confidence,
  };
}

/**
 * Detects error patterns dalam error text
 */
function detectErrorPatterns(text: string): string[] {
  const patterns = [
    // Network patterns
    { pattern: /fetch|network|connection|timeout|cors|dns/i, name: 'network' },
    { pattern: /xhr|xmlhttprequest|ajax/i, name: 'xhr' },
    
    // Component patterns  
    { pattern: /chunk|loading.*failed|script.*error/i, name: 'chunk-loading' },
    { pattern: /react|component|render|jsx|tsx/i, name: 'react' },
    { pattern: /hydration|mismatch/i, name: 'hydration' },
    
    // Database patterns
    { pattern: /rls|row level security|postgres|pgrst|supabase/i, name: 'database' },
    { pattern: /sql|query|transaction|constraint/i, name: 'database-operation' },
    
    // File patterns
    { pattern: /file|upload|download|blob|formdata/i, name: 'file-operation' },
    { pattern: /mime|encoding|size|quota/i, name: 'file-validation' },
    
    // Authentication patterns
    { pattern: /auth|unauthorized|forbidden|token|jwt/i, name: 'authentication' },
    { pattern: /permission|access|role/i, name: 'authorization' },
    
    // Streaming patterns
    { pattern: /stream|sse|eventsource|websocket/i, name: 'streaming' },
    { pattern: /socket|connection.*lost|reconnect/i, name: 'connection' },
    
    // Performance patterns
    { pattern: /memory|heap|stack.*overflow/i, name: 'memory' },
    { pattern: /timeout|slow|performance/i, name: 'performance' },
    
    // Validation patterns
    { pattern: /validation|invalid|malformed|parse/i, name: 'validation' },
    { pattern: /schema|type.*error|cast/i, name: 'type-validation' },
  ];

  return patterns
    .filter(p => p.pattern.test(text))
    .map(p => p.name);
}

/**
 * Determines error type berdasarkan patterns dan context
 */
function determineErrorType(
  patterns: string[], 
  message: string, 
  stack: string, 
  context?: Record<string, any>
): ErrorClassification['type'] {
  // Context-based determination
  if (context?.component?.includes('Chat')) return 'chat';
  if (context?.api || context?.endpoint) return 'api';
  if (context?.stream || context?.sse) return 'streaming';
  if (context?.database || context?.table) return 'database';
  if (context?.file || context?.upload) return 'file';

  // Pattern-based determination
  if (patterns.includes('network') || patterns.includes('xhr')) return 'network';
  if (patterns.includes('chunk-loading') || patterns.includes('react')) return 'component';
  if (patterns.includes('database') || patterns.includes('database-operation')) return 'database';
  if (patterns.includes('file-operation') || patterns.includes('file-validation')) return 'file';
  if (patterns.includes('streaming') || patterns.includes('connection')) return 'streaming';
  if (patterns.includes('authentication') || patterns.includes('authorization')) return 'api';

  // Message-based determination
  if (message.includes('chat') || stack.includes('chat')) return 'chat';
  if (message.includes('api') || message.includes('endpoint')) return 'api';
  
  return 'unknown';
}

/**
 * Determines error category
 */
function determineErrorCategory(
  patterns: string[], 
  message: string, 
  context?: Record<string, any>
): ErrorClassification['category'] {
  if (patterns.includes('authentication') || patterns.includes('authorization')) return 'security';
  if (patterns.includes('performance') || patterns.includes('memory')) return 'performance';
  if (patterns.includes('validation') || patterns.includes('type-validation')) return 'compatibility';
  if (message.includes('accessibility') || message.includes('aria')) return 'accessibility';
  
  return 'functional';
}

/**
 * Determines error severity
 */
function determineErrorSeverity(
  patterns: string[], 
  name: string, 
  message: string, 
  context?: Record<string, any>
): ErrorClassification['severity'] {
  // Critical errors
  if (patterns.includes('chunk-loading') || name.includes('chunkloa')) return 'critical';
  if (patterns.includes('authentication') && context?.userId) return 'critical';
  if (patterns.includes('memory') && message.includes('heap')) return 'critical';
  
  // High severity
  if (patterns.includes('database') || patterns.includes('authorization')) return 'high';
  if (patterns.includes('network') && context?.essential) return 'high';
  
  // Medium severity  
  if (patterns.includes('network') || patterns.includes('performance')) return 'medium';
  if (patterns.includes('validation') || patterns.includes('file-operation')) return 'medium';
  
  // Low severity (default)
  return 'low';
}

/**
 * Determines if error is retryable
 */
function determineRetryability(
  patterns: string[], 
  type: string, 
  message: string, 
  context?: Record<string, any>
): boolean {
  // Non-retryable patterns
  if (patterns.includes('authentication') || patterns.includes('authorization')) return false;
  if (patterns.includes('validation') || patterns.includes('type-validation')) return false;
  if (message.includes('malformed') || message.includes('invalid')) return false;
  
  // Retryable patterns
  if (patterns.includes('network') || patterns.includes('connection')) return true;
  if (patterns.includes('chunk-loading') || type === 'component') return true;
  if (patterns.includes('database-operation') || type === 'database') return true;
  if (patterns.includes('streaming')) return true;
  
  // Context-based
  if (context?.retryable !== undefined) return context.retryable;
  
  return false;
}

/**
 * Calculates classification confidence
 */
function calculateClassificationConfidence(
  patterns: string[], 
  type: string, 
  category: string
): number {
  let confidence = 0.5; // Base confidence
  
  // Pattern matches increase confidence
  confidence += patterns.length * 0.1;
  
  // Strong patterns increase confidence more
  if (patterns.includes('chunk-loading') || patterns.includes('database')) {
    confidence += 0.2;
  }
  
  // Multiple related patterns increase confidence
  if (patterns.includes('network') && patterns.includes('xhr')) {
    confidence += 0.15;
  }
  
  // Cap at 1.0
  return Math.min(confidence, 1.0);
}

/**
 * RECOVERY UTILITIES
 */

/**
 * Generates recovery suggestions untuk an error
 */
export function generateRecoverySuggestions(
  error: EnhancedError, 
  classification: ErrorClassification,
  context?: Record<string, any>
): RecoverySuggestion[] {
  const suggestions: RecoverySuggestion[] = [];
  
  // Type-based suggestions
  switch (classification.type) {
    case 'network':
      suggestions.push({
        id: 'retry-network',
        method: 'retry',
        name: 'Retry Request',
        description: 'Attempt the network request again',
        probability: 0.7,
        impact: 'low',
        automated: true,
      });
      
      suggestions.push({
        id: 'check-connection',
        method: 'user-action',
        name: 'Check Connection',
        description: 'Verify internet connectivity',
        probability: 0.5,
        impact: 'medium',
        automated: false,
      });
      break;
      
    case 'component':
      suggestions.push({
        id: 'reload-page',
        method: 'reload',
        name: 'Reload Page',
        description: 'Reload the entire application',
        probability: 0.8,
        impact: 'medium',
        automated: false,
      });
      
      suggestions.push({
        id: 'clear-cache',
        method: 'reset',
        name: 'Clear Cache',
        description: 'Clear browser cache and reload',
        probability: 0.6,
        impact: 'high',
        automated: false,
      });
      break;
      
    case 'database':
      suggestions.push({
        id: 'retry-query',
        method: 'retry',
        name: 'Retry Operation',
        description: 'Attempt database operation again',
        probability: 0.6,
        impact: 'low',
        automated: true,
      });
      
      if (classification.patterns.includes('authentication')) {
        suggestions.push({
          id: 'refresh-auth',
          method: 'fallback',
          name: 'Refresh Authentication',
          description: 'Refresh user authentication',
          probability: 0.7,
          impact: 'medium',
          automated: true,
        });
      }
      break;
      
    case 'streaming':
      suggestions.push({
        id: 'reconnect-stream',
        method: 'retry',
        name: 'Reconnect Stream',
        description: 'Re-establish streaming connection',
        probability: 0.8,
        impact: 'low',
        automated: true,
      });
      
      suggestions.push({
        id: 'fallback-polling',
        method: 'fallback',
        name: 'Use Polling',
        description: 'Switch to polling-based updates',
        probability: 0.9,
        impact: 'medium',
        automated: true,
      });
      break;
      
    case 'file':
      suggestions.push({
        id: 'retry-upload',
        method: 'retry',
        name: 'Retry Upload',
        description: 'Attempt file operation again',
        probability: 0.5,
        impact: 'low',
        automated: true,
      });
      
      suggestions.push({
        id: 'validate-file',
        method: 'user-action',
        name: 'Check File',
        description: 'Verify file format and size',
        probability: 0.3,
        impact: 'low',
        automated: false,
      });
      break;
  }
  
  // Severity-based suggestions
  if (classification.severity === 'critical') {
    suggestions.unshift({
      id: 'emergency-reload',
      method: 'reload',
      name: 'Emergency Reload',
      description: 'Immediate page reload to restore functionality',
      probability: 0.9,
      impact: 'high',
      automated: false,
    });
  }
  
  // Sort by probability (highest first)
  return suggestions.sort((a, b) => b.probability - a.probability);
}

/**
 * DIAGNOSTIC UTILITIES
 */

/**
 * Collects comprehensive diagnostic information
 */
export async function collectDiagnostics(error: Error, context?: Record<string, any>): Promise<DiagnosticInfo> {
  const timestamp = Date.now();
  
  return {
    timestamp,
    browser: collectBrowserInfo(),
    system: await collectSystemInfo(),
    application: collectApplicationInfo(),
    error: collectErrorInfo(error, context),
    performance: collectPerformanceInfo(),
  };
}

/**
 * Collects browser information
 */
function collectBrowserInfo(): BrowserInfo {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: navigator.languages ? Array.from(navigator.languages) : [],
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    vendor: navigator.vendor,
    version: (navigator as any).appVersion,
  };
}

/**
 * Collects system information
 */
async function collectSystemInfo(): Promise<SystemInfo> {
  const systemInfo: SystemInfo = {
    screen: {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      orientation: screen.orientation?.type,
    },
    hardware: {
      hardwareConcurrency: navigator.hardwareConcurrency || 1,
    },
  };
  
  // Memory information
  if ('memory' in performance) {
    systemInfo.memory = (performance as any).memory;
  }
  
  // Device memory
  if ('deviceMemory' in navigator) {
    systemInfo.memory = {
      ...systemInfo.memory,
      deviceMemory: (navigator as any).deviceMemory,
    };
  }
  
  // Connection information
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    systemInfo.connection = {
      downlink: connection.downlink,
      effectiveType: connection.effectiveType,
      rtt: connection.rtt,
      saveData: connection.saveData,
    };
  }
  
  return systemInfo;
}

/**
 * Collects application information
 */
function collectApplicationInfo(): ApplicationInfo {
  const sessionStart = parseInt(sessionStorage.getItem('session-start') || '0', 10) || Date.now();
  
  return {
    url: window.location.href,
    referrer: document.referrer,
    title: document.title,
    timestamp: Date.now(),
    sessionDuration: Date.now() - sessionStart,
    localStorage: {
      available: typeof Storage !== 'undefined',
      usage: getStorageUsage('localStorage'),
      quota: getStorageQuota(),
    },
    sessionStorage: {
      available: typeof sessionStorage !== 'undefined',
      itemCount: sessionStorage.length,
    },
  };
}

/**
 * Collects error-specific information
 */
function collectErrorInfo(error: Error, context?: Record<string, any>): ErrorInfo {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    fileName: (error as any).fileName,
    lineNumber: (error as any).lineNumber,
    columnNumber: (error as any).columnNumber,
    source: context?.source || 'unknown',
  };
}

/**
 * Collects performance information
 */
function collectPerformanceInfo(): PerformanceInfo {
  const info: PerformanceInfo = {};
  
  // Navigation timing
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (navigation) {
    info.timing = navigation;
  }
  
  // Memory information
  if ('memory' in performance) {
    info.memory = (performance as any).memory;
  }
  
  // Resource timing (latest 10 entries)
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  info.resources = resources.slice(-10);
  
  // Performance marks
  const marks = performance.getEntriesByType('mark') as PerformanceMark[];
  info.marks = marks.slice(-10);
  
  // Performance measures
  const measures = performance.getEntriesByType('measure') as PerformanceMeasure[];
  info.measures = measures.slice(-10);
  
  return info;
}

/**
 * HELPER UTILITIES
 */

/**
 * Gets storage usage dalam bytes
 */
function getStorageUsage(storageType: 'localStorage' | 'sessionStorage'): number {
  try {
    const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
    let total = 0;
    
    for (let key in storage) {
      if (storage.hasOwnProperty(key)) {
        total += storage[key].length + key.length;
      }
    }
    
    return total;
  } catch (e) {
    return 0;
  }
}

/**
 * Gets storage quota
 */
function getStorageQuota(): number {
  // Approximate localStorage quota (usually 5-10MB)
  return 10 * 1024 * 1024; // 10MB default
}

/**
 * Enhances an error dengan additional context
 */
export function enhanceError(
  error: Error, 
  context?: Record<string, any>
): EnhancedError {
  const enhanced = error as EnhancedError;
  
  enhanced.id = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  enhanced.timestamp = Date.now();
  enhanced.context = context;
  enhanced.handled = false;
  
  // Classify error
  const classification = classifyError(error, context);
  enhanced.type = classification.type;
  enhanced.severity = classification.severity;
  enhanced.retryable = classification.retryable;
  
  return enhanced;
}

/**
 * Checks if an error should be reported
 */
export function shouldReportError(error: EnhancedError): boolean {
  // Don't report handled errors
  if (error.handled) return false;
  
  // Don't report low severity errors without user impact
  if (error.severity === 'low' && !error.context?.userFacing) return false;
  
  // Don't report known non-critical patterns
  const message = error.message.toLowerCase();
  if (message.includes('non-passive') || message.includes('deprecated')) {
    return false;
  }
  
  // Report critical and high severity errors
  if (error.severity === 'critical' || error.severity === 'high') return true;
  
  // Report errors dengan user context
  if (error.context?.userId || error.context?.userAction) return true;
  
  return true;
}

/**
 * Formats error for display
 */
export function formatErrorForUser(error: EnhancedError): {
  title: string;
  message: string;
  actionable: boolean;
  severity: string;
} {
  const classification = classifyError(error);
  
  let title = 'Something went wrong';
  let message = 'An unexpected error occurred. Please try again.';
  let actionable = classification.retryable;
  
  switch (classification.type) {
    case 'network':
      title = 'Connection Problem';
      message = 'Unable to connect to our servers. Please check your internet connection.';
      break;
      
    case 'component':
      title = 'Display Error';
      message = 'There was a problem loading this section. Refreshing the page may help.';
      break;
      
    case 'database':
      title = 'Data Error';
      message = 'Unable to save or retrieve your data. Please try again.';
      break;
      
    case 'file':
      title = 'File Error';
      message = 'There was a problem with your file. Please check the format and try again.';
      break;
      
    case 'streaming':
      title = 'Connection Interrupted';
      message = 'The real-time connection was lost. Attempting to reconnect...';
      break;
      
    case 'api':
      title = 'Service Error';
      message = 'Our service is temporarily unavailable. Please try again in a few moments.';
      break;
  }
  
  return {
    title,
    message,
    actionable,
    severity: classification.severity,
  };
}

/**
 * Debounced error handler untuk preventing spam
 */
export function createDebouncedErrorHandler(
  handler: (error: EnhancedError) => void,
  delay: number = 1000
): (error: EnhancedError) => void {
  const errorCounts = new Map<string, number>();
  const timers = new Map<string, NodeJS.Timeout>();
  
  return (error: EnhancedError) => {
    const key = `${error.name}-${error.message}`;
    const count = errorCounts.get(key) || 0;
    
    // Clear existing timer
    const existingTimer = timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Increment count
    errorCounts.set(key, count + 1);
    
    // Set new timer
    const timer = setTimeout(() => {
      const finalCount = errorCounts.get(key) || 1;
      
      // Add count to error context
      const enhancedError = {
        ...error,
        context: {
          ...error.context,
          occurrenceCount: finalCount,
        },
      };
      
      handler(enhancedError);
      
      // Cleanup
      errorCounts.delete(key);
      timers.delete(key);
    }, delay);
    
    timers.set(key, timer);
  };
}

const errorUtils = {
  classifyError,
  generateRecoverySuggestions,
  collectDiagnostics,
  enhanceError,
  shouldReportError,
  formatErrorForUser,
  createDebouncedErrorHandler,
};

export default errorUtils;
