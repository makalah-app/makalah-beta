/**
 * AI Configuration Constants and Defaults
 * Centralized configuration values for the AI SDK implementation
 * 
 * Based on Vercel AI SDK v5 Core configuration patterns from:
 * - /documentation/docs/03-ai-sdk-core/25-settings.mdx
 * - /documentation/docs/03-ai-sdk-core/45-provider-management.mdx
 */

import { env } from './env';

/**
 * Primary model configuration - OPTIMIZED untuk OpenAI GPT-4o capabilities
 */
export const PRIMARY_MODEL_CONFIG = {
  model: env.PRIMARY_MODEL,
  maxTokens: env.PRIMARY_MODEL_MAX_TOKENS, // 8192 untuk leverage enhanced capacity
  temperature: env.PRIMARY_MODEL_TEMPERATURE, // 0.1 focused untuk academic precision
  topP: 0.9, // GPT-4o optimized diversity setting
  frequencyPenalty: 0.05, // Lower untuk academic terminology consistency 
  presencePenalty: 0.15, // Higher untuk avoid repetitive academic phrases
  // OpenAI GPT-4o specific optimizations
  reasoning: {
    enabled: true,
    budget_tokens: 32000, // Leverage 1M+ context untuk deep analysis
    mode: 'academic_enhanced', // Custom academic reasoning mode
  },
  context: {
    window_size: '1M+', // 1M+ token context window
    multimodal: true, // Support untuk berbagai format input
    academic_focus: true, // Academic-specific context understanding
  },
  advanced_features: {
    step_by_step_analysis: true,
    theoretical_frameworks: true,
    methodology_validation: true,
    citation_awareness: true,
  },
} as const;

/**
 * Fallback model configuration (OpenRouter Gemini 2.5 Flash)
 */
export const FALLBACK_MODEL_CONFIG = {
  model: env.FALLBACK_MODEL,
  maxTokens: env.FALLBACK_MODEL_MAX_TOKENS,
  temperature: env.FALLBACK_MODEL_TEMPERATURE,
  topP: 0.9,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0,
} as const;

/**
 * Provider health check configuration
 */
export const HEALTH_CHECK_CONFIG = {
  interval: env.HEALTH_CHECK_INTERVAL,
  timeout: env.HEALTH_CHECK_TIMEOUT,
  retryAttempts: env.PROVIDER_RETRY_ATTEMPTS,
  retryDelay: env.PROVIDER_RETRY_DELAY,
  healthCheckEndpoints: {
    openrouter: '/models',
    openai: '/models',
  },
} as const;

/**
 * Rate limiting configuration
 */
export const RATE_LIMIT_CONFIG = {
  requestsPerMinute: env.RATE_LIMIT_REQUESTS_PER_MINUTE,
  tokensPerMinute: env.RATE_LIMIT_TOKENS_PER_MINUTE,
  burstSize: env.RATE_LIMIT_BURST_SIZE,
  windowSizeMs: 60000, // 1 minute
  keyPrefix: 'ai-rate-limit:',
} as const;

/**
 * Academic workflow configuration
 */
export const ACADEMIC_WORKFLOW_CONFIG = {
  phasesEnabled: env.ACADEMIC_PHASES_ENABLED,
  approvalGatesEnabled: env.APPROVAL_GATES_ENABLED,
  workflowTimeout: env.WORKFLOW_TIMEOUT,
  phases: [
    'research_analysis',
    'outline_generation', 
    'content_drafting',
    'citation_integration',
    'structure_refinement',
    'quality_review',
    'final_formatting'
  ] as const,
  approvalGates: [
    'outline_approval',
    'content_approval', 
    'citation_approval',
    'final_approval'
  ] as const,
} as const;

/**
 * Streaming configuration for Server-Sent Events
 */
export const STREAMING_CONFIG = {
  chunkSize: 1024,
  bufferSize: 8192,
  keepAliveInterval: 30000,
  connectionTimeout: 300000,
  maxConnections: 1000,
  heartbeatMessage: '{"type": "ping"}',
  eventTypes: [
    'start',
    'text-delta',
    'text-end',
    'tool-call',
    'tool-result',
    'approval-request',
    'phase-transition',
    'error',
    'done'
  ] as const,
} as const;

/**
 * Tool calling configuration
 */
export const TOOL_CONFIG = {
  maxToolCalls: 10,
  toolCallTimeout: 30000,
  parallelToolCalls: true,
  toolChoice: 'auto' as const,
  activeToolsLimit: 20,
  toolValidationStrict: true,
} as const;

/**
 * Error handling configuration
 */
export const ERROR_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  backoffMultiplier: 2,
  maxRetryDelay: 10000,
  circuitBreakerFailureThreshold: 5,
  circuitBreakerRecoveryTimeout: 30000,
} as const;

