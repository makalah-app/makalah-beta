/**
 * AI SDK Bridge - Simplified Natural LLM Intelligence
 *
 * Simplified bridge following the philosophy:
 * "Trust natural LLM intelligence instead of rigid programmatic control"
 *
 * Based on AI SDK v5 Core streamText:
 * - /documentation/docs/03-ai-sdk-core/05-generating-text.mdx
 */

import { streamText, generateText, LanguageModel } from 'ai';
import type { ModelMessage, ToolSet } from 'ai';
import { getDynamicModelConfig } from '../../dynamic-config';

/**
 * Simple bridge configuration
 */
export interface SimpleBridgeConfig {
  provider: LanguageModel;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Simple request options
 */
export interface SimpleRequestOptions {
  tools?: ToolSet;
  temperature?: number;
  maxTokens?: number;
  abortSignal?: AbortSignal;
}

/**
 * Simple AI SDK Bridge - trusts natural LLM intelligence
 */
export class SimpleAISDKBridge {
  private config: SimpleBridgeConfig;

  constructor(config: SimpleBridgeConfig) {
    this.config = config;
  }

  /**
   * Simple stream text
   */
  async streamText(messages: ModelMessage[], options: SimpleRequestOptions = {}) {
    // Get dynamic configuration from admin panel
    const dynamicConfig = await getDynamicModelConfig();

    return await streamText({
      model: this.config.provider,
      messages,
      temperature: options.temperature ?? this.config.temperature ?? dynamicConfig.config.temperature,
      maxOutputTokens: options.maxTokens ?? this.config.maxTokens ?? dynamicConfig.config.maxTokens,
      tools: options.tools,
      abortSignal: options.abortSignal,
    });
  }

  /**
   * Simple generate text
   */
  async generateText(messages: ModelMessage[], options: SimpleRequestOptions = {}) {
    // Get dynamic configuration from admin panel
    const dynamicConfig = await getDynamicModelConfig();

    return await generateText({
      model: this.config.provider,
      messages,
      temperature: options.temperature ?? this.config.temperature ?? dynamicConfig.config.temperature,
      maxOutputTokens: options.maxTokens ?? this.config.maxTokens ?? dynamicConfig.config.maxTokens,
      tools: options.tools,
    });
  }
}

/**
 * Global bridge instance
 */
let globalBridge: SimpleAISDKBridge | null = null;

/**
 * Get global AI SDK bridge
 */
export function getAISDKBridge(config?: SimpleBridgeConfig): SimpleAISDKBridge {
  if (!globalBridge && config) {
    globalBridge = new SimpleAISDKBridge(config);
  }
  if (!globalBridge) {
    throw new Error('AI SDK Bridge not initialized. Please provide config.');
  }
  return globalBridge;
}

/**
 * Factory function for backward compatibility
 */
export function createAISDKBridge(config: SimpleBridgeConfig) {
  return new SimpleAISDKBridge(config);
}

// Export for legacy support
export const AISDKBridgeManager = SimpleAISDKBridge;
export default SimpleAISDKBridge;