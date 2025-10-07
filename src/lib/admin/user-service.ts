import { AuthApiError } from '@supabase/supabase-js';
import { supabaseAdmin } from '../database/supabase-client';

export type AdminUserStatus = 'active' | 'suspended';
export type ToggleUserAction = 'suspend' | 'activate';

export interface PaginatedUsersParams {
  page: number;
  pageSize: number;
  search?: string;
  role?: string;
  status?: AdminUserStatus;
  joinedSince?: string; // ISO string
  lastActiveSince?: string; // ISO string
  lastActiveBefore?: string; // ISO string
}

export interface AdminUserRow {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  user_profiles: {
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
  } | null;
}

export interface PaginatedUsersResult {
  data: AdminUserRow[];
  total: number;
}

export async function fetchUsersPaginated(params: PaginatedUsersParams): Promise<PaginatedUsersResult> {
  const { page, pageSize, search, role, status, joinedSince, lastActiveSince, lastActiveBefore } = params;
  const offset = (page - 1) * pageSize;

  let query = supabaseAdmin
    .from('users')
    .select('id,email,role,is_active,created_at,last_login_at,user_profiles(first_name,last_name,display_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (role) {
    query = query.eq('role', role);
  }

  if (status) {
    query = query.eq('is_active', status === 'active');
  }

  if (joinedSince) {
    query = query.gte('created_at', joinedSince);
  }

  if (lastActiveSince) {
    query = query.gte('last_login_at', lastActiveSince);
  }

  if (lastActiveBefore) {
    const orConditions = [`last_login_at.lte.${lastActiveBefore}`, 'last_login_at.is.null'];
    query = query.or(orConditions.join(','));
  }

  if (search) {
    const sanitized = search.replace(/%/g, '\\%').replace(/_/g, '\\_');
    query = query.or(`email.ilike.%${sanitized}%`);
    query = query.or(`display_name.ilike.%${sanitized}%,first_name.ilike.%${sanitized}%,last_name.ilike.%${sanitized}%`, {
      foreignTable: 'user_profiles',
    });
  }

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return {
    data: data ?? [],
    total: count ?? 0,
  };
}

export async function toggleUserStatus(id: string, action: ToggleUserAction): Promise<AdminUserRow> {
  const suspend = action === 'suspend';
  const updatePayload = {
    is_active: !suspend,
    locked_until: suspend ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updatePayload)
    .eq('id', id)
    .select('id,email,role,is_active,created_at,last_login_at,user_profiles(first_name,last_name,display_name)')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('User not found');
  }

  // Try to update app metadata, ignore failure to avoid blocking admin action
  try {
    await supabaseAdmin.auth.admin.updateUserById(id, {
      app_metadata: { suspended: suspend },
    });
  } catch (_err) {
    // no-op
  }

  return data;
}

export async function deleteUserById(id: string): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) {
    if (error instanceof AuthApiError && error.status === 404) {
      throw new Error('User not found');
    }

    throw error;
  }
}
