/**
 * Configuration Management API Endpoint
 * Handles AI model configuration, provider switching, and parameter testing
 * 
 * Based on Vercel AI SDK v5 Core patterns from:
 * - /documentation/docs/03-ai-sdk-core/45-provider-management.mdx
 * - /documentation/docs/03-ai-sdk-core/01-overview.mdx
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';

// Import existing configuration infrastructure
import { getProviderManager, type ProviderStrategy } from '../../../src/lib/ai/config/provider-adapter';
import { getDefaultModelConfig } from '../../../src/lib/ai/config';
import { OPENROUTER_MODEL_SLUGS } from '../../../src/lib/ai/model-registry';

// Import configuration
import { PRIMARY_MODEL_CONFIG, FALLBACK_MODEL_CONFIG, ACADEMIC_PERSONA_CONFIG } from '../../../src/lib/config/constants';
// Removed unused imports: validateInput, getProviderAPIKeys
import { env } from '../../../src/lib/config/env';

/**
 * Configuration request schemas
 */
const GetConfigSchema = z.object({
  scope: z.enum(['all', 'providers', 'models', 'persona', 'tools']).default('all'),
  includeSecrets: z.boolean().default(false),
  includeHealth: z.boolean().default(true),
  includeStats: z.boolean().default(false),
});

const UpdateConfigSchema = z.object({
  providers: z.object({
    strategy: z.enum(['primary-first', 'health-based', 'round-robin', 'fallback-only']).optional(),
    primary: z.object({
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().min(1).max(100000).optional(),
      topP: z.number().min(0).max(1).optional(),
      frequencyPenalty: z.number().min(-2).max(2).optional(),
      presencePenalty: z.number().min(-2).max(2).optional(),
    }).optional(),
    fallback: z.object({
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().min(1).max(100000).optional(),
      topP: z.number().min(0).max(1).optional(),
      frequencyPenalty: z.number().min(-2).max(2).optional(),
      presencePenalty: z.number().min(-2).max(2).optional(),
    }).optional(),
  }).optional(),
  persona: z.object({
    systemPrompt: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    phase: z.string().optional(),
    guidelines: z.array(z.string()).optional(),
  }).optional(),
  tools: z.object({
    enabled: z.record(z.boolean()).optional(),
    config: z.record(z.any()).optional(),
    categories: z.array(z.string()).optional(),
  }).optional(),
  streaming: z.object({
    bufferSize: z.number().min(1024).max(65536).optional(),
    keepAliveInterval: z.number().min(5000).max(60000).optional(),
    timeout: z.number().min(5000).max(300000).optional(),
  }).optional(),
});

const TestConfigSchema = z.object({
  provider: z.enum(['openrouter', 'openai']).optional(),
  model: z.string().optional(),
  parameters: z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().min(1).max(1000).optional(),
    topP: z.number().min(0).max(1).optional(),
  }).optional(),
  testPrompt: z.string().default('Hello, this is a test. Please respond with "Configuration test successful."'),
  timeout: z.number().min(5000).max(30000).default(15000),
});

type GetConfigRequest = z.infer<typeof GetConfigSchema>;
type UpdateConfigRequest = z.infer<typeof UpdateConfigSchema>;
type TestConfigRequest = z.infer<typeof TestConfigSchema>;

