import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/database/supabase-client';
import { getServerSessionUserId } from '../../../../src/lib/database/supabase-server-auth';

// Supabase JS uses Node APIs that are not compatible with the Edge runtime.
// Ensure this route runs on the Node.js runtime to avoid build warnings/errors.
export const runtime = 'nodejs';

interface ProvisionPayload {
  userId: string;
  email: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  institution?: string | null;
  predikat?: string | null;
  emailVerifiedAt?: string | null;
  role?: string | null;
}

const sanitizeString = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

export async function POST(request: NextRequest) {
  try {
    // Secure, server-side provisioning for the CURRENT session user only
    const sessionUserId = await getServerSessionUserId();

    if (!sessionUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const json = await request.json().catch(() => ({}));

    // Ignore any spoofed IDs from client; only trust the session
    const payload: ProvisionPayload = {
      userId: sessionUserId,
      email: sanitizeString(json.email) || '',
      fullName: sanitizeString(json.fullName) || undefined,
      firstName: sanitizeString(json.firstName) || undefined,
      lastName: sanitizeString(json.lastName) || undefined,
      institution: sanitizeString(json.institution),
      predikat: sanitizeString(json.predikat),
      role: sanitizeString(json.role) || undefined,
    };

    // 1) Ensure users row exists and is active
    const nowIso = new Date().toISOString();
    const { error: upsertUserErr } = await (supabaseAdmin as any)
      .from('users')
      .upsert({
        id: payload.userId,
        email: payload.email || `${payload.userId}@local.local`,
        // Keep backward compatibility with NOT NULL in some environments
        password_hash: 'SUPABASE_AUTH',
        role: payload.role || 'user',
        is_active: true,
        email_verified_at: null,
        updated_at: nowIso,
        created_at: nowIso,
      }, { onConflict: 'id' });

    if (upsertUserErr && upsertUserErr.code !== 'PGRST116') {
      return NextResponse.json({ success: false, error: upsertUserErr.message }, { status: 500 });
    }

    // 2) Ensure user_profiles row exists (single row per user)
    const fullName = (payload.fullName || '').trim();
    const firstName = (payload.firstName || (fullName.split(' ')[0] || '') || 'User').trim();
    const lastName = (payload.lastName || (fullName.includes(' ') ? fullName.split(' ').slice(1).join(' ') : firstName)).trim();

    const { error: upsertProfileErr } = await (supabaseAdmin as any)
      .from('user_profiles')
      .upsert({
        user_id: payload.userId,
        first_name: firstName || 'User',
        last_name: lastName || firstName || 'User',
        display_name: fullName || `${firstName} ${lastName}`.trim(),
        institution: payload.institution || null,
        predikat: payload.predikat || null,
        created_at: nowIso,
        updated_at: nowIso,
      }, { onConflict: 'user_id' });

    if (upsertProfileErr && upsertProfileErr.code !== 'PGRST116') {
      return NextResponse.json({ success: false, error: upsertProfileErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Provisioning failed',
    }, { status: 500 });
  }
}