/**
 * Logging configuration
 */
export const LOGGING_CONFIG = {
  level: env.LOG_LEVEL,
  enableAICallDebugging: env.DEBUG_AI_CALLS,
  logRequestIds: true,
  logTokenUsage: true,
  logProviderSwitching: true,
  sensitiveFields: [
    'apiKey',
    'authorization',
    'cookie',
    'session',
    'token'
  ] as const,
} as const;

/**
 * Academic persona configuration - ENHANCED untuk Gemini 2.5 Pro reasoning
 */
export const ACADEMIC_PERSONA_CONFIG = {
  // REMOVED: systemPrompt field - now using database-driven system prompts via dynamic-config.ts
  // This fixes the 15-day bug where provider files bypassed database configuration
  /* 
  systemPrompt: `You are Gemini 2.5 Pro, Google's most advanced AI model dengan superior reasoning capabilities, serving sebagai expert academic writing assistant.
  ... [COMMENTED OUT - USE DATABASE SYSTEM PROMPTS INSTEAD] ...
  */
  
  writingGuidelines: [
    'Leverage advanced reasoning untuk deep theoretical analysis',
    'Provide multi-perspective evidence synthesis dengan complex argumentation',
    'Integrate comprehensive citation networks dengan interdisciplinary connections',
    'Maintain sophisticated logical structure dengan step-by-step analytical flow',
    'Apply discipline-specific conventions dengan cross-field methodological insights',
    'Ensure rigorous methodology validation menggunakan multiple analytical frameworks',
    'Execute complex critical thinking dengan systematic evaluation of competing theories',
    'Utilize 1M+ context window untuk comprehensive literature integration',
    'Apply multimodal processing untuk diverse research material analysis'
  ] as const,
  
  phases: {
    research_analysis: 'Execute comprehensive literature analysis dengan advanced reasoning untuk identify complex theoretical patterns and methodological gaps',
    outline_generation: 'Generate sophisticated academic structure menggunakan step-by-step analysis dengan multiple theoretical frameworks integration',
    content_drafting: 'Draft high-level academic content leveraging 1M+ context untuk deep argumentation development dan interdisciplinary insights',
    citation_integration: 'Synthesize complex citation networks dengan advanced evidence validation dan cross-reference theoretical connections',
    structure_refinement: 'Apply advanced analytical reasoning untuk optimize logical flow dan enhance theoretical coherence across sections',
    quality_review: 'Conduct rigorous quality assessment menggunakan enhanced methodology validation dan academic excellence standards',
    final_formatting: 'Execute publication-ready formatting dengan discipline-specific conventions dan advanced academic presentation standards'
  } as const,
} as const;

/**
 * GEMINI 2.5 PRO ADVANCED CAPABILITIES CONFIGURATION
 * Specialized configuration untuk maximize Gemini 2.5 Pro's unique features
 */
export const GEMINI_ADVANCED_CONFIG = {
  // Reasoning dan Analysis Features
  reasoning: {
    enable_step_by_step: true,
    enable_theoretical_analysis: true,
    enable_methodology_validation: true,
    max_reasoning_depth: 5,
    academic_focus_mode: true,
  },
  
  // Context dan Memory Management
  context: {
    max_context_tokens: 1000000, // 1M+ token context window
    context_compression: 'intelligent', // Smart context management
    long_form_memory: true,
    cross_reference_tracking: true,
  },
  
  // Academic-Specific Features
  academic: {
    citation_network_analysis: true,
    theoretical_framework_integration: true,
    methodology_cross_validation: true,
    interdisciplinary_connections: true,
    evidence_synthesis_mode: 'comprehensive',
  },
  
  // Performance Optimization
  performance: {
    parallel_analysis: true,
    batch_processing: true,
    intelligent_caching: true,
    adaptive_token_allocation: true,
  },
  
  // Quality Assurance
  quality: {
    multi_pass_validation: true,
    consistency_checking: true,
    academic_standard_validation: true,
    publication_readiness_assessment: true,
  },
  
  // Streaming dan UI Integration
  streaming: {
    enhanced_metadata: true,
    reasoning_visibility: false, // Akan diaktifkan nanti
    progress_indicators: true,
    academic_phase_tracking: true,
  },
} as const;

/**
 * Development and debugging configuration
 */
export const DEBUG_CONFIG = {
  enabled: env.NODE_ENV === 'development',
  verboseLogging: env.DEBUG_AI_CALLS,
  logProviderCalls: env.NODE_ENV === 'development',
  logStreamingEvents: env.DEBUG_AI_CALLS,
  logToolCalls: env.DEBUG_AI_CALLS,
  performanceMetrics: true,
} as const;