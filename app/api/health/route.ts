/**
 * Health Check API Endpoint
 * System health monitoring and diagnostics for Makalah AI platform
 * 
 * Based on Vercel AI SDK v5 Core patterns from:
 * - /documentation/docs/03-ai-sdk-core/45-provider-management.mdx
 * - /documentation/docs/03-ai-sdk-core/50-error-handling.mdx
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';

// Import existing infrastructure for health checks
import { getProviderManager, type ProviderHealthStatus } from '../../../src/lib/ai/config/provider-adapter';
import { getSSEHandler } from '../../../src/lib/ai/streaming/sse-handler';

// Import configuration
import { env } from '../../../src/lib/config/env';

/**
 * Health check request schema
 */
const HealthCheckSchema = z.object({
  checks: z.array(z.enum(['providers', 'tools', 'streaming', 'workflow', 'persona', 'system'])).default(['providers', 'streaming', 'system']),
  detailed: z.boolean().default(false),
  timeout: z.number().min(1000).max(30000).default(10000),
});

type HealthCheckRequest = z.infer<typeof HealthCheckSchema>;

/**
 * Health status type
 */
type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Component health info
 */
interface ComponentHealth {
  status: HealthStatus;
  message: string;
  responseTime?: number;
  details?: any;
  lastChecked: string;
  issues?: string[];
}

/**
 * GET /api/health - System health check
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const parsedParams = {
      ...queryParams,
      checks: queryParams.checks ? queryParams.checks.split(',') : undefined,
      detailed: queryParams.detailed === 'true',
      timeout: queryParams.timeout ? parseInt(queryParams.timeout) : undefined,
    };

    const validatedRequest: HealthCheckRequest = HealthCheckSchema.parse(parsedParams);
    const { checks, detailed, timeout } = validatedRequest;

    const healthResults: Record<string, ComponentHealth> = {};
    let overallStatus: HealthStatus = 'healthy';

    // Provider health check
    if (checks.includes('providers')) {
      try {
        const providerCheckStart = Date.now();
        const providerManager = getProviderManager();
        const providerHealth = await Promise.race([
          providerManager.getProviderHealthStatus(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout)),
        ]) as ProviderHealthStatus;

        const responseTime = Date.now() - providerCheckStart;
        const issues: string[] = [];

        let providerStatus: HealthStatus = 'healthy';
        const providerEntries = Object.entries(providerHealth);
        const unhealthyProviders = providerEntries.filter(([_, health]) => health.status === 'unhealthy');

        if (unhealthyProviders.length > 0) {
          providerStatus = unhealthyProviders.length === providerEntries.length ? 'unhealthy' : 'degraded';
          unhealthyProviders.forEach(([provider, _]) => {
            issues.push(`Provider ${provider} is unhealthy`);
          });
        }

        healthResults.providers = {
          status: providerStatus,
          message: providerStatus === 'healthy' ? 'All providers healthy' : `Provider issues detected`,
          responseTime,
          details: detailed ? providerHealth : undefined,
          lastChecked: new Date().toISOString(),
          issues: issues.length > 0 ? issues : undefined,
        };

        if (providerStatus !== 'healthy' && overallStatus === 'healthy') {
          overallStatus = providerStatus;
        }
      } catch (error) {
        healthResults.providers = {
          status: 'unhealthy',
          message: `Provider health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          lastChecked: new Date().toISOString(),
          issues: ['Health check timeout or failure'],
        };
        overallStatus = 'unhealthy';
      }
    }

    // Tools health check - Simplified since tool registry not implemented
    if (checks.includes('tools')) {
      const toolCheckStart = Date.now();
      const responseTime = Date.now() - toolCheckStart;

      healthResults.tools = {
        status: 'healthy',
        message: 'Tool registry not implemented - basic tools available',
        responseTime,
        details: detailed ? {
          note: 'Tool registry architecture not implemented',
          basicTools: ['webSearch', 'artifact generation'],
        } : {
          note: 'Tool registry not implemented',
        },
        lastChecked: new Date().toISOString(),
      };
    }

    // Streaming health check
    if (checks.includes('streaming')) {
      try {
        const streamingCheckStart = Date.now();
        const sseHandler = getSSEHandler();
        const responseTime = Date.now() - streamingCheckStart;

        // Basic availability check - SSE handler class exists
        const isAvailable = typeof sseHandler.createSSEResponse === 'function';

        healthResults.streaming = {
          status: isAvailable ? 'healthy' : 'degraded',
          message: isAvailable ? 'SSE handler available' : 'SSE handler not properly configured',
          responseTime,
          details: detailed ? {
            handlerType: 'SimpleSSEHandler',
            available: isAvailable,
            note: 'Connection stats not implemented in simplified handler',
          } : {
            available: isAvailable,
          },
          lastChecked: new Date().toISOString(),
        };

        if (!isAvailable && overallStatus === 'healthy') {
          overallStatus = 'degraded';
        }
      } catch (error) {
        healthResults.streaming = {
          status: 'degraded',
          message: `Streaming check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          lastChecked: new Date().toISOString(),
          issues: ['SSE handler check failed'],
        };
        if (overallStatus === 'healthy') overallStatus = 'degraded';
      }
    }

    // Workflow health check - Simplified since workflow engine not implemented
    if (checks.includes('workflow')) {
      const workflowCheckStart = Date.now();
      const responseTime = Date.now() - workflowCheckStart;

      healthResults.workflow = {
        status: 'healthy',
        message: 'Workflow engine not implemented - basic chat workflow available',
        responseTime,
        details: detailed ? {
          note: 'Workflow engine architecture not implemented',
          basicWorkflow: '7-phase academic methodology in chat',
          phases: 7,
        } : {
          note: 'Workflow engine not implemented',
        },
        lastChecked: new Date().toISOString(),
      };
    }

    // Persona health check - Simplified since persona manager not implemented
    if (checks.includes('persona')) {
      const personaCheckStart = Date.now();
      const responseTime = Date.now() - personaCheckStart;

      healthResults.persona = {
        status: 'healthy',
        message: 'Persona manager not implemented - academic persona in system prompt',
        responseTime,
        details: detailed ? {
          note: 'Persona manager architecture not implemented',
          implementation: 'Academic persona embedded in system prompt',
          phases: 7,
        } : {
          note: 'Persona manager not implemented',
        },
        lastChecked: new Date().toISOString(),
      };
    }

    // System health check
    if (checks.includes('system')) {
      const systemCheckStart = Date.now();
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      const responseTime = Date.now() - systemCheckStart;

      let systemStatus: HealthStatus = 'healthy';
      const issues: string[] = [];

      // Check memory usage (warn if > 80% of heap limit)
      const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      if (heapUsagePercent > 90) {
        systemStatus = 'unhealthy';
        issues.push(`High memory usage: ${heapUsagePercent.toFixed(1)}%`);
      } else if (heapUsagePercent > 80) {
        systemStatus = 'degraded';
        issues.push(`Elevated memory usage: ${heapUsagePercent.toFixed(1)}%`);
      }

      healthResults.system = {
        status: systemStatus,
        message: `Node.js ${process.version}, uptime: ${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
        responseTime,
        details: detailed ? {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          environment: env.NODE_ENV,
          uptime: uptime,
          memory: {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
            external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB',
            rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
          },
        } : {
          uptime: Math.floor(uptime),
          memoryUsage: Math.round(heapUsagePercent) + '%',
        },
        lastChecked: new Date().toISOString(),
        issues: issues.length > 0 ? issues : undefined,
      };

      if (systemStatus !== 'healthy' && overallStatus !== 'unhealthy') {
        overallStatus = systemStatus;
      }
    }

    const totalResponseTime = Date.now() - startTime;

    // Return health status
    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
    
    return Response.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: totalResponseTime,
      checks: healthResults,
      summary: {
        healthy: Object.values(healthResults).filter(h => h.status === 'healthy').length,
        degraded: Object.values(healthResults).filter(h => h.status === 'degraded').length,
        unhealthy: Object.values(healthResults).filter(h => h.status === 'unhealthy').length,
        total: Object.keys(healthResults).length,
      },
    }, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0',
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('❌ Health check error:', error);
    
    const totalResponseTime = Date.now() - startTime;

    return Response.json({
      status: 'unhealthy',
      error: {
        message: error instanceof Error ? error.message : 'Health check failed',
        type: 'health_check_error',
      },
      timestamp: new Date().toISOString(),
      responseTime: totalResponseTime,
    }, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0',
        'Content-Type': 'application/json',
      },
    });
  }
}

/**
 * HEAD /api/health - Simple health ping
 */
