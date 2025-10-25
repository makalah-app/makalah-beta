import { NextRequest } from 'next/server';
import { validateSuperAdminAccess } from '@/lib/admin/admin-auth';
import { supabaseAdmin } from '@/lib/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await validateSuperAdminAccess(request);
    if (!adminCheck.valid) {
      return Response.json({ success: false, error: { message: adminCheck.error || 'Superadmin required' } }, { status: 403 });
    }

    const body = await request.json().catch(() => null) as { ids?: string[] } | null;
    const ids = Array.isArray(body?.ids) ? body!.ids.filter(Boolean) : [];
    if (!ids.length) {
      return Response.json({ success: false, error: { message: 'No ids provided' } }, { status: 400 });
    }

    const { error } = await (supabaseAdmin as any)
      .from('waiting_list')
      .delete()
      .in('id', ids);

    if (error) {
      return Response.json({ success: false, error: { message: 'Gagal menghapus item' } }, { status: 500 });
    }

    return Response.json({ success: true, count: ids.length });
  } catch (e) {
    return Response.json({ success: false, error: { message: 'Gagal menghapus item' } }, { status: 500 });
  }
}

