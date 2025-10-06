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
import { supabaseAdmin } from '@/lib/database/supabase-client';
import { getProviderManager } from '@/lib/ai/providers';

// Admin email hardcoded for security
const ADMIN_EMAIL = 'makalah.app@gmail.com';

/**
 * Validate admin access from request
 */
async function validateAdminAccess(request: NextRequest): Promise<{ valid: boolean; error?: string }> {
  try {
    // Get Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { valid: false, error: 'No authorization header' };
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return { valid: false, error: 'Invalid token' };
    }

    // Check if user is admin
    const isAdmin = user.email === ADMIN_EMAIL;

    if (!isAdmin) {
      return { valid: false, error: 'Admin access required' };
    }

    return { valid: true };

  } catch (error) {
    return { valid: false, error: 'Auth validation failed' };
  }
}

/**
 * GET /api/admin/provider-status - Get current failover state
 */
export async function GET(request: NextRequest) {
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
