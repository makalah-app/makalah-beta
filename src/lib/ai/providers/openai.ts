/**
 * OpenAI Fallback Provider Implementation  
 * Secondary AI provider setup with GPT-4o configuration
 * 
 * Based on Vercel AI SDK v5 Core patterns from:
 * - /documentation/providers/01-ai-sdk-providers/03-openai.mdx
 * - /documentation/docs/03-ai-sdk-core/45-provider-management.mdx
 */

import { createOpenAI } from '@ai-sdk/openai';
import { wrapLanguageModel, defaultSettingsMiddleware } from 'ai';

import { getOpenAIAPIKey, getProviderBaseURLs } from '../../config/api-keys';
import { env } from '../../config/env';
import { getDynamicSystemPrompt, getDynamicModelConfig } from '../dynamic-config';

/**
 * OpenAI provider configuration
 */
export interface OpenAIConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

/**
 * Create OpenAI provider instance with academic configuration
 */
export function createOpenAIProvider() {
  const apiKey = getOpenAIAPIKey();
  const { openai: baseURL } = getProviderBaseURLs();

  const provider = createOpenAI({
    apiKey,
    baseURL,
  });

  if (env.NODE_ENV === 'development') {
    console.log('🤖 OpenAI provider initialized (fallback)');
    console.log(`  Base URL: ${baseURL}`);
    console.log('  Model: [Dynamic - configured from admin panel]');
  }

  return provider;
}

/**
 * Create wrapped OpenAI model with academic persona and settings
 * Now uses database-driven configuration from admin panel instead of hardcoded ones
 * Returns object with model and systemPrompt for proper AI SDK v5 usage
 */