/**
 * GET /api/config - Get current configuration
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const parsedParams = {
      ...queryParams,
      includeSecrets: queryParams.includeSecrets === 'true',
      includeHealth: queryParams.includeHealth === 'true',
      includeStats: queryParams.includeStats === 'true',
    };

    const validatedRequest: GetConfigRequest = GetConfigSchema.parse(parsedParams);
    const { scope, includeSecrets, includeHealth, includeStats } = validatedRequest;

    const config: any = {};

    // Get provider configuration
    if (scope === 'all' || scope === 'providers') {
      const providerManager = getProviderManager();
      const providerConfig = await providerManager.getProviderConfig();

      config.providers = {
        strategy: 'primary-first', // Default strategy
        primary: {
          name: providerConfig.primary.name,
          model: providerConfig.primary.model,
          status: providerConfig.primary.status,
          // Exclude sensitive data unless requested
          ...(includeSecrets && { apiKey: '***' }),
        },
        fallback: {
          name: providerConfig.fallback.name,
          model: providerConfig.fallback.model,
          status: providerConfig.fallback.status,
          // Exclude sensitive data unless requested
          ...(includeSecrets && { apiKey: '***' }),
        },
      };

      // Include health status if requested
      if (includeHealth) {
        const healthStatus = await providerManager.getProviderHealthStatus();
        config.providers.health = healthStatus;
      }
    }

    // Get model configuration
    if (scope === 'all' || scope === 'models') {
      const defaultConfig = getDefaultModelConfig();
      
      config.models = {
        default: defaultConfig,
        primary: PRIMARY_MODEL_CONFIG,
        fallback: FALLBACK_MODEL_CONFIG,
        available: {
          openrouter: OPENROUTER_MODEL_SLUGS,
          openai: [
            'gpt-4o',
            'gpt-4o-mini',
          ],
        },
      };
    }

    // Get persona configuration
    if (scope === 'all' || scope === 'persona') {
      // TODO: Implement persona manager or remove if not needed
      config.persona = {
        current: null, // persona manager not implemented
        default: ACADEMIC_PERSONA_CONFIG,
        phases: [], // persona manager not implemented
        note: 'Persona management not implemented in current architecture'
      };
    }

    // Get tools configuration
    if (scope === 'all' || scope === 'tools') {
      // TODO: Implement tool registry or remove if not needed
      config.tools = {
        available: ['webSearch'], // simplified tools list
        categories: ['search'], // simplified categories
        totalCount: 1, // simplified count
        note: 'Tool registry not implemented in current architecture'
      };

      // Include usage statistics if requested
      if (includeStats) {
        config.tools.stats = {}; // tool registry not implemented
        config.tools.health = {}; // tool registry not implemented
      }
    }

    // Add system information
    config.system = {
      environment: env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
    };

    return Response.json({
      success: true,
      data: config,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const statusCode = error instanceof z.ZodError ? 400 : 500;

    return Response.json({
      error: {
        message: errorMessage,
        type: error instanceof z.ZodError ? 'validation_error' : 'internal_error',
        details: error instanceof z.ZodError ? error.errors : undefined,
      },
    }, {
      status: statusCode,
    });
  }
}

/**
 * POST /api/config - Update configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedRequest: UpdateConfigRequest = UpdateConfigSchema.parse(body);

    const { providers, persona, tools, streaming } = validatedRequest;
    const updatedConfig: any = {};

    // Update provider configuration
    if (providers) {
      const providerManager = getProviderManager();
      
      if (providers.strategy) {
        providerManager.setStrategy(providers.strategy);
        updatedConfig.providers = { strategy: providers.strategy };
      }

      // Note: Model parameter updates would typically require restart
      // In production, these might be stored in a database/config service
      if (providers.primary || providers.fallback) {
        updatedConfig.providers = {
          ...updatedConfig.providers,
          primary: providers.primary,
          fallback: providers.fallback,
          note: 'Model parameter changes require application restart',
        };
      }
    }

    // Update persona configuration
    if (persona) {
      // TODO: Implement persona manager or remove if not needed
      updatedConfig.persona = {
        note: 'Persona management not implemented in current architecture',
        requested: persona,
        applied: false
      };
    }

    // Update tools configuration
    if (tools) {
      // TODO: Implement tool registry or remove if not needed
      updatedConfig.tools = {
        note: 'Tool registry not implemented in current architecture',
        requested: tools,
        applied: false
      };
    }

    // Update streaming configuration
    if (streaming) {
      updatedConfig.streaming = {
        ...streaming,
        note: 'Streaming configuration changes require connection restart',
      };
    }

    return Response.json({
      success: true,
      data: {
        updated: updatedConfig,
        appliedAt: new Date().toISOString(),
        requiresRestart: !!(providers?.primary || providers?.fallback || streaming),
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const statusCode = error instanceof z.ZodError ? 400 : 500;

    return Response.json({
      error: {
        message: errorMessage,
        type: error instanceof z.ZodError ? 'validation_error' : 'internal_error',
        details: error instanceof z.ZodError ? error.errors : undefined,
      },
    }, {
      status: statusCode,
    });
  }
}

/**
 * PUT /api/config - Test configuration
 */
export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const validatedRequest: TestConfigRequest = TestConfigSchema.parse(body);
    
    const { provider, model, parameters, testPrompt, timeout } = validatedRequest;

    // Get provider manager and test configuration
    const providerManager = getProviderManager();
    
    // Select provider based on test request
    let providerSelection;
    if (provider) {
      providerSelection = await providerManager.selectProvider({
        strategy: provider === 'openrouter' ? 'primary-first' : 'fallback-only',
      });
    } else {
      providerSelection = await providerManager.selectProvider({
        strategy: 'primary-first',
      });
    }

    // Import streamText for testing
    const { streamText } = await import('ai');

    // Test with the specified configuration
    const testConfig = {
      model: providerSelection.provider.languageModel(model || providerSelection.model),
      messages: [
        { role: 'user' as const, content: testPrompt },
      ],
      temperature: parameters?.temperature ?? 0.1,
      maxTokens: parameters?.maxTokens ?? 100,
      topP: parameters?.topP ?? 0.9,
      maxRetries: 1,
    };

    // Run test with timeout
    const testPromise = streamText(testConfig);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Test timeout after ${timeout}ms`)), timeout);
    });

    const result = await Promise.race([testPromise, timeoutPromise]);
    const testDuration = Date.now() - startTime;

    // Collect the full response for testing
    let fullText = '';
    for await (const chunk of (result as any).textStream) {
      fullText += chunk;
    }

    const success = fullText.toLowerCase().includes('test successful') || fullText.length > 0;

    return Response.json({
      success: true,
      data: {
        test: {
          provider: providerSelection.providerName,
          model: model || providerSelection.model,
          parameters: parameters || testConfig,
          result: success ? 'passed' : 'completed',
          duration: testDuration,
          response: fullText.slice(0, 200), // Truncate for brevity
          responseLength: fullText.length,
        },
        configuration: {
          healthy: providerSelection.isHealthy,
          responseTime: providerSelection.responseTimeMs,
          tested: true,
        },
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    const testDuration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return Response.json({
      success: false,
      error: {
        message: errorMessage,
        type: errorMessage.includes('timeout') ? 'timeout_error' : 'test_error',
        duration: testDuration,
      },
      data: {
        test: {
          result: 'failed',
          duration: testDuration,
          error: errorMessage,
        },
      },
      timestamp: new Date().toISOString(),
    }, {
      status: 200, // Return 200 for test failures, they're expected
    });
  }
}
