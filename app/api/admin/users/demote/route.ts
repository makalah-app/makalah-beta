/**
 * Demote Admin to User API Endpoint
 *
 * Allows superadmin to demote admin users back to regular user role.
 * Restricted to superadmin access only.
 *
 * Features:
 * - Superadmin-only access
 * - Uses database function demote_to_user()
 * - Audit logging via database trigger
 * - Validates target user exists and is eligible
 * - Protects superadmin role from demotion
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/database/supabase-client';
import { validateSuperAdminAccess } from '@/lib/admin/admin-auth';

// Request validation schema
const DemoteRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID format')
});

type DemoteRequest = z.infer<typeof DemoteRequestSchema>;

/**
 * POST /api/admin/users/demote - Demote admin to user
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
    const validatedRequest: DemoteRequest = DemoteRequestSchema.parse(body);
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

    // Validate role eligibility (only admin can be demoted)
    if (targetUser.role === 'superadmin') {
      return Response.json({
        success: false,
        error: {
          message: 'Cannot demote superadmin - role is protected',
          type: 'validation_error',
          code: 'SUPERADMIN_PROTECTED'
        }
      }, { status: 400 });
    }

    if (targetUser.role !== 'admin') {
      // Covers: user (already demoted), guest (invalid), or unknown roles
      const message = targetUser.role === 'user'
        ? 'User is already a regular user'
        : 'Only admin users can be demoted to user role';
      const code = targetUser.role === 'user' ? 'ALREADY_USER' : 'INVALID_ROLE';

      return Response.json({
        success: false,
        error: {
          message,
          type: 'validation_error',
          code
        }
      }, { status: 400 });
    }

    // Call database function to demote user
    // Type assertion needed due to Supabase PostgREST type inference returning 'never'
    // See CLAUDE.md "Supabase Type Inference Workarounds" (commit 95c46e7)
    const { data: demoteResult, error: demoteError } = await (supabaseAdmin as any).rpc(
      'demote_to_user',
      {
        target_user_id: userId,
        demoted_by: adminCheck.userId
      }
    );

    if (demoteError) {
      return Response.json({
        success: false,
        error: {
          message: demoteError.message || 'Failed to demote admin',
          type: 'operation_error',
          code: 'DEMOTION_FAILED',
          details: demoteError
        }
      }, { status: 500 });
    }

    if (!demoteResult) {
      return Response.json({
        success: false,
        error: {
          message: 'Demotion failed - database function returned false',
          type: 'operation_error',
          code: 'DEMOTION_FAILED'
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
      // Demotion succeeded but couldn't fetch updated data
      return Response.json({
        success: true,
        data: {
          userId,
          newRole: 'user',
          message: 'Admin demoted to user successfully',
          demotedBy: adminCheck.userEmail,
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
        message: 'Admin demoted to user successfully',
        demotedBy: adminCheck.userEmail,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to demote admin';
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
