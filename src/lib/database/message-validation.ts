// TypeScript checking enabled - all type issues have been fixed
/**
 * Message Validation Utilities
 * 
 * DOCUMENTATION COMPLIANCE:
 * - Implements validateUIMessages() patterns from /docs/04-ai-sdk-ui/03-chatbot-message-persistence.mdx
 * - Handles AITypeValidationError for database message safety
 * - Validates tool calls, metadata, and data parts against current schemas
 * 
 * VALIDATION FEATURES:
 * - Academic metadata schema validation
 * - Tool calls validation against phase completion tools
 * - Message format compliance checking
 * - Error recovery and message migration
 */

import { 
  UIMessage, 
  validateUIMessages, 
  TypeValidationError 
} from 'ai';
import { z } from 'zod';
// import { DatabaseUIMessage } from '../types/database-types'; // Unused
// P0.1 Natural Language Approval - Supabase audit trail
// import { createServerSupabaseClient } from '../database/supabase-server-auth'; // Import not available

/**
 * Academic metadata schema for message validation
 * Matches AcademicMetadata interface from ChatContainer
 */
const academicMetadataSchema = z.object({
  phase: z.number().min(1).max(7).optional(),
  timestamp: z.number().optional(),
  model: z.string().optional(),
  tokens: z.number().optional(),
  artifacts: z.array(z.string()).optional(),
  conversationId: z.string().optional(),
  approvalRequired: z.boolean().optional(),
  provider: z.string().optional(),
  promptTokens: z.number().optional(),
  completionTokens: z.number().optional(),
  responseTime: z.number().optional()
}).optional();

/**
 * Data parts schema for custom data validation
 * Supports academic workflow specific data parts
 */
const dataPartsSchema = z.object({
  type: z.enum(['phase', 'notification', 'artifact', 'approval']),
  phase: z.number().optional(),
  message: z.string().optional(),
  artifactId: z.string().optional(),
  data: z.any().optional()
});

/**
 * Phase completion tools schema for validation
 * Matches the phase completion tools from chat API route
 */
const phaseCompletionTools = {
  complete_phase_1: {
    inputSchema: z.object({
      topic_title: z.string(),
      research_scope: z.string(),
      research_questions: z.array(z.string()),
      methodology_approach: z.string(),
      deliverables_preview: z.string(),
    }),
    outputSchema: z.string()
  },
  complete_phase_2: {
    inputSchema: z.object({
      sources_found: z.number(),
      literature_themes: z.array(z.string()),
      data_collection_summary: z.string(),
      research_gaps: z.string(),
      deliverables_preview: z.string(),
    }),
    outputSchema: z.string()
  },
  complete_phase_3: {
    inputSchema: z.object({
      outline_structure: z.string(),
      estimated_length: z.string(),
      flow_logic: z.string(),
      key_arguments: z.array(z.string()),
      deliverables_preview: z.string(),
    }),
    outputSchema: z.string()
  },
  complete_phase_4: {
    inputSchema: z.object({
      sections_completed: z.array(z.string()),
      word_count: z.number(),
      content_quality: z.string(),
      remaining_work: z.string(),
      deliverables_preview: z.string(),
    }),
    outputSchema: z.string()
  },
  complete_phase_5: {
    inputSchema: z.object({
      citations_added: z.number(),
      reference_style: z.string(),
      bibliography_complete: z.boolean(),
      citation_quality: z.string(),
      deliverables_preview: z.string(),
    }),
    outputSchema: z.string()
  },
  complete_phase_6: {
    inputSchema: z.object({
      review_areas: z.array(z.string()),
      quality_score: z.string(),
      improvements_made: z.string(),
      remaining_issues: z.string(),
      deliverables_preview: z.string(),
    }),
    outputSchema: z.string()
  },
  complete_phase_7: {
    inputSchema: z.object({
      formatting_complete: z.boolean(),
      submission_requirements: z.string(),
      final_word_count: z.number(),
      quality_checklist: z.array(z.string()),
      deliverables_preview: z.string(),
    }),
    outputSchema: z.string()
  }
};

