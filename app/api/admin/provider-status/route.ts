/**
 * Admin Provider Status API Endpoint
 *
 * Returns current provider failover state for admin monitoring.
 * Restricted to admin access only.
 *
 * Features:
 * - GET: Retrieve current failover state
 * - Admin-only access with token validation
 * - Real-time provider health monitoring
 */

import { NextRequest } from 'next/server';
import { getProviderManager } from '@/lib/ai/providers';
import { validateAdminAccess as validateAdmin } from '@/lib/admin/admin-auth';

/**
 * GET /api/admin/provider-status - Get current failover state
 */
export async function GET(request: NextRequest) {
  try {
    // Validate admin access (admin or superadmin)
    const adminCheck = await validateAdmin(request);
    if (!adminCheck.valid) {
      return Response.json({
        success: false,
        error: {
          message: adminCheck.error || 'Admin access required',
          type: 'auth_error',
          code: 'ADMIN_ONLY'
        }
      }, { status: 403 });
    }

    const providerManager = getProviderManager();
    const failoverState = providerManager.getFailoverState();

    return Response.json({
      success: true,
      data: {
        isInFailover: failoverState.isInFailover,
        consecutiveFailures: failoverState.consecutiveFailures,
        circuitBreakerOpen: failoverState.circuitBreakerOpen,
        primaryFailures: failoverState.primaryFailures,
        failoverStartTime: failoverState.failoverStartTime,
        nextRetryTime: failoverState.nextRetryTime
      },
      message: 'Provider status retrieved successfully',
      metadata: {
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to get provider status',
        type: 'internal_error',
        code: 'GET_ERROR'
      }
    }, { status: 500 });
  }
}
