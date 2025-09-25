/* @ts-nocheck */
/**
 * Message Validation Utilities
 *
 * Simplified helpers for validating UIMessage payloads before persisting them
 * to the database. Phase-specific approval logic has been removed in favour of
 * a generic schema that keeps metadata and tool parts loosely validated while
 * still guarding against malformed payloads.
 */

import {
  UIMessage,
  validateUIMessages,
  TypeValidationError
} from 'ai';
import { z } from 'zod';

/**
 * Metadata schema used when validating stored UI messages.
 * Fields remain optional so previously stored data stays compatible.
 */
export const academicMetadataSchema = z.object({
  topic: z.string().optional(),
  timestamp: z.number().optional(),
  model: z.string().optional(),
  tokens: z.number().optional(),
  conversationId: z.string().optional(),
  workflowId: z.string().optional(),
  provider: z.string().optional(),
  promptTokens: z.number().optional(),
  completionTokens: z.number().optional(),
  responseTime: z.number().optional(),
}).optional();

/**
 * Loose data part schema that keeps common keys without enforcing
 * workflow-specific requirements.
 */
const dataPartsSchema = z.object({
  type: z.string(),
  phase: z.number().optional(),
  message: z.string().optional(),
  artifactId: z.string().optional(),
  data: z.any().optional(),
});

export interface ValidationError {
  type: 'validation_error' | 'retry_validation_failed' | 'unexpected_error';
  message: string;
  details?: string;
  recoverable: boolean;
}

export interface ValidationSummary {
  totalMessages: number;
  validMessages: number;
  migratedMessages: number;
  skippedMessages: number;
  hasErrors: boolean;
  errors: ValidationError[];
  toolsUsed: string[];
  supportedTools: boolean;
}

interface ValidationOptions {
  validateMetadata?: boolean;
  validateDataParts?: boolean;
  strictMode?: boolean;
}

/**
 * Validate persisted messages, attempting light recovery when validation fails.
 */
export async function validateDatabaseMessages(
  messages: UIMessage[],
  options: ValidationOptions = {}
): Promise<{
  validatedMessages: UIMessage[];
  errors: ValidationError[];
  migratedMessages: number;
}> {
  const errors: ValidationError[] = [];
  let migratedMessages = 0;

  try {
    const validationParams: any = { messages };

    if (options.validateMetadata !== false) {
      validationParams.metadataSchema = academicMetadataSchema;
    }

    if (options.validateDataParts) {
      validationParams.dataPartsSchema = dataPartsSchema;
    }

    const validatedMessages = await validateUIMessages(validationParams);

    return {
      validatedMessages,
      errors,
      migratedMessages,
    };
  } catch (error) {
    if (error instanceof TypeValidationError) {
      errors.push({
        type: 'validation_error',
        message: error.message,
        details: error.toString(),
        recoverable: true,
      });

      if (options.strictMode) {
        throw error;
      }

      const { cleanedMessages, migrated } = await migrateInvalidMessages(messages);
      migratedMessages = migrated;

      try {
        const retryParams: any = { messages: cleanedMessages };

        if (options.validateMetadata !== false) {
          retryParams.metadataSchema = academicMetadataSchema;
        }

        if (options.validateDataParts) {
          retryParams.dataPartsSchema = dataPartsSchema;
        }

        const validatedMessages = await validateUIMessages(retryParams);

        return {
          validatedMessages,
          errors,
          migratedMessages,
        };
      } catch (retryError) {
        errors.push({
          type: 'retry_validation_failed',
          message: retryError instanceof Error ? retryError.message : 'Unknown retry error',
          recoverable: false,
        });

        return {
          validatedMessages: [],
          errors,
          migratedMessages,
        };
      }
    }

    errors.push({
      type: 'unexpected_error',
      message: error instanceof Error ? error.message : 'Unknown validation error',
      recoverable: false,
    });
    throw error;
  }
}

/**
 * Attempt to recover messages that failed validation by pruning invalid parts
 * and metadata while keeping as much content as possible.
 */