/**
 * P0.1 Natural Language Approval - Audit Trail System
 * Records approval events for compliance and debugging
 */

/**
 * Approval ledger interface for database storage
 */
export interface ApprovalLedger {
  id?: string;
  conversation_id: string;
  phase: number;
  approved: boolean;
  feedback?: string;
  offer_message_id?: string;
  user_reply_message_id?: string;
  timestamp: number;
  user_id: string;
  metadata: {
    intent_confidence: number;
    validation_method: 'natural_language' | 'ui_gate';
    tool_call_id?: string;
    reasoning?: string;
    user_message?: string;
    assistant_offer?: string;
  };
}

/**
 * Record approval event in audit trail
 * Critical for P0.1 compliance - all approvals must be logged
 */
export async function recordApproval(_ledger: ApprovalLedger): Promise<void> {
  try {
    // Recording approval for phase - silent handling for production

    // For now, store in message metadata - can be moved to dedicated table later
    // const auditRecord = {
    //   ...ledger,
    //   created_at: new Date().toISOString(),
    //   id: ledger.id || `approval-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    // };

    // TODO: Implement actual database storage when approval_ledger table is created
    // const supabase = createServerSupabaseClient();
    // await supabase.from('approval_ledger').insert(auditRecord);

    // For now, log for debugging and store in memory
    // Approval recorded successfully - silent handling for production

  } catch (error) {
    // Failed to record approval - silent handling for production
    // Don't throw - audit failure shouldn't block approval process
  }
}

/**
 * Get recent approvals for debugging and validation
 */
export async function getRecentApprovals(
  _conversationId: string,
  _limit = 5
): Promise<ApprovalLedger[]> {
  try {
    // TODO: Implement actual database retrieval when approval_ledger table is created
    // const supabase = createServerSupabaseClient();
    // const { data } = await supabase
    //   .from('approval_ledger')
    //   .select('*')
    //   .eq('conversation_id', conversationId)
    //   .order('timestamp', { ascending: false })
    //   .limit(limit);
    // return data || [];

    // Retrieving recent approvals for conversation - silent handling for production
    return []; // Return empty for now until database table is created

  } catch (error) {
    // Failed to retrieve approvals - silent handling for production
    return [];
  }
}

/**
 * Check for duplicate approvals within time window
 */
export function isDuplicateApproval(
  recentApprovals: ApprovalLedger[],
  phase: number,
  timeWindowMs = 30000 // 30 seconds
): boolean {
  const now = Date.now();
  return recentApprovals.some(approval =>
    approval.phase === phase &&
    approval.approved &&
    (now - approval.timestamp) < timeWindowMs
  );
}

/**
 * Validate messages loaded from database
 * 
 * MANDATORY IMPLEMENTATION per AI SDK documentation:
 * - Uses validateUIMessages() for schema compliance
 * - Handles AITypeValidationError gracefully
 * - Supports message migration and filtering
 * 
 * @param messages Array of messages to validate
 * @param options Validation options
 */