export async function createAcademicOpenAIModel() {
  const provider = createOpenAIProvider();

  // Get dynamic configuration from admin panel database
  const dynamicConfig = await getDynamicModelConfig();

  // Create base model with dynamic model selection (fallback model)
  const baseModel = provider(dynamicConfig.fallbackModelName);

  // Get system prompt from database instead of hardcoded constants
  const systemPrompt = await getDynamicSystemPrompt();

  // Wrap with academic settings from admin panel (system prompt returned separately)
  const academicModel = wrapLanguageModel({
    model: baseModel,
    middleware: defaultSettingsMiddleware({
      settings: {
        maxOutputTokens: dynamicConfig.config.maxTokens, // ✅ Dynamic from admin panel
        temperature: dynamicConfig.config.temperature, // ✅ Dynamic from admin panel
        topP: 0.9, // Keep OpenAI-specific optimization
        frequencyPenalty: dynamicConfig.config.frequencyPenalty, // ✅ Dynamic from admin panel
        presencePenalty: dynamicConfig.config.presencePenalty, // ✅ Dynamic from admin panel
        // OpenAI specific settings
        providerOptions: {
          openai: {
            store: false, // Don't store conversations for privacy
            metadata: {
              application: 'makalah-ai',
              version: '1.0.0',
            },
          },
        },
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
 * OpenAI model variants with different configurations
 */
export const openAIModels = {
  /**
   * Primary fallback model - GPT-4o
   * Balanced for academic writing with good performance
   */
  academic: async () => await createAcademicOpenAIModel(),
  
  /**
   * Fast model for quick responses - GPT-4o Mini
   */
  fast: async () => {
    const provider = createOpenAIProvider();

    // Get dynamic configuration from admin panel database
    const dynamicConfig = await getDynamicModelConfig();

    // Use GPT-4o Mini for fast responses
    const baseModel = provider('gpt-4o-mini');

    // Get dynamic system prompt from database
    const baseSystemPrompt = await getDynamicSystemPrompt();
    const systemPrompt = `${baseSystemPrompt}\n\nProvide concise, focused responses while maintaining academic standards.`;

    const fastModel = wrapLanguageModel({
      model: baseModel,
      middleware: defaultSettingsMiddleware({
        settings: {
          maxOutputTokens: 2048, // Lower for faster responses
          temperature: dynamicConfig.config.temperature, // ✅ Dynamic from admin panel
          topP: 0.9, // Keep OpenAI-specific optimization
          frequencyPenalty: 0.1,
          presencePenalty: 0.1,
          providerOptions: {
            openai: {
              store: false,
              metadata: {
                application: 'makalah-ai',
                variant: 'fast',
              },
            },
          },
        },
      }),
    });

    // Return model with systemPrompt for proper AI SDK v5 usage
    return {
      model: fastModel,
      systemPrompt, // ✅ Dynamic system prompt + fast-specific instructions
    };
  },
  
  /**
   * High-quality model for complex analysis - GPT-4
   */
  premium: async () => {
    const provider = createOpenAIProvider();

    // Get dynamic configuration from admin panel database
    const dynamicConfig = await getDynamicModelConfig();

    // Use GPT-4o for high-quality analysis
    const baseModel = provider('gpt-4o');

    // Get dynamic system prompt from database
    const baseSystemPrompt = await getDynamicSystemPrompt();
    const systemPrompt = `${baseSystemPrompt}\n\nProvide in-depth, comprehensive analysis with thorough reasoning.`;

    const premiumModel = wrapLanguageModel({
      model: baseModel,
      middleware: defaultSettingsMiddleware({
        settings: {
          maxOutputTokens: 8192, // Higher for detailed responses
          temperature: Math.min(dynamicConfig.config.temperature * 7, 0.7), // ✅ Dynamic base * 7 (capped at 0.7)
          topP: 0.95,
          frequencyPenalty: 0.0,
          presencePenalty: 0.0,
          providerOptions: {
            openai: {
              store: false,
              metadata: {
                application: 'makalah-ai',
                variant: 'premium',
              },
            },
          },
        },
      }),
    });

    // Return model with systemPrompt for proper AI SDK v5 usage
    return {
      model: premiumModel,
      systemPrompt, // ✅ Dynamic system prompt + premium-specific instructions
    };
  },
};

/**
 * OpenAI health check configuration
 */
export const openAIHealthConfig = {
  endpoint: '/models',
  timeout: 5000,
  expectedModels: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4o-mini',
  ],
};

/**
 * Test OpenAI connection and model availability
 */
export async function testOpenAIConnection(): Promise<{
  success: boolean;
  responseTimeMs: number;
  availableModels?: string[];
  error?: string;
}> {
  const startTime = Date.now();

  try {
    const provider = createOpenAIProvider();

    // Get dynamic configuration, with fallback for testing reliability
    let modelName = 'gpt-4o'; // Fallback for testing
    let testTemperature = 0.1; // Fallback for testing

    try {
      const dynamicConfig = await getDynamicModelConfig();
      modelName = dynamicConfig.fallbackModelName; // ✅ Dynamic from admin panel
      testTemperature = dynamicConfig.config.temperature; // ✅ Dynamic from admin panel
    } catch (configError) {
      // Use fallback values if dynamic config fails (for test reliability)
      console.warn('[OpenAITest] Using fallback config due to:', configError);
    }

    const model = provider(modelName);

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
 * Get OpenAI model information with dynamic configuration
 */
export async function getOpenAIModelInfo() {
  // Get dynamic configuration from admin panel
  const dynamicConfig = await getDynamicModelConfig();

  return {
    provider: 'openai',
    model: dynamicConfig.fallbackModelName, // ✅ Dynamic from admin panel
    displayName: 'GPT-4o',
    description: 'OpenAI\'s flagship multimodal model optimized for academic writing',
    capabilities: [
      'multimodal',
      'function-calling',
      'academic-writing',
      'research-analysis',
      'code-generation',
    ],
    limits: {
      maxTokens: dynamicConfig.config.maxTokens, // ✅ Dynamic from admin panel
      contextWindow: 128000, // 128K tokens context window
      requestsPerMinute: 10000,
      tokensPerMinute: 800000,
    },
    pricing: {
      inputCostPer1KTokens: 0.0025, // $2.50 per 1M tokens
      outputCostPer1KTokens: 0.01,  // $10.00 per 1M tokens
    },
  };
}