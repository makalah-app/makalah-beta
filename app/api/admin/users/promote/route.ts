/**
 * Promote User to Admin API Endpoint
 *
 * Allows superadmin to promote regular users to admin role.
 * Restricted to superadmin access only.
 *
 * Features:
 * - Superadmin-only access
 * - Uses database function promote_to_admin()
 * - Audit logging via database trigger
 * - Validates target user exists and is eligible
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/database/supabase-client';
import { validateSuperAdminAccess } from '@/lib/admin/admin-auth';

// Request validation schema
const PromoteRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID format')
});

type PromoteRequest = z.infer<typeof PromoteRequestSchema>;

/**
 * POST /api/admin/users/promote - Promote user to admin
 */
export async function POST(request: NextRequest) {
  try {
    // Validate superadmin access
    const adminCheck = await validateSuperAdminAccess(request);
    if (!adminCheck.valid) {
      return Response.json({
        success: false,
        error: {
          message: adminCheck.error || 'Superadmin access required',
          type: 'auth_error',
          code: 'SUPERADMIN_ONLY'
        }
      }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedRequest: PromoteRequest = PromoteRequestSchema.parse(body);
    const { userId } = validatedRequest;

    // Check if target user exists and get their current role
    // Type assertion needed due to Supabase PostgREST type inference returning 'never'
    // See CLAUDE.md "Supabase Type Inference Workarounds" (commit 95c46e7)
    const { data: targetUser, error: userError } = await (supabaseAdmin as any)
      .from('users')
      .select('id, email, role')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !targetUser) {
      return Response.json({
        success: false,
        error: {
          message: 'User not found',
          type: 'validation_error',
          code: 'USER_NOT_FOUND'
        }
      }, { status: 404 });
    }

    // Check if user is already admin or superadmin
    if (targetUser.role === 'admin') {
      return Response.json({
        success: false,
        error: {
          message: 'User is already an admin',
          type: 'validation_error',
          code: 'ALREADY_ADMIN'
        }
      }, { status: 400 });
    }

    if (targetUser.role === 'superadmin') {
      return Response.json({
        success: false,
        error: {
          message: 'Cannot modify superadmin role',
          type: 'validation_error',
          code: 'SUPERADMIN_PROTECTED'
        }
      }, { status: 400 });
    }

    // Call database function to promote user
    // Type assertion needed due to Supabase PostgREST type inference returning 'never'
    // See CLAUDE.md "Supabase Type Inference Workarounds" (commit 95c46e7)
    const { data: promoteResult, error: promoteError } = await (supabaseAdmin as any).rpc(
      'promote_to_admin',
      {
        target_user_id: userId,
        promoted_by: adminCheck.userId
      }
    );

    if (promoteError) {
      return Response.json({
        success: false,
        error: {
          message: promoteError.message || 'Failed to promote user',
          type: 'operation_error',
          code: 'PROMOTION_FAILED',
          details: promoteError
        }
      }, { status: 500 });
    }

    if (!promoteResult) {
      return Response.json({
        success: false,
        error: {
          message: 'Promotion failed - database function returned false',
          type: 'operation_error',
          code: 'PROMOTION_FAILED'
        }
      }, { status: 500 });
    }

    // Get updated user data
    // Type assertion needed due to Supabase PostgREST type inference returning 'never'
    // See CLAUDE.md "Supabase Type Inference Workarounds" (commit 95c46e7)
    const { data: updatedUser, error: updateError } = await (supabaseAdmin as any)
      .from('users')
      .select('id, email, role, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (updateError || !updatedUser) {
      // Promotion succeeded but couldn't fetch updated data
      return Response.json({
        success: true,
        data: {
          userId,
          newRole: 'admin',
          message: 'User promoted to admin successfully',
          promotedBy: adminCheck.userEmail,
          timestamp: new Date().toISOString()
        }
      });
    }

    return Response.json({
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          updatedAt: updatedUser.updated_at
        },
        message: 'User promoted to admin successfully',
        promotedBy: adminCheck.userEmail,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to promote user';
    const statusCode = error instanceof z.ZodError ? 400 : 500;

    return Response.json({
      success: false,
      error: {
        message: errorMessage,
        type: error instanceof z.ZodError ? 'validation_error' : 'internal_error',
        details: error instanceof z.ZodError ? error.errors : undefined,
        code: error instanceof z.ZodError ? 'INVALID_REQUEST' : 'SERVER_ERROR'
      }
    }, { status: statusCode });
  }
}
