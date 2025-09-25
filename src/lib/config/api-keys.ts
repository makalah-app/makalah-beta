/**
 * Secure API Key Management and Validation
 * Handles secure access to AI provider API keys with validation
 * 
 * Based on Vercel AI SDK v5 Core security patterns from:
 * - /documentation/docs/03-ai-sdk-core/45-provider-management.mdx
 * - /documentation/providers/03-community-providers/13-openrouter.mdx
 */

import { env } from './env';

/**
 * API key validation patterns - UPDATED untuk format yang sebenarnya
 */
const API_KEY_PATTERNS = {
  // OpenRouter menggunakan format sk-or-v1- atau sk-or- 
  openrouter: /^sk-or-(v1-)?[a-zA-Z0-9]{32,}$/,
  // OpenAI menggunakan format sk-proj- atau sk-
  openai: /^sk(-proj)?-[a-zA-Z0-9\-_]{32,}$/,
} as const;

/**
 * API key validation errors
 */
export class APIKeyValidationError extends Error {
  constructor(provider: string, reason: string) {
    super(`Invalid ${provider} API key: ${reason}`);
    this.name = 'APIKeyValidationError';
  }
}

/**
 * Validate API key format
 */
function validateAPIKeyFormat(key: string, provider: keyof typeof API_KEY_PATTERNS): boolean {
  const pattern = API_KEY_PATTERNS[provider];
  return pattern ? pattern.test(key) : key.length >= 32;
}

/**
 * Securely get OpenRouter API key with validation
 */
export function getOpenRouterAPIKey(): string {
  const apiKey = env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new APIKeyValidationError('OpenRouter', 'API key not provided');
  }
  
  if (!validateAPIKeyFormat(apiKey, 'openrouter')) {
    throw new APIKeyValidationError(
      'OpenRouter', 
      'API key format is invalid (should start with sk-or- or sk-or-v1-)'
    );
  }
  
  return apiKey;
}

/**
 * Securely get OpenAI API key with validation
 */
export function getOpenAIAPIKey(): string {
  const apiKey = env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new APIKeyValidationError('OpenAI', 'API key not provided');
  }
  
  if (!validateAPIKeyFormat(apiKey, 'openai')) {
    throw new APIKeyValidationError(
      'OpenAI',
      'API key format is invalid (should start with sk- or sk-proj-)'
    );
  }
  
  return apiKey;
}

/**
 * Get base URLs for providers
 */
export function getProviderBaseURLs() {
  return {
    openrouter: env.OPENROUTER_BASE_URL,
    openai: env.OPENAI_BASE_URL,
  };
}

/**
 * Mask API key for logging (shows only first 8 and last 4 characters)
 */
export function maskAPIKey(apiKey: string): string {
  if (apiKey.length < 12) {
    return '****';
  }
  
  return `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`;
}

/**
 * Validate all required API keys at startup
 */
export function validateAllAPIKeys(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    getOpenRouterAPIKey();
  } catch (error) {
    if (error instanceof APIKeyValidationError) {
      errors.push(error.message);
    }
  }
  
  try {
    getOpenAIAPIKey();
  } catch (error) {
    if (error instanceof APIKeyValidationError) {
      errors.push(error.message);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get API key configuration for provider setup
 */
export function getProviderAPIKeys() {
  return {
    openrouter: getOpenRouterAPIKey(),
    openai: getOpenAIAPIKey(),
  };
}

/**
 * Validate API keys on module load in development
 */
if (env.NODE_ENV === 'development') {
  const validation = validateAllAPIKeys();
  if (!validation.valid) {
    console.warn('⚠️  API key validation issues:', validation.errors);
  } else {
    console.log('✓ API keys validated successfully');
  }
}