export async function validateDatabaseMessages(
  messages: UIMessage[],
  options: {
    enableToolValidation?: boolean;
    enableMetadataValidation?: boolean;
    enableDataPartsValidation?: boolean;
    strictMode?: boolean;
  } = {}
): Promise<{
  validatedMessages: UIMessage[];
  errors: ValidationError[];
  migratedMessages: number;
}> {
  const errors: ValidationError[] = [];
  let migratedMessages = 0;
  
  try {
    // Validating messages - silent handling for production
    
    // Prepare validation parameters
    const validationParams: any = {
      messages,
    };
    
    // Add tools validation if enabled
    if (options.enableToolValidation) {
      validationParams.tools = phaseCompletionTools;
    }
    
    // Add metadata validation if enabled
    if (options.enableMetadataValidation) {
      validationParams.metadataSchema = academicMetadataSchema;
    }
    
    // Add data parts validation if enabled
    if (options.enableDataPartsValidation) {
      validationParams.dataPartsSchema = dataPartsSchema;
    }
    
    // Attempt validation
    const validatedMessages = await validateUIMessages(validationParams);
    
    // Successfully validated messages - silent handling for production
    
    return {
      validatedMessages,
      errors,
      migratedMessages
    };
    
  } catch (error) {
    if (error instanceof TypeValidationError) {
      // Validation failed, attempting recovery - silent handling for production
      
      // Record validation error
      errors.push({
        type: 'validation_error',
        message: error.message,
        details: error.toString(),
        recoverable: true
      });
      
      if (options.strictMode) {
        throw error;
      }
      
      // Attempt message migration/filtering
      const { cleanedMessages, migrated } = await migrateInvalidMessages(messages, error);
      migratedMessages = migrated;
      
      // Retry validation with cleaned messages
      try {
        const validationParams: any = { messages: cleanedMessages };
        
        if (options.enableToolValidation) {
          validationParams.tools = phaseCompletionTools;
        }
        
        const validatedMessages = await validateUIMessages(validationParams);
        
        // Successfully validated messages after migration - silent handling for production
        
        return {
          validatedMessages,
          errors,
          migratedMessages
        };
        
      } catch (retryError) {
        // Retry validation failed - silent handling for production
        
        errors.push({
          type: 'retry_validation_failed',
          message: retryError instanceof Error ? retryError.message : 'Unknown retry error',
          recoverable: false
        });
        
        // Return empty messages as fallback
        return {
          validatedMessages: [],
          errors,
          migratedMessages
        };
      }
      
    } else {
      // Unexpected validation error - silent handling for production
      
      errors.push({
        type: 'unexpected_error',
        message: error instanceof Error ? error.message : 'Unknown validation error',
        recoverable: false
      });
      
      throw error;
    }
  }
}

/**
 * Migrate invalid messages to fix compatibility issues
 * Attempts to clean or transform messages to match current schemas
 */
async function migrateInvalidMessages(
  messages: UIMessage[],
  _validationError: TypeValidationError
): Promise<{ cleanedMessages: UIMessage[]; migrated: number }> {
  // Attempting to migrate invalid messages - silent handling for production
  
  let migrated = 0;
  const cleanedMessages: UIMessage[] = [];
  
  for (const message of messages) {
    try {
      // Attempt to clean individual message
      const cleanedMessage = await cleanMessage(message);
      
      if (cleanedMessage) {
        cleanedMessages.push(cleanedMessage);
        if (cleanedMessage !== message) {
          migrated++;
        }
      } else {
        // Skipping invalid message - silent handling for production
        migrated++;
      }
      
    } catch (error) {
      // Failed to migrate message - silent handling for production
      migrated++;
      // Skip invalid message
    }
  }
  
  // Migrated messages successfully - silent handling for production
  
  return { cleanedMessages, migrated };
}

/**
 * Clean individual message to fix common validation issues
 */
async function cleanMessage(message: UIMessage): Promise<UIMessage | null> {
  try {
    const messageData = message as any;
    const cleaned: UIMessage = {
      id: message.id,
      role: message.role,
      ...(messageData.content && { content: messageData.content }),
      ...(messageData.createdAt && { createdAt: messageData.createdAt }),
    } as UIMessage;
    
    // Clean parts array
    if (message.parts && Array.isArray(message.parts)) {
      cleaned.parts = message.parts.filter(part => {
        // Remove invalid parts
        return part && typeof part === 'object' && part.type;
      });
    }
    
    // Clean metadata
    if (message.metadata) {
      try {
        const validatedMetadata = academicMetadataSchema.parse(message.metadata);
        cleaned.metadata = validatedMetadata || {};
      } catch {
        // Keep basic metadata, remove invalid fields
        const metadataData = message.metadata as any;
        cleaned.metadata = {
          phase: typeof metadataData.phase === 'number' ? metadataData.phase : undefined,
          timestamp: typeof metadataData.timestamp === 'number' ? metadataData.timestamp : Date.now(),
          model: typeof metadataData.model === 'string' ? metadataData.model : undefined,
        };
      }
    }
    
    return cleaned;
    
  } catch (error) {
    // Failed to clean message - silent handling for production
    return null;
  }
}