async function migrateInvalidMessages(messages: UIMessage[]): Promise<{ cleanedMessages: UIMessage[]; migrated: number }> {
  let migrated = 0;
  const cleanedMessages: UIMessage[] = [];

  for (const message of messages) {
    try {
      const cleanedMessage = await cleanMessage(message);

      if (cleanedMessage) {
        cleanedMessages.push(cleanedMessage);
        if (cleanedMessage !== message) {
          migrated++;
        }
      } else {
        migrated++;
      }
    } catch {
      migrated++;
    }
  }

  return { cleanedMessages, migrated };
}

/**
 * Remove obviously broken parts from a single message while retaining content.
 */
async function cleanMessage(message: UIMessage): Promise<UIMessage | null> {
  try {
    const cleaned: UIMessage = {
      id: message.id,
      role: message.role,
      content: message.content || '',
      createdAt: message.createdAt,
    };

    if (Array.isArray(message.parts)) {
      cleaned.parts = message.parts.filter(part => part && typeof part === 'object' && part.type);
    }

    if (message.metadata) {
      try {
        cleaned.metadata = academicMetadataSchema.parse(message.metadata) || {};
      } catch {
        cleaned.metadata = {
          timestamp: typeof message.metadata.timestamp === 'number' ? message.metadata.timestamp : Date.now(),
          model: typeof message.metadata.model === 'string' ? message.metadata.model : undefined,
          tokens: typeof message.metadata.tokens === 'number' ? message.metadata.tokens : undefined,
        };
      }
    }

    return cleaned;
  } catch {
    return null;
  }
}

/**
 * Lightweight single-message validation helper used before save operations.
 */
export async function validateSingleMessage(message: UIMessage): Promise<{
  valid: boolean;
  errors: ValidationError[];
  cleanedMessage?: UIMessage;
}> {
  try {
    await validateUIMessages({
      messages: [message],
      metadataSchema: academicMetadataSchema,
    });

    return {
      valid: true,
      errors: [],
    };
  } catch (error) {
    if (error instanceof TypeValidationError) {
      const cleanedMessage = await cleanMessage(message);

      return {
        valid: false,
        errors: [{
          type: 'validation_error',
          message: error.message,
          recoverable: !!cleanedMessage,
        }],
        cleanedMessage: cleanedMessage || undefined,
      };
    }

    return {
      valid: false,
      errors: [{
        type: 'unexpected_error',
        message: error instanceof Error ? error.message : 'Unknown error',
        recoverable: false,
      }],
    };
  }
}

export function hasToolCalls(messages: UIMessage[]): boolean {
  return messages.some(message =>
    message.parts?.some(part => part.type === 'tool-call' || part.type === 'tool-result')
  );
}

export function extractToolNames(messages: UIMessage[]): string[] {
  const toolNames = new Set<string>();

  for (const message of messages) {
    if (!message.parts) continue;

    for (const part of message.parts) {
      if (part.type === 'tool-call' && part.toolName) {
        toolNames.add(part.toolName);
      }
      if (part.type === 'tool-result' && part.toolName) {
        toolNames.add(part.toolName);
      }
    }
  }

  return Array.from(toolNames);
}

export function areToolCallsSupported(): boolean {
  // With the approval workflow removed we no longer gate tool usage.
  return true;
}

export async function getValidationSummary(messages: UIMessage[]): Promise<ValidationSummary> {
  const toolsUsed = extractToolNames(messages);
  const supportedTools = areToolCallsSupported();

  try {
    const validationResult = await validateDatabaseMessages(messages, {
      validateMetadata: true,
      validateDataParts: true,
      strictMode: false,
    });

    return {
      totalMessages: messages.length,
      validMessages: validationResult.validatedMessages.length,
      migratedMessages: validationResult.migratedMessages,
      skippedMessages: Math.max(0, messages.length - validationResult.validatedMessages.length),
      hasErrors: validationResult.errors.length > 0,
      errors: validationResult.errors,
      toolsUsed,
      supportedTools,
    };
  } catch (error) {
    return {
      totalMessages: messages.length,
      validMessages: 0,
      migratedMessages: 0,
      skippedMessages: messages.length,
      hasErrors: true,
      errors: [{
        type: 'unexpected_error',
        message: error instanceof Error ? error.message : 'Validation summary failed',
        recoverable: false,
      }],
      toolsUsed,
      supportedTools,
    };
  }
}
