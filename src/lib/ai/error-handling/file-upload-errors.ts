/**
 * FILE UPLOAD ERROR HANDLING - AI SDK v5 COMPLIANCE
 * 
 * Comprehensive error handling for file upload operations
 * following AI SDK v5 error handling patterns from docs/03-ai-sdk-core/50-error-handling.mdx
 * 
 * INTEGRATION: Provides structured error handling for file tools and streaming operations
 * with proper error types, recovery mechanisms, and user-friendly messages
 */

import { AISDKError } from 'ai';

// Custom error types for file operations
export class FileUploadError extends AISDKError {
  readonly name = 'FileUploadError';
  readonly cause?: string;
  readonly retryable: boolean;
  readonly statusCode?: number;

  constructor(
    message: string, 
    options?: { 
      cause?: string; 
      retryable?: boolean; 
      statusCode?: number;
      originalError?: Error;
    }
  ) {
    super({ name: 'FileUploadError', message, cause: options?.originalError });
    this.cause = options?.cause;
    this.retryable = options?.retryable ?? false;
    this.statusCode = options?.statusCode;
  }
}

export class FileProcessingError extends AISDKError {
  readonly name = 'FileProcessingError';
  readonly processingStage: 'upload' | 'storage' | 'database' | 'analysis';
  readonly fileId?: string;
  readonly retryable: boolean;

  constructor(
    message: string,
    processingStage: FileProcessingError['processingStage'],
    options?: {
      fileId?: string;
      retryable?: boolean;
      originalError?: Error;
    }
  ) {
    super({ name: 'FileUploadError', message, cause: options?.originalError });
    this.processingStage = processingStage;
    this.fileId = options?.fileId;
    this.retryable = options?.retryable ?? true;
  }
}

export class FileValidationError extends AISDKError {
  readonly name = 'FileValidationError';
  readonly validationRule: string;
  readonly allowedValues?: string[];
  readonly actualValue?: any;

  constructor(
    message: string,
    validationRule: string,
    options?: {
      allowedValues?: string[];
      actualValue?: any;
      originalError?: Error;
    }
  ) {
    super({ name: 'FileUploadError', message, cause: options?.originalError });
    this.validationRule = validationRule;
    this.allowedValues = options?.allowedValues;
    this.actualValue = options?.actualValue;
  }
}

export class FileStorageError extends AISDKError {
  readonly name = 'FileStorageError';
  readonly operation: 'upload' | 'download' | 'delete' | 'metadata';
  readonly storagePath?: string;
  readonly retryable: boolean;

  constructor(
    message: string,
    operation: FileStorageError['operation'],
    options?: {
      storagePath?: string;
      retryable?: boolean;
      originalError?: Error;
    }
  ) {
    super({ name: 'FileUploadError', message, cause: options?.originalError });
    this.operation = operation;
    this.storagePath = options?.storagePath;
    this.retryable = options?.retryable ?? true;
  }
}

/**
 * ERROR RECOVERY STRATEGIES
 */
export interface FileErrorRecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  fallbackStorage?: boolean;
  cleanupOnFailure?: boolean;
}

export class FileErrorRecoveryManager {
  private retryCount = new Map<string, number>();
  
  constructor(private options: FileErrorRecoveryOptions = {}) {
    this.options = {
      maxRetries: 3,
      retryDelay: 1000,
      fallbackStorage: true,
      cleanupOnFailure: true,
      ...options,
    };
  }

  /**
   * Determines if error is retryable and within retry limits
   */
  canRetry(error: any, operationId: string): boolean {
    const currentRetries = this.retryCount.get(operationId) || 0;
    const maxRetries = this.options.maxRetries || 3;

    if (currentRetries >= maxRetries) {
      return false;
    }

    // Check if error is retryable
    if (error instanceof FileUploadError || 
        error instanceof FileProcessingError || 
        error instanceof FileStorageError) {
      return error.retryable;
    }

    // Network/timeout errors are generally retryable
    if (error.message?.includes('timeout') || 
        error.message?.includes('network') ||
        error.message?.includes('connection')) {
      return true;
    }

    return false;
  }

