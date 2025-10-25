import { NextRequest } from 'next/server';
import { validateSuperAdminAccess } from '@/lib/admin/admin-auth';
import { supabaseAdmin } from '@/lib/database/supabase-client';

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  try {
    const adminCheck = await validateSuperAdminAccess(request);
    if (!adminCheck.valid) {
      return Response.json({ success: false, error: { message: adminCheck.error || 'Superadmin required' } }, { status: 403 });
    }

    const id = context.params.id;
    if (!id) {
      return Response.json({ success: false, error: { message: 'Missing id' } }, { status: 400 });
    }

    const { error } = await (supabaseAdmin as any)
      .from('waiting_list')
      .delete()
      .eq('id', id);

    if (error) {
      return Response.json({ success: false, error: { message: 'Gagal menghapus item' } }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ success: false, error: { message: 'Gagal menghapus item' } }, { status: 500 });
  }
}

