/**
 * Core AI SDK Configuration
 * Central configuration for AI providers with OpenRouter primary and OpenAI fallback
 * 
 * Based on Vercel AI SDK v5 Core patterns from:
 * - /documentation/docs/03-ai-sdk-core/45-provider-management.mdx
 * - /documentation/docs/03-ai-sdk-core/01-overview.mdx
 * - /documentation/providers/03-community-providers/13-openrouter.mdx
 */

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { openai } from '@ai-sdk/openai';
import { customProvider, createProviderRegistry } from 'ai';

import { getProviderAPIKeys, getProviderBaseURLs } from '../config/api-keys';
import { 
  PRIMARY_MODEL_CONFIG, 
  FALLBACK_MODEL_CONFIG,
  ACADEMIC_PERSONA_CONFIG,
  ERROR_CONFIG,
  GEMINI_ADVANCED_CONFIG
} from '../config/constants';
import { env } from '../config/env';
// REMOVED: import { getActiveSystemPrompt } from '../database/system-prompts';
// REASON: system-prompts.ts file deleted, system prompt now managed via database + admin frontend

/**
 * AI provider configuration interface
 * 🔄 SWAPPED: OpenAI as primary for proven tool calling, OpenRouter as fallback
 */
export interface AIProviderConfig {
  primary: {
    name: 'openai';
    provider: any;
    model: string;
    config: typeof FALLBACK_MODEL_CONFIG; // Using OpenAI config as primary now
  };
  fallback: {
    name: 'openrouter';
    provider: any;
    model: string;
    config: typeof PRIMARY_MODEL_CONFIG; // Using OpenRouter config as fallback now
  };
}

/**
 * Initialize OpenRouter provider with enhanced error handling
 */
