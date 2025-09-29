/**
 * OpenRouter Provider Implementation with Gemini 2.5 Pro Configuration
 * Primary AI provider setup with academic writing optimizations
 * 
 * Based on Vercel AI SDK v5 Core patterns from:
 * - /documentation/providers/03-community-providers/13-openrouter.mdx
 * - /documentation/docs/03-ai-sdk-core/45-provider-management.mdx
 */

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { wrapLanguageModel, defaultSettingsMiddleware } from 'ai';

import { getOpenRouterAPIKey, getProviderBaseURLs } from '../../config/api-keys';
import { env } from '../../config/env';
import { getDynamicSystemPrompt, getDynamicModelConfig } from '../dynamic-config';

/**
 * OpenRouter provider configuration
 */
export interface OpenRouterConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  headers?: Record<string, string>;
}

/**
 * Create OpenRouter provider instance with academic configuration
 */
export function createOpenRouterProvider(): ReturnType<typeof createOpenRouter> {
  const apiKey = getOpenRouterAPIKey();
  const { openrouter: baseURL } = getProviderBaseURLs();

  const provider = createOpenRouter({
    apiKey,
    baseURL,
    // OpenRouter specific headers for analytics and identification
    headers: {
      'HTTP-Referer': 'https://makalah-ai.vercel.app',
      'X-Title': 'Makalah AI Academic Writing Platform',
      'User-Agent': 'MakalahAI/1.0.0 (Academic Writing Platform)',
    },
  });

  if (env.NODE_ENV === 'development') {
    // OpenRouter provider initialized - silent handling for production
  }

  return provider;
}

/**
 * Create wrapped OpenRouter model with academic persona and settings
 * Now uses database-driven configuration from admin panel instead of hardcoded ones
 * Returns object with model and systemPrompt for proper AI SDK v5 usage
 */
export async function createAcademicOpenRouterModel() {
  const provider = createOpenRouterProvider();

  // Get dynamic configuration from admin panel database
  const dynamicConfig = await getDynamicModelConfig();

  // Create chat model with dynamic model selection
  const baseModel = provider.chat(dynamicConfig.primaryModelName);

  // Get system prompt from database instead of hardcoded constants
  const systemPrompt = await getDynamicSystemPrompt();

  // Wrap with academic settings from admin panel (system prompt returned separately)
  const academicModel = wrapLanguageModel({
    model: baseModel,
    middleware: defaultSettingsMiddleware({
      settings: {
        maxOutputTokens: dynamicConfig.config.maxTokens, // ✅ Dynamic from admin panel
        temperature: dynamicConfig.config.temperature, // ✅ Dynamic from admin panel
        topP: 0.98, // Keep Gemini-specific optimization
        frequencyPenalty: dynamicConfig.config.frequencyPenalty, // ✅ Dynamic from admin panel
        presencePenalty: dynamicConfig.config.presencePenalty, // ✅ Dynamic from admin panel
      },
    }),
  });

  // Return model with systemPrompt for proper AI SDK v5 usage
  return {
    model: academicModel,
    systemPrompt, // ✅ Dynamic system prompt from database (pass to generateText/streamText)
  };
}

/**
 * OpenRouter model variants with different configurations
 */
