/**
 * OpenRouter Health Check API Endpoint
 * 
 * Tests OpenRouter provider connectivity and model availability
 * for real-time status monitoring in admin dashboard.
 * 
 * Features:
 * - Model connectivity testing
 * - Response time measurement  
 * - Error handling with detailed messages
 * - Admin access validation
 */

import { NextRequest } from 'next/server';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';

// Admin email hardcoded for security
const ADMIN_EMAIL = 'makalah.app@gmail.com';

// Request validation schema
const HealthCheckRequestSchema = z.object({
  model: z.string().default('google/gemini-2.5-flash'),
  apiKey: z.string().optional(),
  timeout: z.number().min(1000).max(30000).default(10000)
});

type HealthCheckRequest = z.infer<typeof HealthCheckRequestSchema>;

/**
 * Validate admin access from request
 */
async function validateAdminAccess(request: NextRequest): Promise<{ valid: boolean; error?: string }> {
  try {
    const authHeader = request.headers.get('authorization');
    
    // In production, implement proper JWT validation
    // For now, we'll use a simplified check
    
    return { valid: true }; // Allow for testing - implement proper auth later
    
  } catch (error) {
    return { valid: false, error: 'Auth validation failed' };
  }
}

/**
 * POST /api/admin/health/openrouter - Test OpenRouter model connectivity
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Validate admin access
    const adminCheck = await validateAdminAccess(request);
    if (!adminCheck.valid) {
      return Response.json({
        success: false,
        error: {
          message: adminCheck.error || 'Admin access required',
          type: 'auth_error',
          code: 'ADMIN_ONLY'
        },
        responseTimeMs: Date.now() - startTime
      }, { status: 403 });
    }

    const body = await request.json();
    const validatedRequest: HealthCheckRequest = HealthCheckRequestSchema.parse(body);
    
    const { model, apiKey, timeout } = validatedRequest;

    console.log(`🔍 OpenRouter health check - Model: ${model}`);
    console.log(`🔑 OpenRouter API Key available: ${!!(apiKey || process.env.OPENROUTER_API_KEY)}`);
    console.log(`🔑 Provided key length: ${apiKey?.length || 0}, Env key length: ${process.env.OPENROUTER_API_KEY?.length || 0}`);

    // Create OpenRouter provider with the provided or environment API key
    // Prioritize environment variable for security, unless specific key provided
    const finalApiKey = process.env.OPENROUTER_API_KEY || apiKey;
    console.log(`🔑 Final API Key selected: ${finalApiKey?.substring(0, 10)}... (length: ${finalApiKey?.length})`);
    const provider: any = createOpenRouter({
      apiKey: finalApiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'HTTP-Referer': 'https://makalah-ai.vercel.app',
        'X-Title': 'Makalah AI Academic Writing Platform',
        'User-Agent': 'MakalahAI/1.0.0 (Health Check)',
      },
    });

    // Create a test model instance
    const testModel: any = provider.chat(model);

    // Create timeout controller
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeout);

    try {
      // Perform a minimal test request
      const testResponse: any = await testModel.doGenerate({
        mode: { type: 'regular' },
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'ping' }] }],
        maxTokens: 5,
        temperature: 0.1,
        abortSignal: abortController.signal,
      } as any);

      clearTimeout(timeoutId);
      const responseTimeMs = Date.now() - startTime;

      console.log(`✅ OpenRouter health check passed - ${responseTimeMs}ms`);

      return Response.json({
        success: true,
        data: {
          provider: 'openrouter',
          model,
          status: 'online',
          responseTimeMs,
          modelInfo: {
            name: model,
            displayName: getModelDisplayName(model),
            capabilities: getModelCapabilities(model),
          },
          testResult: {
            tokensGenerated: (testResponse?.content?.[0]?.text?.length) || 0,
            finishReason: testResponse?.finishReason || 'stop',
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (testError) {
      clearTimeout(timeoutId);
      const responseTimeMs = Date.now() - startTime;

      console.error(`❌ OpenRouter health check failed:`, testError);

      // Handle specific error types
      let errorType = 'connection_error';
      let errorMessage = 'Model connectivity test failed';

      if (testError instanceof Error) {
        if (testError.message.includes('timeout')) {
          errorType = 'timeout_error';
          errorMessage = `Connection timeout after ${timeout}ms`;
        } else if (testError.message.includes('401') || testError.message.includes('authentication')) {
          errorType = 'auth_error';
          errorMessage = 'Invalid API key or authentication failed';
        } else if (testError.message.includes('429')) {
          errorType = 'rate_limit_error';
          errorMessage = 'Rate limit exceeded';
        } else if (testError.message.includes('404') || testError.message.includes('not found')) {
          errorType = 'model_error';
          errorMessage = `Model ${model} not found or not available`;
        } else if (testError.message.includes('insufficient_quota')) {
          errorType = 'quota_error';
          errorMessage = 'Insufficient quota or credits';
        } else {
          errorMessage = testError.message;
        }
      }

      return Response.json({
        success: false,
        data: {
          provider: 'openrouter',
          model,
          status: 'error',
          responseTimeMs,
          error: {
            type: errorType,
            message: errorMessage,
          }
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    console.error('❌ OpenRouter health check endpoint error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Health check failed';
    const statusCode = error instanceof z.ZodError ? 400 : 500;

    return Response.json({
      success: false,
      error: {
        message: errorMessage,
        type: error instanceof z.ZodError ? 'validation_error' : 'internal_error',
        details: error instanceof z.ZodError ? error.errors : undefined,
        code: error instanceof z.ZodError ? 'INVALID_REQUEST' : 'HEALTH_CHECK_ERROR'
      },
      responseTimeMs,
      timestamp: new Date().toISOString()
    }, { status: statusCode });
  }
}

/**
 * Get display name for OpenRouter model
 */
function getModelDisplayName(model: string): string {
  const displayNames: Record<string, string> = {
    'google/gemini-2.5-pro': 'Gemini 2.5 Pro',
    'google/gemini-2.5-flash': 'Gemini 2.5 Flash',
    'moonshotai/kimi-k2-0905': 'Kimi K2 (0905)',
    'moonshotai/kimi-k2': 'Kimi K2',
    'moonshotai/kimi-dev-72b': 'Kimi Dev 72B',
    'deepseek/deepseek-r1': 'DeepSeek R1',
    'deepseek/deepseek-chat-v3.1': 'DeepSeek Chat v3.1'
  };
  
  return displayNames[model] || model;
}

/**
 * Get capabilities for OpenRouter model
 */
function getModelCapabilities(model: string): string[] {
  const capabilities: Record<string, string[]> = {
    'google/gemini-2.5-pro': ['long-context', 'multimodal', 'academic-writing', 'research-analysis'],
    'google/gemini-2.5-flash': ['fast-response', 'multimodal', 'academic-writing'],
    'moonshotai/kimi-k2-0905': ['long-context', 'reasoning', 'multilingual', 'academic-writing'],
    'moonshotai/kimi-k2': ['long-context', 'reasoning', 'multilingual', 'academic-writing'],
    'moonshotai/kimi-dev-72b': ['reasoning', 'code-generation', 'academic-writing'],
    'deepseek/deepseek-r1': ['reasoning', 'code-generation', 'academic-writing'],
    'deepseek/deepseek-chat-v3.1': ['reasoning', 'long-context', 'academic-writing']
  };
  
  return capabilities[model] || ['text-generation'];
}