function createOpenRouterProvider() {
  try {
    const apiKeys = getProviderAPIKeys();
    const baseURLs = getProviderBaseURLs();
    
    if (!apiKeys.openrouter) {
      throw new Error('OpenRouter API key is missing or invalid');
    }
    
    
    return createOpenRouter({
      apiKey: apiKeys.openrouter,
      baseURL: baseURLs.openrouter || 'https://openrouter.ai/api/v1',
      // Enhanced OpenRouter configuration untuk Gemini 2.5 Pro
      headers: {
        'HTTP-Referer': 'https://makalah-ai.vercel.app',
        'X-Title': 'Makalah AI Academic Writing Platform',
      },
      // Timeout dan retry configuration
      requestTimeout: 30000, // 30 seconds untuk Gemini 2.5 Pro
      retryCount: 2,
    } as any);
    
  } catch (error) {
    throw new Error(`OpenRouter provider initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Initialize OpenAI provider with enhanced error handling
 */
function createOpenAIProvider() {
  try {
    const apiKeys = getProviderAPIKeys();
    const baseURLs = getProviderBaseURLs();
    
    if (!apiKeys.openai) {
      throw new Error('OpenAI API key is missing or invalid');
    }
    
    
    return (openai as any)({
      apiKey: apiKeys.openai,
      baseURL: baseURLs.openai || 'https://api.openai.com/v1',
      // Enhanced configuration untuk fallback reliability
      maxRetries: 3,
      timeout: 15000, // 15 seconds timeout untuk fallback
    } as any);
    
  } catch (error) {
    throw new Error(`OpenAI provider initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create custom provider with academic persona and error handling
 * DEPRECATED: This function is no longer used. System prompt now loaded dynamically from database.
 */
function createAcademicProvider(baseProvider: any, config: any, providerName: string) {
  return (customProvider as any)({
    languageModels: {
      [config.model]: baseProvider(config.model),
    },
    fallbackProvider: baseProvider,
    // NOTE: System prompt will be applied dynamically from database in getPrimaryModel/getFallbackModel
    defaultSettings: {
      // system: loaded dynamically from database
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      topP: config.topP || 0.9,
      frequencyPenalty: config.frequencyPenalty || 0.0,
      presencePenalty: config.presencePenalty || 0.0,
    },
  } as any);
}

/**
 * Initialize AI providers with academic configuration
 * 🔄 SWAPPED: OpenAI as primary for proven tool calling, OpenRouter as fallback
 */
export function initializeAIProviders(): AIProviderConfig {
  const openrouter = createOpenRouterProvider();
  const openaiProvider = createOpenAIProvider();
  
  
  return {
    primary: {
      name: 'openai',
      provider: openaiProvider,
      model: FALLBACK_MODEL_CONFIG.model, // gpt-4o now as primary
      config: FALLBACK_MODEL_CONFIG,
    },
    fallback: {
      name: 'openrouter', 
      provider: openrouter,
      model: PRIMARY_MODEL_CONFIG.model, // gemini-2.5-pro now as fallback
      config: PRIMARY_MODEL_CONFIG,
    },
  };
}

/**
 * Create provider registry for unified access
 */
export function createAIProviderRegistry() {
  const providers = initializeAIProviders();
  
  return createProviderRegistry({
    // Primary provider with custom separator
    primary: providers.primary.provider,
    // Fallback provider  
    fallback: providers.fallback.provider,
  }, { 
    separator: ':' 
  });
}

/**
 * Get default AI model configuration (without system prompt)
 * NOTE: System prompt now loaded dynamically in chat route from database via admin frontend
 */
export function getDefaultModelConfig() {
  return {
    maxTokens: PRIMARY_MODEL_CONFIG.maxTokens,
    temperature: PRIMARY_MODEL_CONFIG.temperature,
    topP: PRIMARY_MODEL_CONFIG.topP,
    frequencyPenalty: PRIMARY_MODEL_CONFIG.frequencyPenalty,
    presencePenalty: PRIMARY_MODEL_CONFIG.presencePenalty,
  };
}

/**
 * Get academic writing guidelines for AI responses (without system prompt)
 * NOTE: System prompt (persona) now loaded dynamically in chat route from database via admin frontend
 */
export function getAcademicWritingGuidelines() {
  return {
    guidelines: ACADEMIC_PERSONA_CONFIG.writingGuidelines,
    phases: ACADEMIC_PERSONA_CONFIG.phases,
  };
}

/**
 * Get Gemini 2.5 Pro advanced configuration
 */
export function getGeminiAdvancedConfig() {
  return {
    reasoning: GEMINI_ADVANCED_CONFIG.reasoning,
    context: GEMINI_ADVANCED_CONFIG.context,
    academic: GEMINI_ADVANCED_CONFIG.academic,
    performance: GEMINI_ADVANCED_CONFIG.performance,
    quality: GEMINI_ADVANCED_CONFIG.quality,
    streaming: GEMINI_ADVANCED_CONFIG.streaming,
  };
}

/**
 * Initialize AI configuration on module load
 */
let aiProviders: AIProviderConfig | null = null;
let providerRegistry: any = null;

/**
 * Get initialized AI providers
 */
export function getAIProviders(): AIProviderConfig {
  if (!aiProviders) {
    aiProviders = initializeAIProviders();
  }
  return aiProviders;
}

/**
 * Get provider registry
 */
export function getProviderRegistry() {
  if (!providerRegistry) {
    providerRegistry = createAIProviderRegistry();
  }
  return providerRegistry;
}

/**
 * Get primary model for streamText operations dengan error handling
 * 🔄 SWAPPED: Now returns OpenAI GPT-4o as primary with proper provider handling
 */
export function getPrimaryModel() {
  try {
    const providers = getAIProviders();
    
    if (!providers.primary || !providers.primary.provider) {
      throw new Error('Primary provider not initialized');
    }
    
    // Handle provider differences: OpenAI vs OpenRouter
    let model;
    if (providers.primary.name === 'openai') {
      // OpenAI provider menggunakan direct model call
      model = providers.primary.provider(providers.primary.model);
    } else if (providers.primary.name === 'openrouter') {
      // OpenRouter provider menggunakan .chat() method
      model = providers.primary.provider.chat(providers.primary.model);
    } else {
      throw new Error(`Unknown primary provider: ${providers.primary.name}`);
    }
    
    return model;
    
  } catch (error) {
    throw new Error(`Primary model initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get fallback model for streamText operations - INDEPENDENT initialization
 * 🔄 SWAPPED: Now returns OpenRouter Gemini 2.5 Pro as fallback
 */
export function getFallbackModel() {
  try {
    // Initialize OpenRouter provider independently sebagai fallback
    const fallbackProvider = createOpenRouterProvider();
    
    if (!fallbackProvider) {
      throw new Error('Independent OpenRouter provider initialization failed');
    }
    
    // OpenRouter provider menggunakan .chat() method untuk chat models
    const model = fallbackProvider.chat(PRIMARY_MODEL_CONFIG.model);
    
    return model;
    
  } catch (error) {
    throw new Error(`Independent fallback model (${PRIMARY_MODEL_CONFIG.model}) initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Development logging for AI configuration
 * 🔄 SWAPPED for tool calling testing
 */
if (env.NODE_ENV === 'development') {
}
