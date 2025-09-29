/**
 * ENVIRONMENT VALIDATION SCHEMA
 *
 * Comprehensive validation for all environment variables with security checks
 * Prevents application startup with invalid or missing critical secrets
 */

import { z } from 'zod';

// API Key validation patterns
const openaiKeySchema = z.string().regex(/^sk-proj-[A-Za-z0-9_-]+$/, 'Invalid OpenAI API key format');
const openrouterKeySchema = z.string().regex(/^sk-or-v1-[A-Za-z0-9_-]+$/, 'Invalid OpenRouter API key format');
const perplexityKeySchema = z.string().regex(/^pplx-[A-Za-z0-9_-]+$/, 'Invalid Perplexity API key format');
const githubTokenSchema = z.string().regex(/^ghp_[A-Za-z0-9_-]{36}$/, 'Invalid GitHub token format');
const supabaseKeySchema = z.string().regex(/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, 'Invalid JWT format');

// Environment-specific schemas
const developmentEnvSchema = z.object({
  NODE_ENV: z.literal('development'),

  // AI Provider Keys (Required in development)
  OPENAI_API_KEY: openaiKeySchema,
  OPENROUTER_API_KEY: openrouterKeySchema,
  PERPLEXITY_API_KEY: perplexityKeySchema.optional(),

  // Database (Required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseKeySchema,
  SUPABASE_SERVICE_ROLE_KEY: supabaseKeySchema,
  SUPABASE_JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),

  // Development-specific
  GITHUB_PERSONAL_ACCESS_TOKEN: githubTokenSchema.optional(),
  ENABLE_DEBUG_MODE: z.enum(['true', 'false']).default('true'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('debug'),

  // Next.js
  NEXTAUTH_URL: z.string().url().default('http://localhost:3000'),
  NEXTAUTH_SECRET: z.string().min(32, 'NextAuth secret must be at least 32 characters'),

  // Optional services
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

const productionEnvSchema = z.object({
  NODE_ENV: z.literal('production'),

  // AI Provider Keys (All required in production)
  OPENAI_API_KEY: openaiKeySchema,
  OPENROUTER_API_KEY: openrouterKeySchema,
  PERPLEXITY_API_KEY: perplexityKeySchema,

  // Database (Required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseKeySchema,
  SUPABASE_SERVICE_ROLE_KEY: supabaseKeySchema,
  SUPABASE_JWT_SECRET: z.string().min(64, 'Production JWT secret must be at least 64 characters'),

  // Production settings
  ENABLE_DEBUG_MODE: z.literal('false'),
  LOG_LEVEL: z.enum(['info', 'warn', 'error']).default('warn'),

  // Next.js (Production)
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(64, 'Production NextAuth secret must be at least 64 characters'),

  // Required services in production
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(20),

  // Optional GitHub integration
  GITHUB_PERSONAL_ACCESS_TOKEN: githubTokenSchema.optional(),
});

const testEnvSchema = z.object({
  NODE_ENV: z.literal('test'),

  // Test environment - mock keys allowed
  OPENAI_API_KEY: z.string().default('sk-proj-test-key'),
  OPENROUTER_API_KEY: z.string().default('sk-or-v1-test-key'),
  PERPLEXITY_API_KEY: z.string().optional(),

  // Database (Test)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default('http://localhost:54321'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default('test-anon-key'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default('test-service-role-key'),
  SUPABASE_JWT_SECRET: z.string().default('test-jwt-secret-32-characters-min'),

  // Test settings
  ENABLE_DEBUG_MODE: z.literal('true'),
  LOG_LEVEL: z.literal('debug'),

  NEXTAUTH_URL: z.string().url().default('http://localhost:3000'),
  NEXTAUTH_SECRET: z.string().default('test-nextauth-secret-32-chars-min'),
});

// Security validation functions
export const validateApiKeyStrength = (key: string, provider: string): boolean => {
  const minLength = {
    openai: 51,
    openrouter: 45,
    perplexity: 30,
    github: 40
  };

  return key.length >= (minLength[provider as keyof typeof minLength] || 30);
};

export const checkKeyRotationAge = (keyLastRotated: Date): boolean => {
  const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
  return Date.now() - keyLastRotated.getTime() < maxAge;
};

// Main validation function
export const validateEnvironment = () => {
  const env = process.env.NODE_ENV || 'development';

  try {
    let validatedEnv;

    switch (env) {
      case 'development':
        validatedEnv = developmentEnvSchema.parse(process.env);
        break;
      case 'production':
        validatedEnv = productionEnvSchema.parse(process.env);
        break;
      case 'test':
        validatedEnv = testEnvSchema.parse(process.env);
        break;
      default:
        throw new Error(`Unknown NODE_ENV: ${env}`);
    }

    // Additional security checks
    const securityChecks = {
      openaiKeyStrength: validateApiKeyStrength(validatedEnv.OPENAI_API_KEY, 'openai'),
      openrouterKeyStrength: validateApiKeyStrength(validatedEnv.OPENROUTER_API_KEY, 'openrouter'),
      jwtSecretStrength: validatedEnv.SUPABASE_JWT_SECRET.length >= (env === 'production' ? 64 : 32),
      nextAuthSecretStrength: validatedEnv.NEXTAUTH_SECRET.length >= (env === 'production' ? 64 : 32),
    };

    const failedChecks = Object.entries(securityChecks)
      .filter(([_, passed]) => !passed)
      .map(([check]) => check);

    if (failedChecks.length > 0) {
      throw new Error(`Security validation failed: ${failedChecks.join(', ')}`);
    }

    // Environment validation passed - silent handling for production
    return validatedEnv;

  } catch (error) {
    // Environment validation failed - silent handling for production

    if (env === 'production') {
      // In production, fail hard
      process.exit(1);
    } else {
      // In development, warn but continue
      // Continuing with invalid environment in development mode - silent handling for production
      throw error;
    }
  }
};

// Export type for TypeScript
export type ValidatedEnv = ReturnType<typeof validateEnvironment>;

// Environment info for debugging (safe)
export const getEnvironmentInfo = () => ({
  nodeEnv: process.env.NODE_ENV,
  hasOpenAI: !!process.env.OPENAI_API_KEY,
  hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
  hasPerplexity: !!process.env.PERPLEXITY_API_KEY,
  hasSupabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasRedis: !!process.env.UPSTASH_REDIS_REST_URL,
  hasGitHub: !!process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
  timestamp: new Date().toISOString(),
});