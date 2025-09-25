/**
 * Text Generator - Simplified Natural LLM Intelligence
 *
 * Simplified text generation following the philosophy:
 * "Trust natural LLM intelligence instead of rigid programmatic control"
 *
 * Based on AI SDK v5 Core streamText:
 * - /documentation/docs/03-ai-sdk-core/05-generating-text.mdx
 */

import { streamText } from 'ai';
import type { ModelMessage, ToolSet } from 'ai';
import { selectBestProvider } from '../providers';
import { getDynamicModelConfig } from '../dynamic-config';

/**
 * Simple streaming configuration
 */
export interface SimpleStreamConfig {
  temperature?: number;
  maxTokens?: number;
  tools?: ToolSet;
}

/**
 * Simple streaming request
 */
export interface StreamTextRequest {
  messages: ModelMessage[];
  config?: SimpleStreamConfig;
  abortSignal?: AbortSignal;
}

/**
 * Simple text generator - trusts natural LLM intelligence
 */
export class SimpleTextGenerator {
  /**
   * Generate streaming text response
   */
  static async generateStreamingText(request: StreamTextRequest) {
    const { messages, config = {}, abortSignal } = request;

    try {
      // Get dynamic configuration from admin panel
      const dynamicConfig = await getDynamicModelConfig();

      // Get best available provider
      const selection = await selectBestProvider();

      // Simple streamText call - trust AI SDK v5
      const result = await streamText({
        model: selection.provider,
        messages,
        temperature: config.temperature ?? dynamicConfig.config.temperature,
        maxOutputTokens: config.maxTokens ?? dynamicConfig.config.maxTokens,
        tools: config.tools,
        abortSignal,
      });

      return {
        textStream: result.textStream,
        fullStream: result.fullStream,
        finishReason: result.finishReason,
        usage: result.usage,
      };

    } catch (error) {
      console.error('[TextGenerator] Streaming failed:', error);
      throw error;
    }
  }

  /**
   * Simple text completion without streaming
   */
  static async generateText(messages: ModelMessage[], config?: SimpleStreamConfig) {
    // Get dynamic configuration from admin panel
    const dynamicConfig = await getDynamicModelConfig();
    const selection = await selectBestProvider();

    try {
      const result = await streamText({
        model: selection.provider,
        messages,
        temperature: config?.temperature ?? dynamicConfig.config.temperature,
        maxOutputTokens: config?.maxTokens ?? dynamicConfig.config.maxTokens,
        tools: config?.tools,
      });

      // Convert stream to text
      let fullText = '';
      for await (const chunk of result.textStream) {
        fullText += chunk;
      }

      return {
        text: fullText,
        finishReason: await result.finishReason,
        usage: await result.usage,
      };

    } catch (error) {
      console.error('[TextGenerator] Text generation failed:', error);
      throw error;
    }
  }
}

/**
 * Factory function for backward compatibility
 */
export function createTextGenerator() {
  return SimpleTextGenerator;
}

// Export for legacy support
export const generateStreamingText = SimpleTextGenerator.generateStreamingText;
export const generateText = SimpleTextGenerator.generateText;