/**
 * Enhanced Error Handler Utilities
 *
 * Provides comprehensive error classification and user-friendly messaging
 * Transforms technical errors into actionable feedback for users
 */

export type ErrorCategory =
  | 'network'
  | 'validation'
  | 'permission'
  | 'session'
  | 'server'
  | 'database'
  | 'unknown';

export interface ErrorInfo {
  category: ErrorCategory;
  userMessage: string;
  technicalMessage: string;
  suggestedAction: string;
  shouldRetry: boolean;
  logLevel: 'error' | 'warn' | 'info';
}

/**
 * Classify and analyze errors to provide meaningful feedback
 */
export function analyzeError(error: unknown): ErrorInfo {
  // Handle Error objects
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network errors
    if (isNetworkError(message)) {
      return {
        category: 'network',
        userMessage: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
        technicalMessage: error.message,
        suggestedAction: 'Periksa koneksi Wi-Fi atau data seluler Anda, lalu coba lagi.',
        shouldRetry: true,
        logLevel: 'warn'
      };
    }

    // Database constraint errors
    if (isDatabaseConstraintError(message)) {
      return {
        category: 'database',
        userMessage: 'Data yang dimasukkan tidak valid. Periksa kembali input Anda.',
        technicalMessage: error.message,
        suggestedAction: 'Pastikan nama tidak terlalu panjang dan format email benar.',
        shouldRetry: false,
        logLevel: 'error'
      };
    }

    // Permission errors
    if (isPermissionError(message)) {
      return {
        category: 'permission',
        userMessage: 'Anda tidak memiliki izin untuk melakukan perubahan ini.',
        technicalMessage: error.message,
        suggestedAction: 'Hubungi administrator jika Anda merasa ini adalah kesalahan.',
        shouldRetry: false,
        logLevel: 'error'
      };
    }

    // Session errors
    if (isSessionError(message)) {
      return {
        category: 'session',
        userMessage: 'Sesi Anda telah berakhir. Silakan login kembali.',
        technicalMessage: error.message,
        suggestedAction: 'Akan dialihkan ke halaman login dalam beberapa detik.',
        shouldRetry: false,
        logLevel: 'warn'
      };
    }
  }

  // Handle string errors
  if (typeof error === 'string') {
    const message = error.toLowerCase();

    if (message.includes('jwt') || message.includes('token')) {
      return {
        category: 'session',
        userMessage: 'Sesi Anda telah berakhir. Silakan login kembali.',
        technicalMessage: error,
        suggestedAction: 'Akan dialihkan ke halaman login dalam beberapa detik.',
        shouldRetry: false,
        logLevel: 'warn'
      };
    }
  }

  // Handle fetch/API response errors
  if (error && typeof error === 'object') {
    const apiError = error as any;

    // API error with status
    if (apiError.status) {
      switch (apiError.status) {
        case 400:
          return {
            category: 'validation',
            userMessage: 'Data yang dikirim tidak valid. Periksa kembali input Anda.',
            technicalMessage: apiError.message || 'Bad Request',
            suggestedAction: 'Periksa semua field yang wajib diisi.',
            shouldRetry: false,
            logLevel: 'error'
          };

        case 401:
        case 403:
          return {
            category: 'permission',
            userMessage: 'Anda tidak memiliki izin untuk melakukan perubahan ini.',
            technicalMessage: apiError.message || 'Unauthorized',
            suggestedAction: 'Login kembali atau hubungi administrator.',
            shouldRetry: false,
            logLevel: 'error'
          };

        case 429:
          return {
            category: 'server',
            userMessage: 'Terlalu banyak permintaan. Silakan tunggu sebentar.',
            technicalMessage: apiError.message || 'Too Many Requests',
            suggestedAction: 'Tunggu beberapa saat sebelum mencoba lagi.',
            shouldRetry: true,
            logLevel: 'warn'
          };

        case 500:
        case 502:
        case 503:
        case 504:
          return {
            category: 'server',
            userMessage: 'Server sedang bermasalah. Silakan coba lagi nanti.',
            technicalMessage: apiError.message || 'Server Error',
            suggestedAction: 'Coba lagi dalam beberapa menit atau hubungi dukungan.',
            shouldRetry: true,
            logLevel: 'error'
          };
      }
    }
  }

  // Default/unknown errors
  return {
    category: 'unknown',
    userMessage: 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi.',
    technicalMessage: error instanceof Error ? error.message : String(error),
    suggestedAction: 'Jika masalah berlanjut, hubungi tim dukungan teknis.',
    shouldRetry: true,
    logLevel: 'error'
  };
}

