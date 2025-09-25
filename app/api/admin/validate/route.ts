/**
 * Admin Access Validation API Endpoint
 * 
 * Validates that only makalah.app@gmail.com has admin access.
 * Provides secure admin authentication for dashboard components.
 * 
 * Features:
 * - Hardcoded admin email validation
 * - JWT token verification using existing auth infrastructure
 * - Session validation with Supabase
 * - Comprehensive error handling
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { supabaseClient } from '@/lib/database/supabase-client';

// Admin email hardcoded for security
const ADMIN_EMAIL = 'makalah.app@gmail.com';

// Request validation schema
const ValidateRequestSchema = z.object({
  email: z.string().email().optional(),
  checkSession: z.boolean().default(true)
});

type ValidateRequest = z.infer<typeof ValidateRequestSchema>;

/**
 * GET /api/admin/validate - Validate admin access
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const parsedParams = {
      ...queryParams,
      checkSession: queryParams.checkSession !== 'false'
    };

    const validatedRequest: ValidateRequest = ValidateRequestSchema.parse(parsedParams);
    const { email, checkSession } = validatedRequest;

    console.log('🔐 Admin validation request:', { email, checkSession });

    // Get current session from Supabase if checkSession is enabled
    if (checkSession) {
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

      if (sessionError) {
        console.error('❌ Session validation error:', sessionError);
        return Response.json({
          success: false,
          isAdmin: false,
          error: {
            message: 'Session validation failed',
            type: 'session_error',
            code: 'INVALID_SESSION'
          }
        }, { status: 401 });
      }

      if (!session?.user) {
        console.log('❌ No active session found');
        return Response.json({
          success: false,
          isAdmin: false,
          error: {
            message: 'No active session',
            type: 'auth_error',
            code: 'NO_SESSION'
          }
        }, { status: 401 });
      }

      // Check if session user is admin
      const sessionEmail = session.user.email;
      const isAdmin = sessionEmail === ADMIN_EMAIL;

      console.log('✅ Session validation:', { 
        sessionEmail, 
        isAdmin,
        userId: session.user.id 
      });

      return Response.json({
        success: true,
        isAdmin,
        data: {
          userId: session.user.id,
          email: sessionEmail,
          adminEmail: ADMIN_EMAIL,
          sessionValid: true,
          validatedAt: new Date().toISOString()
        }
      });
    }

    // Email-only validation if provided
    if (email) {
      const isAdmin = email === ADMIN_EMAIL;
      
      console.log('✅ Email validation:', { email, isAdmin });

      return Response.json({
        success: true,
        isAdmin,
        data: {
          email,
          adminEmail: ADMIN_EMAIL,
          emailValid: true,
          validatedAt: new Date().toISOString()
        }
      });
    }

    // No validation criteria provided
    return Response.json({
      success: false,
      isAdmin: false,
      error: {
        message: 'No validation criteria provided',
        type: 'validation_error',
        code: 'MISSING_CRITERIA'
      }
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Admin validation error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Admin validation failed';
    const statusCode = error instanceof z.ZodError ? 400 : 500;

    return Response.json({
      success: false,
      isAdmin: false,
      error: {
        message: errorMessage,
        type: error instanceof z.ZodError ? 'validation_error' : 'internal_error',
        details: error instanceof z.ZodError ? error.errors : undefined,
        code: error instanceof z.ZodError ? 'INVALID_REQUEST' : 'INTERNAL_ERROR'
      }
    }, { status: statusCode });
  }
}

/**
 * POST /api/admin/validate - Validate admin with credentials
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, accessToken } = body;

    console.log('🔐 Admin POST validation:', { email, hasToken: !!accessToken });

    // Validate input
    if (!email || !accessToken) {
      return Response.json({
        success: false,
        isAdmin: false,
        error: {
          message: 'Email and access token required',
          type: 'validation_error',
          code: 'MISSING_CREDENTIALS'
        }
      }, { status: 400 });
    }

    // Check admin email
    const isAdminEmail = email === ADMIN_EMAIL;
    if (!isAdminEmail) {
      console.log('❌ Non-admin email attempted access:', email);
      return Response.json({
        success: true,
        isAdmin: false,
        data: {
          email,
          adminEmail: ADMIN_EMAIL,
          reason: 'Not admin email'
        }
      });
    }

    // Validate token with Supabase
    try {
      const { data, error } = await supabaseClient.auth.getUser(accessToken);
      
      if (error || !data.user) {
        console.error('❌ Token validation failed:', error);
        return Response.json({
          success: false,
          isAdmin: false,
          error: {
            message: 'Invalid access token',
            type: 'auth_error',
            code: 'INVALID_TOKEN'
          }
        }, { status: 401 });
      }

      // Verify token user matches email
      const tokenEmail = data.user.email;
      if (tokenEmail !== email) {
        console.log('❌ Token email mismatch:', { tokenEmail, requestEmail: email });
        return Response.json({
          success: false,
          isAdmin: false,
          error: {
            message: 'Token email mismatch',
            type: 'auth_error',
            code: 'EMAIL_MISMATCH'
          }
        }, { status: 401 });
      }

      // All validations passed for admin
      console.log('✅ Admin validation successful:', {
        email: tokenEmail,
        userId: data.user.id
      });

      return Response.json({
        success: true,
        isAdmin: true,
        data: {
          userId: data.user.id,
          email: tokenEmail,
          adminEmail: ADMIN_EMAIL,
          tokenValid: true,
          validatedAt: new Date().toISOString()
        }
      });

    } catch (tokenError) {
      console.error('❌ Token validation exception:', tokenError);
      return Response.json({
        success: false,
        isAdmin: false,
        error: {
          message: 'Token validation failed',
          type: 'auth_error',
          code: 'TOKEN_VALIDATION_ERROR'
        }
      }, { status: 401 });
    }

  } catch (error) {
    console.error('❌ Admin POST validation error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Admin validation failed';
    
    return Response.json({
      success: false,
      isAdmin: false,
      error: {
        message: errorMessage,
        type: 'internal_error',
        code: 'INTERNAL_ERROR'
      }
    }, { status: 500 });
  }
}