import { NextRequest } from 'next/server';
import { validateSuperAdminAccess } from '@/lib/admin/admin-auth';
import { supabaseAdmin } from '@/lib/database/supabase-client';

function parseIntSafe(v: string | null, fallback: number) {
  const n = v ? Number.parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await validateSuperAdminAccess(request);
    if (!adminCheck.valid) {
      return Response.json({ success: false, error: { message: adminCheck.error || 'Superadmin required' } }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseIntSafe(searchParams.get('page'), 1), 1);
    const pageSize = Math.min(parseIntSafe(searchParams.get('pageSize'), 50), 100);
    const search = (searchParams.get('search') || '').trim();
    const statusParam = (searchParams.get('status') || '').trim().toLowerCase();
    const allowedStatus = ['pending','invited','converted'];

    let query = (supabaseAdmin as any)
      .from('waiting_list')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('email', `%${search}%`);
    }
    if (statusParam && allowedStatus.includes(statusParam)) {
      query = query.eq('status', statusParam);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query.range(from, to);

    if (error) {
      return Response.json({ success: false, error: { message: 'Gagal memuat data' } }, { status: 500 });
    }

    return Response.json({
      success: true,
      data: data || [],
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.max(Math.ceil((count || 0) / pageSize), 1)
    });
  } catch (e) {
    return Response.json({ success: false, error: { message: 'Gagal memuat data' } }, { status: 500 });
  }
}
