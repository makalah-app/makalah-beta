import { NextRequest } from 'next/server';
import { validateAdminAccess } from '@/lib/admin/admin-auth';
import { deleteUserById } from '@/lib/admin/user-service';
import { supabaseAdmin } from '@/lib/database/supabase-client';

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
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
        },
      }, { status: 400 });
    }

    // Optional safety hardening: restrict destructive actions by role
    try {
      const { data: targetUser } = await (supabaseAdmin as any)
        .from('users')
        .select('id, role, email')
        .eq('id', userId)
        .maybeSingle();

      // Block deletion of superadmin entirely
      if (targetUser?.role === 'superadmin') {
        return Response.json({
          success: false,
          error: {
            message: 'Cannot delete superadmin account',
            type: 'authorization_error',
            code: 'DELETE_SUPERADMIN_FORBIDDEN',
          },
        }, { status: 403 });
      }

      // Only superadmin can delete admin users
      if (targetUser?.role === 'admin' && adminCheck.userRole !== 'superadmin') {
        return Response.json({
          success: false,
          error: {
            message: 'Only superadmin can delete admin accounts',
            type: 'authorization_error',
            code: 'DELETE_ADMIN_REQUIRES_SUPERADMIN',
          },
        }, { status: 403 });
      }
    } catch (_e) {
      // If target lookup fails, proceed with best-effort deletion (handled in service)
    }

    await deleteUserById(userId);

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete user';
    const status = message.includes('not found') ? 404 : 500;
    return Response.json({
      success: false,
      error: {
        message,
        type: status === 404 ? 'not_found' : 'internal_error',
      },
    }, { status });
  }
}
