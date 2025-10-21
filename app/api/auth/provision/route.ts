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
    // ✅ CRITICAL SECURITY PATCH: Disable automatic user provisioning
    // This endpoint was allowing any authenticated user to create database records
    // This feature has been disabled to prevent security breach

    return NextResponse.json({
      success: false,
      error: 'Automatic user provisioning has been disabled for security reasons.',
    }, { status: 403 });
}
