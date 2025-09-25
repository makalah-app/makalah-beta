/**
 * Input Validation Schemas for AI Operations
 * Zod schemas for validating AI SDK inputs and configurations
 * 
 * Based on Vercel AI SDK v5 Core validation patterns from:
 * - /documentation/docs/03-ai-sdk-core/15-tools-and-tool-calling.mdx  
 * - /documentation/docs/03-ai-sdk-core/05-generating-text.mdx
 */

import { z } from 'zod';
import { ACADEMIC_WORKFLOW_CONFIG, TOOL_CONFIG } from './constants';

/**
 * Base message validation schema
 */
export const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string().min(1, 'Message content cannot be empty'),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.date().optional(),
});

/**
 * Conversation messages validation schema
 */
export const messagesSchema = z.array(messageSchema).min(1, 'At least one message is required');

/**
 * Academic phase validation schema
 */
export const academicPhaseSchema = z.enum(ACADEMIC_WORKFLOW_CONFIG.phases);

/**
 * Approval gate validation schema  
 */
export const approvalGateSchema = z.enum(ACADEMIC_WORKFLOW_CONFIG.approvalGates);

/**
 * Streaming text request validation schema
 */
export const streamTextRequestSchema = z.object({
  messages: messagesSchema,
  phase: academicPhaseSchema.optional(),
  maxTokens: z.number().int().positive().max(16384).optional(),
  temperature: z.number().min(0).max(2).optional(),
  tools: z.record(z.any()).optional(),
  toolChoice: z.enum(['auto', 'required', 'none']).optional(),
  abortSignal: z.instanceof(AbortSignal).optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  workflowId: z.string().optional(),
});

/**
 * Tool call validation schema
 */
export const toolCallSchema = z.object({
  id: z.string(),
  type: z.literal('function'),
  function: z.object({
    name: z.string().min(1),
    arguments: z.string(),
  }),
});

/**
 * Tool result validation schema
 */
export const toolResultSchema = z.object({
  toolCallId: z.string(),
  result: z.unknown(),
  error: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Provider configuration validation schema
 */
export const providerConfigSchema = z.object({
  name: z.string().min(1),
  apiKey: z.string().min(1),
  baseURL: z.string().url(),
  model: z.string().min(1),
  maxTokens: z.number().int().positive(),
  temperature: z.number().min(0).max(2),
  timeout: z.number().int().positive().optional(),
  retryAttempts: z.number().int().min(0).max(10).optional(),
});

/**
 * Academic workflow state validation schema
 */
export const workflowStateSchema = z.object({
  workflowId: z.string(),
  currentPhase: academicPhaseSchema,
  completedPhases: z.array(academicPhaseSchema),
  pendingApproval: approvalGateSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
  startedAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Rate limiting validation schema
 */
export const rateLimitSchema = z.object({
  key: z.string().min(1),
  windowSizeMs: z.number().int().positive(),
  maxRequests: z.number().int().positive(),
  maxTokens: z.number().int().positive().optional(),
});

/**
 * SSE event validation schema
 */
export const sseEventSchema = z.object({
  type: z.string().min(1),
  id: z.string().optional(),
  data: z.unknown(),
  retry: z.number().int().positive().optional(),
});

/**
 * Health check response validation schema
 */
export const healthCheckSchema = z.object({
  provider: z.string(),
  status: z.enum(['healthy', 'unhealthy', 'degraded']),
  responseTimeMs: z.number().int().nonnegative(),
  error: z.string().optional(),
  timestamp: z.date(),
});

/**
 * Token usage validation schema
 */
export const tokenUsageSchema = z.object({
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  provider: z.string(),
  model: z.string(),
  timestamp: z.date(),
});

/**
 * Error response validation schema
 */
export const errorResponseSchema = z.object({
  error: z.string().min(1),
  code: z.string().optional(),
  provider: z.string().optional(),
  retryAfter: z.number().int().positive().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Validation utility functions
 */
export const validateInput = {
  /**
   * Validate stream text request
   */
  streamTextRequest: (input: unknown) => {
    return streamTextRequestSchema.parse(input);
  },

  /**
   * Validate messages array
   */
  messages: (input: unknown) => {
    return messagesSchema.parse(input);
  },

  /**
   * Validate academic phase
   */
  academicPhase: (input: unknown) => {
    return academicPhaseSchema.parse(input);
  },

  /**
   * Validate provider configuration
   */
  providerConfig: (input: unknown) => {
    return providerConfigSchema.parse(input);
  },

  /**
   * Validate workflow state
   */
  workflowState: (input: unknown) => {
    return workflowStateSchema.parse(input);
  },

  /**
   * Validate SSE event
   */
  sseEvent: (input: unknown) => {
    return sseEventSchema.parse(input);
  },

  /**
   * Validate token usage
   */
  tokenUsage: (input: unknown) => {
    return tokenUsageSchema.parse(input);
  },
};

/**
 * Safe validation functions that return results with error handling
 */
export const safeValidate = {
  /**
   * Safe stream text request validation
   */
  streamTextRequest: (input: unknown) => {
    return streamTextRequestSchema.safeParse(input);
  },

  /**
   * Safe messages validation
   */
  messages: (input: unknown) => {
    return messagesSchema.safeParse(input);
  },

  /**
   * Safe provider configuration validation
   */
  providerConfig: (input: unknown) => {
    return providerConfigSchema.safeParse(input);
  },

  /**
   * Safe workflow state validation
   */
  workflowState: (input: unknown) => {
    return workflowStateSchema.safeParse(input);
  },
};