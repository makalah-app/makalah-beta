import { NextRequest } from 'next/server';
import { validateAdminAccess } from '@/lib/admin/admin-auth';
import { deleteUserById } from '@/lib/admin/user-service';

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
