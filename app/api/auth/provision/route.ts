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
    // Normalize role to match Database enum (fallback to 'guest')
    const rawRole = (sanitizeString(payload.role) || 'guest').toLowerCase();
    const role = (['admin', 'researcher', 'student', 'guest'].includes(rawRole)
      ? rawRole
      : 'guest') as 'admin' | 'researcher' | 'student' | 'guest';

    const now = new Date().toISOString();

    // Prepare name fields early for both users and user_profiles
    const rawFirstName = sanitizeString(payload.firstName);
    const rawLastName = sanitizeString(payload.lastName);
    const fullName =
      sanitizeString(payload.fullName) ??
      ([rawFirstName, rawLastName].filter(Boolean).join(' ') || normalizedEmail.split('@')[0]);

    // Our generated Database types require certain fields (full_name, email_verified, role)
    // and don't include "id" in Insert. Use a narrow, typed-friendly payload and cast
    // to any to allow specifying id and server-managed timestamps when upserting by PK.
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          id: payload.userId,
          email: normalizedEmail,
          full_name: fullName,
          role,
          email_verified: Boolean(sanitizeString(payload.emailVerifiedAt)),
          institution: sanitizeString(payload.institution) ?? undefined,
          // updated_at is managed by DB trigger; safe to omit or include depending on schema
        } as any,
        { onConflict: 'id' }
      );

    if (userError) {
      return NextResponse.json({
        success: false,
        error: `Failed to provision user: ${userError.message}`,
      }, { status: 500 });
    }

    // Ensure last_name is never empty for NOT NULL constraint (based on our local types)
    const safeFirstName = rawFirstName ?? fullName;
    const safeLastName = rawLastName ?? safeFirstName;

    // Conform to our Database types (user_profiles requires preferences and research_interests)
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert(
        {
          user_id: payload.userId,
          first_name: safeFirstName ?? undefined,
          last_name: safeLastName ?? undefined,
          research_interests: [],
          preferences: {
            institution: sanitizeString(payload.institution),
            predikat: sanitizeString(payload.predikat),
            display_name: fullName,
            updated_at: now,
          },
        } as any,
        { onConflict: 'user_id' }
      );

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