export async function HEAD() {
  try {
    // Simple availability check
    const startTime = Date.now();
    const responseTime = Date.now() - startTime;
    
    return new Response(null, {
      status: 200,
      headers: {
        'X-Health-Status': 'ok',
        'X-Response-Time': `${responseTime}ms`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    return new Response(null, {
      status: 503,
      headers: {
        'X-Health-Status': 'error',
        'Cache-Control': 'no-cache',
      },
    });
  }
}

/**
 * POST /api/health - Health check with custom parameters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedRequest: HealthCheckRequest = HealthCheckSchema.parse(body);
    
    // Redirect to GET with query parameters
    const searchParams = new URLSearchParams({
      checks: validatedRequest.checks.join(','),
      detailed: validatedRequest.detailed.toString(),
      timeout: validatedRequest.timeout.toString(),
    });
    
    const getRequest = new NextRequest(
      new URL(`/api/health?${searchParams}`, request.url),
      { method: 'GET' }
    );
    
    return GET(getRequest);
    
  } catch (error) {
    console.error('❌ Health POST error:', error);
    
    return Response.json({
      error: {
        message: error instanceof Error ? error.message : 'Invalid health check request',
        type: error instanceof z.ZodError ? 'validation_error' : 'internal_error',
        details: error instanceof z.ZodError ? error.errors : undefined,
      },
    }, { status: 400 });
  }
}