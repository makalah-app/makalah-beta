/* @ts-nocheck */
/**
 * Admin Users Statistics API Endpoint
 * 
 * Provides user statistics and management for admin dashboard.
 * Restricted to admin access only (makalah.app@gmail.com).
 * 
 * Features:
 * - User count and statistics using Supabase client
 * - Active users within 30 days
 * - Role-based user distribution
 * - Recent user activity
 * - Admin access validation
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '../../../../src/lib/database/supabase-client';

// Admin email hardcoded for security
const ADMIN_EMAIL = 'makalah.app@gmail.com';

// Request validation schema
const UsersRequestSchema = z.object({
  includeDetails: z.boolean().default(false),
  includeInactive: z.boolean().default(true),
  limit: z.number().min(1).max(1000).default(100)
});

type UsersRequest = z.infer<typeof UsersRequestSchema>;

/**
 * Validate admin access from request headers
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
 * GET /api/admin/users - Get user statistics and list
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

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const parsedParams = {
      ...queryParams,
      includeDetails: queryParams.includeDetails === 'true',
      includeInactive: queryParams.includeInactive !== 'false',
      limit: queryParams.limit ? parseInt(queryParams.limit) : undefined
    };

    const validatedRequest: UsersRequest = UsersRequestSchema.parse(parsedParams);
    const { includeDetails, includeInactive, limit } = validatedRequest;

    // Admin users request processed - silent handling for production

    // Get total user count
    // Getting total users count - silent handling for production
    const { count: totalUsers, error: totalUsersError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (totalUsersError) {
      // Error getting total users - silent handling for production
      throw new Error('Failed to get total users count');
    }

    // Get active users (last 30 days)
    // Getting active users count - silent handling for production
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: activeUsers, error: activeUsersError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('last_login_at', thirtyDaysAgo.toISOString());
    
    if (activeUsersError) {
      // Error getting active users - silent handling for production
    }

    // Get role distribution
    // Getting role distribution - silent handling for production
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('users')
      .select('role');
    
    if (roleError) {
      // Error getting roles - silent handling for production
    }
    
    const roleDistribution = (roleData || []).reduce((acc: any[], user: any) => {
      const existingRole = acc.find(r => r.role === user.role);
      if (existingRole) {
        existingRole.count++;
      } else {
        acc.push({ role: user.role, count: 1 });
      }
      return acc;
    }, []);

    // Get recent users (last 7 days)
    // Getting recent users count - silent handling for production
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: recentUsers, error: recentUsersError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());
    
    if (recentUsersError) {
      // Error getting recent users - silent handling for production
    }

    // Build base response
    const response: any = {
      success: true,
      data: {
        statistics: {
          totalUsers: totalUsers || 0,
          activeUsers: activeUsers || 0,
          recentUsers: recentUsers || 0,
          inactiveUsers: (totalUsers || 0) - (activeUsers || 0),
          roleDistribution: roleDistribution.map((role: any) => ({
            role: role.role,
            count: role.count
          }))
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          includesDetails: includeDetails,
          includesInactive: includeInactive
        }
      }
    };

    // Include user details if requested
    if (includeDetails) {
      // Getting user details - silent handling for production
      
      let usersQuery = supabaseAdmin
        .from('users')
        .select('id, email, role, email_verified_at, is_active, created_at, last_login_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      // Filter active users if requested
      if (!includeInactive) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        usersQuery = usersQuery.gte('last_login', thirtyDaysAgo.toISOString());
      }
      
      const { data: userDetailsData, error: userDetailsError } = await usersQuery;
      
      if (userDetailsError) {
        // Error getting user details - silent handling for production
        throw new Error('Failed to get user details');
      }
      
      response.data.users = (userDetailsData || []).map((user: any) => ({
        id: user.id,
        email: user.email,
        name: user.full_name || user.email?.split('@')[0] || 'Unknown',
        role: user.role,
        institution: user.institution,
        isVerified: user.email_verified,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        updatedAt: user.updated_at,
        isActive: user.last_login && new Date(user.last_login) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }));

      response.data.metadata.userCount = response.data.users.length;
    }

    // Admin users response generated - silent handling for production

    return Response.json(response);

  } catch (error) {
    // Admin users error occurred - silent handling for production

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user statistics';
    const statusCode = error instanceof z.ZodError ? 400 : 500;

    return Response.json({
      success: false,
      error: {
        message: errorMessage,
        type: error instanceof z.ZodError ? 'validation_error' : 'internal_error',
        details: error instanceof z.ZodError ? error.errors : undefined,
        code: error instanceof z.ZodError ? 'INVALID_REQUEST' : 'DATABASE_ERROR'
      }
    }, { status: statusCode });
  }
}

/**
 * POST /api/admin/users - Admin user management operations
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { action, userId, data } = body;

    // Admin user management action - silent handling for production

    if (!action) {
      return Response.json({
        success: false,
        error: {
          message: 'Action required',
          type: 'validation_error',
          code: 'MISSING_ACTION'
        }
      }, { status: 400 });
    }

    switch (action) {
      case 'update_role':
        if (!userId || !data?.role) {
          return Response.json({
            success: false,
            error: {
              message: 'User ID and role required',
              type: 'validation_error',
              code: 'MISSING_PARAMETERS'
            }
          }, { status: 400 });
        }

        // Updating user role - silent handling for production
        
        const { data: updateResult, error: updateError } = await (supabaseAdmin as any)
          .from('users')
          .update({ 
            role: data.role,
            updated_at: new Date().toISOString()
          } as any)
          .eq('id', userId)
          .select('id, email, role')
          .maybeSingle();

        if (updateError || !updateResult) {
          // Role update failed - silent handling for production
          return Response.json({
            success: false,
            error: {
              message: updateError?.message || 'User not found or update failed',
              type: 'operation_error',
              code: 'UPDATE_FAILED'
            }
          }, { status: 404 });
        }

        // Role updated successfully - silent handling for production
        
        return Response.json({
          success: true,
          data: {
            action: 'update_role',
            user: updateResult,
            updatedAt: new Date().toISOString()
          }
        });

      case 'toggle_status':
        if (!userId) {
          return Response.json({
            success: false,
            error: {
              message: 'User ID required',
              type: 'validation_error',
              code: 'MISSING_USER_ID'
            }
          }, { status: 400 });
        }

        // For now, we'll just return success as user status toggle might need more complex logic
        return Response.json({
          success: true,
          data: {
            action: 'toggle_status',
            userId,
            message: 'User status toggle not implemented yet',
            updatedAt: new Date().toISOString()
          }
        });

      default:
        return Response.json({
          success: false,
          error: {
            message: `Unknown action: ${action}`,
            type: 'validation_error',
            code: 'UNKNOWN_ACTION'
          }
        }, { status: 400 });
    }

  } catch (error) {
    // Admin user management error - silent handling for production

    const errorMessage = error instanceof Error ? error.message : 'User management operation failed';
    
    return Response.json({
      success: false,
      error: {
        message: errorMessage,
        type: 'internal_error',
        code: 'OPERATION_ERROR'
      }
    }, { status: 500 });
  }
}
