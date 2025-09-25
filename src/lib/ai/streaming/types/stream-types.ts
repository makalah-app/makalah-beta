/**
 * Stream Types - Simplified Natural LLM Intelligence
 *
 * Simplified type definitions following the philosophy:
 * "Trust natural LLM intelligence instead of rigid programmatic control"
 *
 * Based on AI SDK v5 Core streamText:
 * - /documentation/docs/03-ai-sdk-core/05-generating-text.mdx
 */

import { LanguageModel } from 'ai';
import type { ModelMessage } from 'ai';

/**
 * Simple streaming event
 */
export interface SimpleStreamingEvent {
  type: 'text-delta' | 'tool-call' | 'tool-result' | 'error' | 'done';
  data: any;
  timestamp: number;
}

/**
 * Simple stream configuration
 */
export interface SimpleStreamConfig {
  temperature?: number;
  maxTokens?: number;
  tools?: any;
}

/**
 * Simple streaming request
 */
export interface SimpleStreamRequest {
  messages: ModelMessage[];
  config?: SimpleStreamConfig;
  abortSignal?: AbortSignal;
}

/**
 * Simple tool result
 */
export interface SimpleToolResult {
  success: boolean;
  data: any;
  error?: string;
}

/**
 * Simple provider selection
 */
export interface SimpleProviderSelection {
  provider: LanguageModel;
  name: string;
}

/**
 * Simple event handler
 */
export type SimpleEventHandler = (event: SimpleStreamingEvent) => void;

/**
 * Simple stream generator
 */
export type SimpleStreamGenerator<T> = AsyncGenerator<T, void, unknown>;

// Export for legacy support
export const StreamTypes = {
  SimpleStreamingEvent: 'SimpleStreamingEvent',
  SimpleStreamConfig: 'SimpleStreamConfig',
  SimpleStreamRequest: 'SimpleStreamRequest',
  SimpleToolResult: 'SimpleToolResult',
  SimpleProviderSelection: 'SimpleProviderSelection'
} as const;