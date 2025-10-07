import { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateAdminAccess } from '@/lib/admin/admin-auth';
import { toggleUserStatus } from '@/lib/admin/user-service';

const ToggleActionSchema = z.object({
  action: z.enum(['suspend', 'activate']),
});

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  try {
    const adminCheck = await validateAdminAccess(request);
    if (!adminCheck.valid) {
      return Response.json({
        success: false,
        error: {
          message: adminCheck.error || 'Admin access required',
          type: 'auth_error',
          code: 'ADMIN_ONLY',
        },
      }, { status: 403 });
    }

    const userId = context.params.id;
    if (!userId) {
      return Response.json({
        success: false,
        error: {
          message: 'User id required',
          type: 'validation_error',
          code: 'MISSING_USER_ID',
        },
      }, { status: 400 });
    }

    const payload = await request.json().catch(() => ({}));
    const { action } = ToggleActionSchema.parse(payload);

    const updatedUser = await toggleUserStatus(userId, action);

    return Response.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.is_active,
        createdAt: updatedUser.created_at,
        lastLoginAt: updatedUser.last_login_at,
        profile: {
          firstName: updatedUser.user_profiles?.first_name ?? null,
          lastName: updatedUser.user_profiles?.last_name ?? null,
          displayName: updatedUser.user_profiles?.display_name ?? null,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({
        success: false,
        error: {
          message: 'Invalid request payload',
          type: 'validation_error',
          code: 'INVALID_PAYLOAD',
          details: error.errors,
        },
      }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'Failed to toggle user status';
    const isNotFound = /not found/i.test(message);

    return Response.json({
      success: false,
      error: {
        message,
        type: isNotFound ? 'not_found' : 'internal_error',
        code: isNotFound ? 'USER_NOT_FOUND' : 'TOGGLE_FAILED',
      },
    }, { status: isNotFound ? 404 : 500 });
  }
}