/**
 * Check if error is network-related
 */
function isNetworkError(message: string): boolean {
  const networkKeywords = [
    'network',
    'fetch',
    'connection',
    'timeout',
    'offline',
    'unreachable',
    'dns',
    'cors',
    'connection refused',
    'failed to fetch',
    'internet'
  ];

  return networkKeywords.some(keyword => message.includes(keyword));
}

/**
 * Check if error is database constraint violation
 */
function isDatabaseConstraintError(message: string): boolean {
  const constraintKeywords = [
    'constraint',
    'duplicate',
    'unique',
    'not null',
    'check constraint',
    'foreign key',
    'too long',
    'invalid input'
  ];

  return constraintKeywords.some(keyword => message.includes(keyword));
}

/**
 * Check if error is permission-related
 */
function isPermissionError(message: string): boolean {
  const permissionKeywords = [
    'permission',
    'unauthorized',
    'forbidden',
    'access denied',
    'role',
    'privilege'
  ];

  return permissionKeywords.some(keyword => message.includes(keyword));
}

/**
 * Check if error is session-related
 */
function isSessionError(message: string): boolean {
  const sessionKeywords = [
    'session',
    'expired',
    'invalid session',
    'authentication',
    'jwt',
    'token'
  ];

  return sessionKeywords.some(keyword => message.includes(keyword));
}

/**
 * Log error with appropriate level and context
 */
export function logError(error: unknown, context: string, errorInfo: ErrorInfo): void {
  const logData = {
    context,
    category: errorInfo.category,
    userMessage: errorInfo.userMessage,
    technicalMessage: errorInfo.technicalMessage,
    suggestedAction: errorInfo.suggestedAction,
    timestamp: new Date().toISOString(),
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error
  };

  switch (errorInfo.logLevel) {
    case 'error':
      console.error(`[${context}] ${errorInfo.category.toUpperCase()}:`, logData);
      break;
    case 'warn':
      console.warn(`[${context}] ${errorInfo.category.toUpperCase()}:`, logData);
      break;
    case 'info':
      console.info(`[${context}] ${errorInfo.category.toUpperCase()}:`, logData);
      break;
  }
}

/**
 * Create user-friendly status message from error
 */
export function createStatusMessage(errorInfo: ErrorInfo): { type: 'success' | 'error'; text: string } {
  return {
    type: 'error',
    text: `${errorInfo.userMessage} ${errorInfo.suggestedAction}`
  };
}

/**
 * Profile-specific error handler
 */
export function handleProfileError(error: unknown, context: string = 'Profile Update'): {
  statusMessage: { type: 'success' | 'error'; text: string };
  shouldRedirect: boolean;
  redirectPath?: string;
  errorInfo: ErrorInfo;
} {
  const errorInfo = analyzeError(error);

  // Log the error with context
  logError(error, context, errorInfo);

  // Determine if redirect is needed
  let shouldRedirect = false;
  let redirectPath: string | undefined;

  if (errorInfo.category === 'session') {
    shouldRedirect = true;
    redirectPath = '/auth';
  }

  return {
    statusMessage: createStatusMessage(errorInfo),
    shouldRedirect,
    redirectPath,
    errorInfo
  };
}