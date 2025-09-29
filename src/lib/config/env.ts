/**
 * Environment Variable Validation for AI Providers
 * Ensures all required AI SDK configuration is present and valid
 * 
 * Based on Vercel AI SDK v5 Core patterns from:
 * - /documentation/docs/03-ai-sdk-core/45-provider-management.mdx
 * - /documentation/providers/03-community-providers/13-openrouter.mdx
 */

import { z } from 'zod';

/**
 * Environment validation schema for AI providers
 */
const envSchema = z.object({
  // Primary Provider - OpenRouter Configuration
  OPENROUTER_API_KEY: z.string().min(1, 'OpenRouter API key is required'),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  
  // Primary Model Configuration
  PRIMARY_MODEL: z.string().default('google/gemini-2.5-pro'),
  PRIMARY_MODEL_MAX_TOKENS: z.coerce.number().int().positive().default(8192),
  PRIMARY_MODEL_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),
  
  // Fallback Provider - OpenAI Configuration
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
  OPENAI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  
  // Fallback Model Configuration
  FALLBACK_MODEL: z.string().default('gpt-4o'),
  FALLBACK_MODEL_MAX_TOKENS: z.coerce.number().int().positive().default(4096),
  FALLBACK_MODEL_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),
  
  // Provider Health Check Settings
  HEALTH_CHECK_INTERVAL: z.coerce.number().int().positive().default(30000),
  HEALTH_CHECK_TIMEOUT: z.coerce.number().int().positive().default(5000),
  PROVIDER_RETRY_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  PROVIDER_RETRY_DELAY: z.coerce.number().int().positive().default(1000),
  
  // Rate Limiting Configuration
  RATE_LIMIT_REQUESTS_PER_MINUTE: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_TOKENS_PER_MINUTE: z.coerce.number().int().positive().default(100000),
  RATE_LIMIT_BURST_SIZE: z.coerce.number().int().positive().default(10),
  
  // Academic Workflow Configuration
  ACADEMIC_PHASES_ENABLED: z.coerce.boolean().default(true),
  APPROVAL_GATES_ENABLED: z.coerce.boolean().default(true),
  WORKFLOW_TIMEOUT: z.coerce.number().int().positive().default(300000),
  
  // Redis Upstash Configuration
  UPSTASH_REDIS_REST_URL: z.string().url('Invalid Redis REST URL format'),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'Redis REST token is required'),
  UPSTASH_REDIS_REST_READONLY_TOKEN: z.string().min(1, 'Redis readonly token is required').optional(),
  
  // Redis Cache Configuration
  REDIS_DEFAULT_TTL: z.coerce.number().int().positive().default(3600),
  REDIS_SESSION_TTL: z.coerce.number().int().positive().default(86400),
  REDIS_ARTIFACT_TTL: z.coerce.number().int().positive().default(7200),
  REDIS_CONNECTION_TIMEOUT: z.coerce.number().int().positive().default(5000),
  REDIS_MAX_RETRIES: z.coerce.number().int().min(1).max(10).default(3),

  // Application Settings
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  DEBUG_AI_CALLS: z.coerce.boolean().default(false),
});

/**
 * Validated environment variables
 */
let validatedEnv: z.infer<typeof envSchema> | null = null;

/**
 * Initialize and validate environment variables
 */
function validateEnv(): z.infer<typeof envSchema> {
  if (validatedEnv) {
    return validatedEnv;
  }

  try {
    validatedEnv = envSchema.parse(process.env);
    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join('\n');
      
      throw new Error(
        `Invalid environment configuration:\n${missingVars}\n\n` +
        'Please check your .env.local file and ensure all required variables are set.'
      );
    }
    
    throw error;
  }
}

/**
 * Get validated environment variables
 */
export const env = validateEnv();

/**
 * Type-safe environment variable getter
 */
export function getEnvVar<K extends keyof typeof env>(key: K): typeof env[K] {
  return env[key];
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development';
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}

/**
 * Check if AI debugging is enabled
 */
export function isAIDebugEnabled(): boolean {
  return env.DEBUG_AI_CALLS || isDevelopment();
}

/**
 * Validate environment on module load in development
 */
if (isDevelopment()) {
  // Environment variables validated successfully - silent handling for production
}