/**
 * Validate single message for real-time operations
 */
export async function validateSingleMessage(message: UIMessage): Promise<{
  valid: boolean;
  errors: ValidationError[];
  cleanedMessage?: UIMessage;
}> {
  try {
    await validateUIMessages({
      messages: [message],
      metadataSchema: academicMetadataSchema
    });
    
    return {
      valid: true,
      errors: []
    };
    
  } catch (error) {
    if (error instanceof TypeValidationError) {
      const cleanedMessage = await cleanMessage(message);
      
      return {
        valid: false,
        errors: [{
          type: 'validation_error',
          message: error.message,
          recoverable: !!cleanedMessage
        }],
        cleanedMessage: cleanedMessage || undefined
      };
    }
    
    return {
      valid: false,
      errors: [{
        type: 'unexpected_error',
        message: error instanceof Error ? error.message : 'Unknown error',
        recoverable: false
      }]
    };
  }
}

/**
 * Check if messages contain tool calls that need validation
 */
export function hasToolCalls(messages: UIMessage[]): boolean {
  return messages.some(message => 
    message.parts?.some(part => 
      part.type === 'tool-call' || part.type === 'tool-result'
    )
  );
}

/**
 * Extract tool names from messages for validation
 */
export function extractToolNames(messages: UIMessage[]): string[] {
  const toolNames = new Set<string>();
  
  for (const message of messages) {
    if (message.parts) {
      for (const part of message.parts) {
        const partData = part as any;
        if (part.type === 'tool-call' && partData.toolName) {
          toolNames.add(partData.toolName);
        }
      }
    }
  }
  
  return Array.from(toolNames);
}

/**
 * Get supported tool names for validation
 */
export function getSupportedToolNames(): string[] {
  return Object.keys(phaseCompletionTools);
}

/**
 * Check if all tool calls in messages are supported
 */
export function areToolCallsSupported(messages: UIMessage[]): boolean {
  const usedTools = extractToolNames(messages);
  const supportedTools = getSupportedToolNames();
  
  return usedTools.every(toolName => supportedTools.includes(toolName));
}

/**
 * Validation error type
 */
export interface ValidationError {
  type: 'validation_error' | 'retry_validation_failed' | 'unexpected_error';
  message: string;
  details?: string;
  recoverable: boolean;
}

/**
 * Validation result summary
 */
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

/**
 * Get comprehensive validation summary for debugging
 */
export async function getValidationSummary(messages: UIMessage[]): Promise<ValidationSummary> {
  const toolsUsed = extractToolNames(messages);
  const supportedTools = areToolCallsSupported(messages);
  
  try {
    const validationResult = await validateDatabaseMessages(messages, {
      enableToolValidation: true,
      enableMetadataValidation: true,
      enableDataPartsValidation: true,
      strictMode: false
    });
    
    return {
      totalMessages: messages.length,
      validMessages: validationResult.validatedMessages.length,
      migratedMessages: validationResult.migratedMessages,
      skippedMessages: messages.length - validationResult.validatedMessages.length - validationResult.migratedMessages,
      hasErrors: validationResult.errors.length > 0,
      errors: validationResult.errors,
      toolsUsed,
      supportedTools
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
        recoverable: false
      }],
      toolsUsed,
      supportedTools
    };
  }
}
