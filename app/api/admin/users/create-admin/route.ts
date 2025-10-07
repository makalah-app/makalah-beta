/**
 * Admin Create Admin User API Endpoint
 *
 * Allows superadmin to create new admin users.
 * Restricted to superadmin access only.
 *
 * Features:
 * - POST: Create new admin user with email verification
 * - Superadmin-only access with token validation
 * - Password validation following app standards
 * - Auto-send email verification from Supabase
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/database/supabase-client';
import { validateSuperAdminAccess } from '@/lib/admin/admin-auth';
import { validatePassword, validatePasswordConfirmation } from '@/lib/auth/form-validation';

// Request validation schema
const CreateAdminSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  fullName: z.string().optional(),
  institution: z.string().optional()
});

type CreateAdminRequest = z.infer<typeof CreateAdminSchema>;

/**
 * POST /api/admin/users/create-admin - Create new admin user
 */
export async function POST(request: NextRequest) {
  try {
    // Validate superadmin access
    const adminCheck = await validateSuperAdminAccess(request);
    if (!adminCheck.valid) {
      return Response.json({
        success: false,
        error: {
          message: adminCheck.error || 'Superadmin access required',
          type: 'auth_error',
          code: 'SUPERADMIN_ONLY'
        }
      }, { status: 403 });
    }

    const body = await request.json();
    const validated: CreateAdminRequest = CreateAdminSchema.parse(body);

    // Validate password strength
    const passwordValidation = validatePassword(validated.password);
    if (!passwordValidation.isValid) {
      return Response.json({
        success: false,
        error: {
          message: passwordValidation.error || 'Password tidak memenuhi kriteria',
          type: 'validation_error',
          code: 'INVALID_PASSWORD'
        }
      }, { status: 400 });
    }

    // Check if user already exists
    const { data: existingAuthUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingAuthUser.users.some(u => u.email === validated.email);

    if (userExists) {
      return Response.json({
        success: false,
        error: {
          message: 'Email sudah terdaftar',
          type: 'validation_error',
          code: 'EMAIL_EXISTS'
        }
      }, { status: 400 });
    }

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: validated.email,
      password: validated.password,
      email_confirm: false, // This triggers email verification
      user_metadata: {
        role: 'admin',
        full_name: validated.fullName || ''
      }
    });

    if (authError || !authUser.user) {
      throw new Error(authError?.message || 'Gagal membuat user di Supabase Auth');
    }

    // Insert into public.users
    const { error: userInsertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.user.id,
        email: validated.email,
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any);

    if (userInsertError) {
      // Rollback: delete from auth if public.users insert fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw new Error('Gagal menyimpan user ke database');
    }

    // Insert into user_profiles if fullName or institution provided
    if (validated.fullName || validated.institution) {
      const nameParts = validated.fullName?.trim().split(' ') || [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const { error: profileInsertError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          user_id: authUser.user.id,
          first_name: firstName,
          last_name: lastName,
          display_name: validated.fullName,
          institution: validated.institution,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any);

      // Don't rollback if profile insert fails - user can update profile later
      if (profileInsertError) {
        // Silent fail - profile is optional, auth user already created
      }
    }

    return Response.json({
      success: true,
      data: {
        user: {
          id: authUser.user.id,
          email: authUser.user.email,
          role: 'admin'
        }
      },
      message: 'Admin berhasil dibuat. Email verifikasi telah dikirim.',
      metadata: {
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({
        success: false,
        error: {
          message: 'Data tidak valid',
          type: 'validation_error',
          details: error.errors,
          code: 'VALIDATION_ERROR'
        }
      }, { status: 400 });
    }

    return Response.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Gagal membuat admin',
        type: 'internal_error',
        code: 'CREATE_ERROR'
      }
    }, { status: 500 });
  }
}