  /**
   * Executes operation with retry logic
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    operationId: string,
    context?: { fileName?: string; fileId?: string; operation?: string }
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= (this.options.maxRetries || 3); attempt++) {
      try {
        if (attempt > 0) {
          // Wait before retry
          await new Promise(resolve => 
            setTimeout(resolve, (this.options.retryDelay || 1000) * attempt)
          );
        }

        this.retryCount.set(operationId, attempt);
        const result = await operation();
        
        // Success - clear retry count
        this.retryCount.delete(operationId);
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (!this.canRetry(error, operationId)) {
          break;
        }

        console.warn(`[File Error Recovery] Attempt ${attempt + 1} failed for ${operationId}:`, {
          error: lastError.message,
          context,
        });
      }
    }

    // All retries failed
    this.retryCount.delete(operationId);
    throw this.enhanceErrorWithContext(lastError!, context);
  }

  /**
   * Enhances error with additional context
   */
  private enhanceErrorWithContext(error: Error, context?: any): Error {
    if (context) {
      const contextInfo = Object.entries(context)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      
      error.message += ` (Context: ${contextInfo})`;
    }
    
    return error;
  }
}

/**
 * FILE UPLOAD ERROR HANDLER
 * Centralized error handling for all file upload operations
 */
export class FileUploadErrorHandler {
  private recoveryManager = new FileErrorRecoveryManager();

  /**
   * Handles file validation errors
   */
  handleValidationError(error: any, filename: string): never {
    if (error.message?.includes('file size')) {
      throw new FileValidationError(
        `File "${filename}" exceeds maximum size limit`,
        'file_size',
        { actualValue: 'exceeds limit', allowedValues: ['≤ 50MB'] }
      );
    }

    if (error.message?.includes('file type')) {
      throw new FileValidationError(
        `File "${filename}" has unsupported file type`,
        'file_type',
        {
          allowedValues: ['PDF', 'DOC', 'DOCX', 'TXT', 'MD', 'RTF'],
          originalError: error
        }
      );
    }

    throw new FileValidationError(
      `File "${filename}" validation failed: ${error.message}`,
      'general_validation',
      { originalError: error }
    );
  }

  /**
   * Handles storage operation errors
   */
  handleStorageError(
    error: any, 
    operation: FileStorageError['operation'],
    context?: { fileName?: string; storagePath?: string }
  ): never {
    let retryable = true;
    let message = `Storage ${operation} failed`;

    if (context?.fileName) {
      message += ` for file "${context.fileName}"`;
    }

    if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
      retryable = false;
      message += ': Access denied. Check file permissions.';
    } else if (error.message?.includes('not found')) {
      retryable = false;
      message += ': File not found in storage.';
    } else if (error.message?.includes('quota') || error.message?.includes('space')) {
      retryable = false;
      message += ': Storage quota exceeded.';
    } else {
      message += `: ${error.message}`;
    }

    throw new FileStorageError(message, operation, {
      storagePath: context?.storagePath,
      retryable,
      originalError: error
    });
  }

  /**
   * Handles database operation errors
   */
  handleDatabaseError(error: any, context?: { fileName?: string; fileId?: string }): never {
    let retryable = true;
    let message = 'Database operation failed';

    if (context?.fileName) {
      message += ` for file "${context.fileName}"`;
    }

    if (error.code === 'PGRST116' || error.message?.includes('not found')) {
      retryable = false;
      message += ': Record not found.';
    } else if (error.code === 'PGRST301' || error.message?.includes('permission')) {
      retryable = false;
      message += ': Access denied. Check RLS policies.';
    } else if (error.code === 'PGRST202' || error.message?.includes('duplicate')) {
      retryable = false;
      message += ': Duplicate record.';
    } else {
      message += `: ${error.message}`;
    }

    throw new FileProcessingError(message, 'database', {
      fileId: context?.fileId,
      retryable,
      originalError: error
    });
  }

  /**
   * Handles processing operation errors
   */
  handleProcessingError(
    error: any,
    stage: FileProcessingError['processingStage'],
    context?: { fileName?: string; fileId?: string }
  ): never {
    let retryable = stage !== 'upload'; // Upload errors are usually not retryable
    let message = `File processing failed at ${stage} stage`;

    if (context?.fileName) {
      message += ` for file "${context.fileName}"`;
    }

    if (error.message?.includes('timeout')) {
      retryable = true;
      message += ': Operation timed out.';
    } else if (error.message?.includes('corrupted') || error.message?.includes('invalid')) {
      retryable = false;
      message += ': File appears to be corrupted or invalid.';
    } else {
      message += `: ${error.message}`;
    }

    throw new FileProcessingError(message, stage, {
      fileId: context?.fileId,
      retryable,
      originalError: error
    });
  }

  /**
   * Wraps operation with error handling and retry logic
   */
  async withErrorHandling<T>(
    operation: () => Promise<T>,
    operationId: string,
    context?: { fileName?: string; fileId?: string; operation?: string }
  ): Promise<T> {
    return this.recoveryManager.withRetry(operation, operationId, context);
  }
}

