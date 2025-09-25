/**
 * Event Schemas - Simplified Natural LLM Intelligence
 *
 * Simplified event schemas following the philosophy:
 * "Trust natural LLM intelligence instead of rigid programmatic control"
 *
 * Based on AI SDK v5 Core streamText:
 * - /documentation/docs/03-ai-sdk-core/05-generating-text.mdx
 */

import { z } from 'zod';

/**
 * Simple event types
 */
export type SimpleEventType =
  | 'text-delta'
  | 'tool-call'
  | 'tool-result'
  | 'error'
  | 'done';

/**
 * Simple streaming event schema
 */
export const SimpleEventSchema = z.object({
  type: z.enum(['text-delta', 'tool-call', 'tool-result', 'error', 'done']),
  data: z.any(),
  timestamp: z.number()
});

/**
 * Text delta event schema
 */
export const TextDeltaEventSchema = z.object({
  type: z.literal('text-delta'),
  data: z.object({
    delta: z.string()
  }),
  timestamp: z.number()
});

/**
 * Tool call event schema
 */
export const ToolCallEventSchema = z.object({
  type: z.literal('tool-call'),
  data: z.object({
    toolCallId: z.string(),
    toolName: z.string(),
    args: z.record(z.any())
  }),
  timestamp: z.number()
});

/**
 * Tool result event schema
 */
export const ToolResultEventSchema = z.object({
  type: z.literal('tool-result'),
  data: z.object({
    toolCallId: z.string(),
    result: z.any()
  }),
  timestamp: z.number()
});

/**
 * Error event schema
 */
export const ErrorEventSchema = z.object({
  type: z.literal('error'),
  data: z.object({
    error: z.string()
  }),
  timestamp: z.number()
});

/**
 * Done event schema
 */
export const DoneEventSchema = z.object({
  type: z.literal('done'),
  data: z.any(),
  timestamp: z.number()
});

/**
 * Simple validation function - trusts LLM to provide valid data
 */
export function validateEvent(data: unknown): boolean {
  try {
    SimpleEventSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

// Export for legacy support
export const EventSchemas = {
  SimpleEvent: SimpleEventSchema,
  TextDeltaEvent: TextDeltaEventSchema,
  ToolCallEvent: ToolCallEventSchema,
  ToolResultEvent: ToolResultEventSchema,
  ErrorEvent: ErrorEventSchema,
  DoneEvent: DoneEventSchema
};