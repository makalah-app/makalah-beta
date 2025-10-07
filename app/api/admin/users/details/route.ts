import { NextRequest } from 'next/server';
import { validateAdminAccess } from '@/lib/admin/admin-auth';
import { fetchUsersPaginated, AdminUserStatus } from '@/lib/admin/user-service';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;

function parseInteger(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveJoinedSince(value: string | null): string | undefined {
  if (!value) return undefined;

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return undefined;

  if (trimmed.endsWith('d')) {
    const days = Number.parseInt(trimmed.slice(0, -1), 10);
    if (Number.isFinite(days) && days > 0) {
      const date = new Date();
      date.setDate(date.getDate() - days);
      return date.toISOString();
    }
  }

  const asDate = new Date(trimmed);
  if (!Number.isNaN(asDate.valueOf())) {
    return asDate.toISOString();
  }

  return undefined;
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInteger(searchParams.get('page'), 1), 1);
    const requestedPageSize = parseInteger(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE);
    const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);
    const search = searchParams.get('search') || undefined;
    const role = searchParams.get('role') || undefined;
    const statusParam = searchParams.get('status');
    const status = statusParam === 'active' || statusParam === 'suspended' ? statusParam as AdminUserStatus : undefined;
    const joinedSinceParam = searchParams.get('joinedSince');
    const lastActiveSinceParam = searchParams.get('lastActiveSince');
    const lastActiveBeforeParam = searchParams.get('lastActiveBefore');
    const joinedSince = resolveJoinedSince(joinedSinceParam);
    const lastActiveSince = resolveJoinedSince(lastActiveSinceParam);
    const lastActiveBefore = resolveJoinedSince(lastActiveBeforeParam);

    const { data, total } = await fetchUsersPaginated({
      page,
      pageSize,
      search,
      role,
      status,
      joinedSince,
      lastActiveSince,
      lastActiveBefore,
    });

    const totalPages = Math.max(Math.ceil(total / pageSize), 1);

    return Response.json({
      success: true,
      data,
      page,
      pageSize,
      total,
      totalPages,
      appliedFilters: {
        search: search ?? null,
        role: role ?? null,
        status: status ?? null,
        joinedSince: joinedSinceParam ?? null,
        lastActiveSince: lastActiveSinceParam ?? null,
        lastActiveBefore: lastActiveBeforeParam ?? null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch users';
    return Response.json({
      success: false,
      error: {
        message,
        type: 'internal_error',
      },
    }, { status: 500 });
  }
}
