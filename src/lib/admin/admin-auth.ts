import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../database/supabase-client';
import { UserRole } from '../auth/role-permissions';

const ADMIN_EMAIL = 'makalah.app@gmail.com';

export interface AdminAccessResult {
  valid: boolean;
  error?: string;
  userId?: string;
  userEmail?: string;
  userRole?: UserRole;
}

/**
 * Validate admin access (admin or superadmin role)
 */
export async function validateAdminAccess(request: NextRequest): Promise<AdminAccessResult> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { valid: false, error: 'No authorization header' };
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return { valid: false, error: 'Invalid token' };
    }

    // Get user role from public.users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, role')
      .eq('id', user.id)
      .maybeSingle() as any;

    if (userError || !userData) {
      return { valid: false, error: 'User data not found' };
    }

    const userRole = userData.role as UserRole;

    // Check if user is admin or superadmin
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      return { valid: false, error: 'Admin access required' };
    }

    return {
      valid: true,
      userId: userData.id,
      userEmail: userData.email,
      userRole
    };
  } catch (error) {
    return { valid: false, error: 'Auth validation failed' };
  }
}

/**
 * Validate superadmin access (superadmin role only)
 */
export async function validateSuperAdminAccess(request: NextRequest): Promise<AdminAccessResult> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { valid: false, error: 'No authorization header' };
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return { valid: false, error: 'Invalid token' };
    }

    // Get user role from public.users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, role')
      .eq('id', user.id)
      .maybeSingle() as any;

    if (userError || !userData) {
      return { valid: false, error: 'User data not found' };
    }

    const userRole = userData.role as UserRole;

    // Check if user is superadmin
    if (userRole !== 'superadmin') {
      return { valid: false, error: 'Superadmin access required' };
    }

    return {
      valid: true,
      userId: userData.id,
      userEmail: userData.email,
      userRole
    };
  } catch (error) {
    return { valid: false, error: 'Auth validation failed' };
  }
}

export { ADMIN_EMAIL };
