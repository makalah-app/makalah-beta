import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/database/supabase-client';
import { getServerSessionUserId } from '../../../../src/lib/database/supabase-server-auth';

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
    const { userId } = await getServerSessionUserId();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }

    const payload = (await request.json()) as ProvisionPayload;

    if (!payload?.userId || !payload?.email) {
      return NextResponse.json({
        success: false,
        error: 'userId and email are required',
      }, { status: 400 });
    }

    if (payload.userId !== userId) {
      return NextResponse.json({
        success: false,
        error: 'Cannot provision another user',
      }, { status: 403 });
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    const role = sanitizeString(payload.role) ?? 'user';

    const now = new Date().toISOString();

    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: payload.userId,
        email: normalizedEmail,
        role,
        is_active: true,
        email_verified_at: sanitizeString(payload.emailVerifiedAt),
        updated_at: now,
      }, { onConflict: 'id' });

    if (userError) {
      return NextResponse.json({
        success: false,
        error: `Failed to provision user: ${userError.message}`,
      }, { status: 500 });
    }

    const rawFirstName = sanitizeString(payload.firstName);
    const rawLastName = sanitizeString(payload.lastName);

    const fullName = sanitizeString(payload.fullName) ?? ([rawFirstName, rawLastName].filter(Boolean).join(' ') || normalizedEmail.split('@')[0]);

    // FIX: Ensure last_name is never empty for NOT NULL constraint
    const safeFirstName = rawFirstName ?? fullName;
    const safeLastName = rawLastName ?? safeFirstName;

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: payload.userId,
        display_name: fullName,
        first_name: safeFirstName,
        last_name: safeLastName,
        institution: sanitizeString(payload.institution),
        predikat: sanitizeString(payload.predikat),
        updated_at: now,
      }, { onConflict: 'user_id' });

    if (profileError) {
      return NextResponse.json({
        success: false,
        error: `Failed to provision profile: ${profileError.message}`,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      userId: payload.userId,
      email: normalizedEmail,
      timestamp: now,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Provisioning failed',
    }, { status: 500 });
  }
}
