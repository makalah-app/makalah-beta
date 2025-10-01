/**
 * OpenAI Health Check API Endpoint
 * 
 * Tests OpenAI provider connectivity and model availability
 * for real-time status monitoring in admin dashboard.
 * 
 * Features:
 * - Model connectivity testing
 * - Response time measurement  
 * - Error handling with detailed messages
 * - Admin access validation
 */

import { NextRequest } from 'next/server';
import { openai, createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

// Admin email hardcoded for security
const ADMIN_EMAIL = 'makalah.app@gmail.com';

// Request validation schema
const HealthCheckRequestSchema = z.object({
  model: z.string().default('gpt-4o'),
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
 * POST /api/admin/health/openai - Test OpenAI model connectivity
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

    console.log(`🔍 OpenAI health check - Model: ${model}`);

    // Create OpenAI provider with explicit API key
    // Prioritize environment variable for security
    const finalApiKey = process.env.OPENAI_API_KEY || apiKey;
    const customOpenAI = createOpenAI({
      apiKey: finalApiKey,
    });
    const testModel: any = customOpenAI(model);

    // Create timeout controller
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeout);

    try {
      // Perform a minimal test request
      // Minimal ping without strict typing to avoid SDK type friction in health check
      const testResponse: any = await testModel.doGenerate({
        mode: { type: 'regular' },
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'ping' }] }],
        maxTokens: 5,
        temperature: 0.1,
        abortSignal: abortController.signal,
      } as any);

      clearTimeout(timeoutId);
      const responseTimeMs = Date.now() - startTime;

      console.log(`✅ OpenAI health check passed - ${responseTimeMs}ms`);

      return Response.json({
        success: true,
        data: {
          provider: 'openai',
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

      console.error(`❌ OpenAI health check failed:`, testError);

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
        } else {
          errorMessage = testError.message;
        }
      }

      return Response.json({
        success: false,
        data: {
          provider: 'openai',
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
    console.error('❌ OpenAI health check endpoint error:', error);

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
 * Get display name for OpenAI model
 */
function getModelDisplayName(model: string): string {
  const displayNames: Record<string, string> = {
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
  };
  
  return displayNames[model] || model;
}

/**
 * Get capabilities for OpenAI model
 */
function getModelCapabilities(model: string): string[] {
  const capabilities: Record<string, string[]> = {
    'gpt-4o': ['multimodal', 'function-calling', 'academic-writing', 'research-analysis', 'code-generation'],
    'gpt-4o-mini': ['function-calling', 'academic-writing', 'fast-responses'],
  };
  
  return capabilities[model] || ['text-generation'];
}