/**
 * STREAMING ERROR HANDLER
 * Handles errors in AI SDK streaming operations
 * 
 * Documentation Reference:
 * /Users/eriksupit/Desktop/makalah/documentation/docs/03-ai-sdk-core/50-error-handling.mdx
 */
export class FileStreamingErrorHandler {
  /**
   * Handles streaming errors from AI SDK fullStream
   */
  handleStreamError(error: any, context?: { fileId?: string; operation?: string }): {
    type: 'error' | 'tool-error' | 'abort';
    error: Error;
    recoverable: boolean;
    message: string;
  } {
    let errorType: 'error' | 'tool-error' | 'abort' = 'error';
    let recoverable = false;
    let message = 'File operation failed';

    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      errorType = 'abort';
      recoverable = false;
      message = 'File operation was cancelled';
    } else if (error.name?.includes('Tool') || context?.operation?.includes('tool')) {
      errorType = 'tool-error';
      recoverable = true;
      message = 'File tool operation failed';
    } else if (error instanceof FileUploadError || 
               error instanceof FileProcessingError ||
               error instanceof FileStorageError) {
      recoverable = error.retryable;
      message = error.message;
    } else {
      // Network or timeout errors
      if (error.message?.includes('timeout') || error.message?.includes('network')) {
        recoverable = true;
        message = 'Network error during file operation';
      } else {
        message = `Unexpected error: ${error.message}`;
      }
    }

    return {
      type: errorType,
      error: error instanceof Error ? error : new Error(String(error)),
      recoverable,
      message,
    };
  }

  /**
   * Creates streaming error handler for useChat integration
   */
  createStreamErrorHandler(onError?: (error: Error) => void) {
    return {
      onAbort: () => {
        console.log('[File Streaming] Operation aborted');
        onError?.(new Error('File operation was cancelled by user'));
      },
      
      onError: (error: Error) => {
        const handled = this.handleStreamError(error);
        console.error(`[File Streaming] ${handled.type}:`, handled.message);
        onError?.(handled.error);
      },
    };
  }
}

/**
 * USER-FRIENDLY ERROR MESSAGES
 * Converts technical errors to user-friendly messages
 */
export class FileErrorMessageFormatter {
  formatErrorForUser(error: any): {
    title: string;
    message: string;
    action?: string;
    technical?: string;
  } {
    if (error instanceof FileValidationError) {
      return {
        title: 'File Validation Failed',
        message: this.getValidationMessage(error.validationRule),
        action: 'Please select a valid academic document',
        technical: error.message,
      };
    }

    if (error instanceof FileStorageError) {
      return {
        title: 'Storage Error',
        message: this.getStorageMessage(error.operation),
        action: error.retryable ? 'Please try again' : 'Please contact support',
        technical: error.message,
      };
    }

    if (error instanceof FileProcessingError) {
      return {
        title: 'Processing Error',
        message: this.getProcessingMessage(error.processingStage),
        action: error.retryable ? 'Please try again' : 'Please check the file and try again',
        technical: error.message,
      };
    }

    if (error instanceof FileUploadError) {
      return {
        title: 'Upload Failed',
        message: 'Unable to upload your file',
        action: error.retryable ? 'Please try again' : 'Please check your file and try again',
        technical: error.message,
      };
    }

    return {
      title: 'Unexpected Error',
      message: 'An unexpected error occurred while processing your file',
      action: 'Please try again or contact support',
      technical: error.message || String(error),
    };
  }

  private getValidationMessage(rule: string): string {
    switch (rule) {
      case 'file_size':
        return 'File size exceeds the 50MB limit';
      case 'file_type':
        return 'File type not supported. Please upload PDF, DOC, DOCX, TXT, MD, or RTF files';
      default:
        return 'File validation failed';
    }
  }

  private getStorageMessage(operation: string): string {
    switch (operation) {
      case 'upload':
        return 'Failed to store file securely';
      case 'download':
        return 'Failed to retrieve file';
      case 'delete':
        return 'Failed to remove file';
      default:
        return 'Storage operation failed';
    }
  }

  private getProcessingMessage(stage: string): string {
    switch (stage) {
      case 'upload':
        return 'Failed to process uploaded file';
      case 'storage':
        return 'Failed to store file data';
      case 'database':
        return 'Failed to save file information';
      case 'analysis':
        return 'Failed to analyze document content';
      default:
        return 'File processing failed';
    }
  }
}

// Export singleton instances
export const fileErrorHandler = new FileUploadErrorHandler();
export const streamingErrorHandler = new FileStreamingErrorHandler();
export const errorMessageFormatter = new FileErrorMessageFormatter();

// Export all error types
export type FileError = 
  | FileUploadError 
  | FileProcessingError 
  | FileValidationError 
  | FileStorageError;