export const openRouterModels = {
  /**
   * Primary academic model - Gemini 2.5 Flash Thinking Experimental
   * Optimized for academic writing with reasoning capabilities
   */
  academic: async () => await createAcademicOpenRouterModel(),
  
  /**
   * High creativity model for brainstorming and ideation
   */
  creative: async () => {
    const provider = createOpenRouterProvider();

    // Get dynamic configuration from admin panel database
    const dynamicConfig = await getDynamicModelConfig();
    const baseModel = provider.chat(dynamicConfig.primaryModelName);

    // Get dynamic system prompt from database
    const baseSystemPrompt = await getDynamicSystemPrompt();
    const systemPrompt = `${baseSystemPrompt}\n\nFocus on creative and innovative approaches while maintaining academic rigor.`;

    const creativeModel = wrapLanguageModel({
      model: baseModel,
      middleware: defaultSettingsMiddleware({
        settings: {
          maxOutputTokens: dynamicConfig.config.maxTokens, // ✅ Dynamic from admin panel
          temperature: Math.min(dynamicConfig.config.temperature * 9, 0.9), // ✅ Dynamic base * 9 (capped at 0.9)
          topP: 0.95,
          frequencyPenalty: 0.3,
          presencePenalty: 0.3,
        },
      }),
    });

    // Return model with systemPrompt for proper AI SDK v5 usage
    return {
      model: creativeModel,
      systemPrompt, // ✅ Dynamic system prompt + creative-specific instructions
    };
  },
  
  /**
   * Precise model for citations and technical content
   */
  precise: async () => {
    const provider = createOpenRouterProvider();

    // Get dynamic configuration from admin panel database
    const dynamicConfig = await getDynamicModelConfig();
    const baseModel = provider.chat(dynamicConfig.primaryModelName);

    // Get dynamic system prompt from database
    const baseSystemPrompt = await getDynamicSystemPrompt();
    const systemPrompt = `${baseSystemPrompt}\n\nPrioritize accuracy, precision, and proper citation formatting.`;

    const preciseModel = wrapLanguageModel({
      model: baseModel,
      middleware: defaultSettingsMiddleware({
        settings: {
          maxOutputTokens: dynamicConfig.config.maxTokens, // ✅ Dynamic from admin panel
          temperature: Math.max(dynamicConfig.config.temperature * 3, 0.05), // ✅ Dynamic base * 3 (minimum 0.05)
          topP: 0.85,
          frequencyPenalty: 0.1,
          presencePenalty: 0.1,
        },
      }),
    });

    // Return model with systemPrompt for proper AI SDK v5 usage
    return {
      model: preciseModel,
      systemPrompt, // ✅ Dynamic system prompt + precision-specific instructions
    };
  },
};

/**
 * OpenRouter health check configuration
 */
export const openRouterHealthConfig = {
  endpoint: '/models',
  timeout: 5000,
  expectedModels: [
    'google/gemini-2.5-pro',
    'google/gemini-2.5-flash',
  ],
};

/**
 * Test OpenRouter connection and model availability
 */
export async function testOpenRouterConnection(): Promise<{
  success: boolean;
  responseTimeMs: number;
  availableModels?: string[];
  error?: string;
}> {
  const startTime = Date.now();

  try {
    const provider = createOpenRouterProvider();

    // Get dynamic configuration, with fallback for testing reliability
    let modelName = 'google/gemini-2.5-flash'; // Fallback for testing
    let testTemperature = 0.1; // Fallback for testing

    try {
      const dynamicConfig = await getDynamicModelConfig();
      modelName = dynamicConfig.primaryModelName; // ✅ Dynamic from admin panel
      testTemperature = dynamicConfig.config.temperature; // ✅ Dynamic from admin panel
    } catch (configError) {
      // Use fallback values if dynamic config fails (for test reliability)
      // Using fallback config for test reliability - silent handling for production
    }

    const model = provider.chat(modelName);

    // Simple test request to verify connectivity using AI SDK v5 syntax
    await model.doGenerate({
      prompt: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Hello' }],
        },
      ],
      maxOutputTokens: 10, // ✅ Correct property name for AI SDK v5
      temperature: testTemperature, // ✅ Dynamic temperature from admin panel
      topP: 0.9,
      abortSignal: AbortSignal.timeout(5000),
    });

    const responseTimeMs = Date.now() - startTime;
    
    return {
      success: true,
      responseTimeMs,
      availableModels: [modelName], // ✅ Using dynamic model name
    };
    
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    
    return {
      success: false,
      responseTimeMs,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get OpenRouter model information with dynamic configuration
 */
export async function getOpenRouterModelInfo() {
  // Get dynamic configuration from admin panel
  const dynamicConfig = await getDynamicModelConfig();

  return {
    provider: 'openrouter',
    model: dynamicConfig.primaryModelName, // ✅ Dynamic from admin panel
    displayName: 'Gemini 2.5 Flash Thinking (Experimental)',
    description: 'Google\'s experimental reasoning model optimized for academic writing',
    capabilities: [
      'reasoning',
      'long-context',
      'academic-writing',
      'citation-formatting',
      'research-analysis',
    ],
    limits: {
      maxTokens: dynamicConfig.config.maxTokens, // ✅ Dynamic from admin panel
      contextWindow: 1000000, // 1M tokens context window
      requestsPerMinute: 60,
      tokensPerMinute: 100000,
    },
    pricing: {
      inputCostPer1KTokens: 0.00001, // Approximate
      outputCostPer1KTokens: 0.00005, // Approximate
    },
  };
}
