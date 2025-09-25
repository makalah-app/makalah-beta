/**
 * Supabase Server-Side Authentication Configuration
 * 
 * DOCUMENTATION COMPLIANCE:
 * - Follows @supabase/ssr patterns for Next.js server-side auth extraction
 * - Implements server-side session handling for API routes
 * - Supports Task 13-6: Chat History Persistence Fix
 * 
 * INTEGRATION POINTS:
 * - Replaces hardcoded userId in chat API persistence
 * - Maintains compatibility with existing RLS policies
 * - Supports both cookies and headers authentication context
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { Database } from '../types/database-types';

/**
 * Create server-side Supabase client with cookie handling
 * For use in API routes and server components that need user context
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Cookie setting might fail in certain server contexts
            console.warn('[Supabase Server Auth] Cookie set failed:', error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Cookie removal might fail in certain server contexts
            console.warn('[Supabase Server Auth] Cookie remove failed:', error);
          }
        },
      },
    }
  );
}

/**
 * Extract authenticated user ID from server-side session
 * Primary function for Task 13-6 chat persistence fix
 * 
 * @returns {Promise<{userId: string | null, error: string | null}>}
 */
export async function getServerSessionUserId(): Promise<{
  userId: string | null;
  error: string | null;
}> {
  try {
    const supabase = createSupabaseServerClient();
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.warn('[Supabase Server Auth] User extraction failed:', error.message);
      return {
        userId: null,
        error: error.message
      };
    }

    if (!user) {
      // Not authenticated - return null without error (valid state)
      return {
        userId: null,
        error: null
      };
    }

    console.log(`[Supabase Server Auth] ✅ User extracted successfully: ${user.id}`);
    return {
      userId: user.id,
      error: null
    };
    
  } catch (error) {
    console.error('[Supabase Server Auth] Fatal user extraction error:', error);
    return {
      userId: null,
      error: error instanceof Error ? error.message : 'Unknown authentication error'
    };
  }
}

/**
 * Get full authenticated user object from server-side session
 * Enhanced version for cases requiring complete user data
 */
export async function getServerSessionUser() {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.warn('[Supabase Server Auth] Full user extraction failed:', error.message);
      return { user: null, error };
    }

    return { user, error: null };
    
  } catch (error) {
    console.error('[Supabase Server Auth] Fatal user extraction error:', error);
    return { 
      user: null, 
      error: { 
        message: error instanceof Error ? error.message : 'Unknown authentication error' 
      } as any 
    };
  }
}

/**
 * Validate server-side authentication context
 * Utility function for debugging authentication issues
 */
export async function validateServerAuth(): Promise<{
  isAuthenticated: boolean;
  userId: string | null;
  authMethod: 'cookies' | 'none';
  debugInfo?: any;
}> {
  try {
    const { userId, error } = await getServerSessionUserId();
    
    const cookieStore = cookies();
    const authCookies = [
      'sb-access-token',
      'sb-refresh-token', 
      'supabase-auth-token'
    ].map(name => ({ name, exists: !!cookieStore.get(name) }));

    return {
      isAuthenticated: !!userId,
      userId,
      authMethod: authCookies.some(c => c.exists) ? 'cookies' : 'none',
      debugInfo: {
        error: error,
        cookiesFound: authCookies.filter(c => c.exists),
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      isAuthenticated: false,
      userId: null,
      authMethod: 'none',
      debugInfo: {
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

/**
 * Extract user ID with strict authentication requirement
 * NO FALLBACK - returns null if authentication fails
 * Forces proper authentication handling in calling code
 */
export async function getUserIdWithSystemFallback(): Promise<string | null> {
  const { userId } = await getServerSessionUserId();
  return userId; // Return null if no authenticated user - no 'system' fallback
}

/**
 * Advanced session validation with strict authentication requirement
 * NO FALLBACK - returns null userId if authentication fails
 */
export async function getValidatedServerSession(): Promise<{
  userId: string | null;
  isSystem: boolean;
  sessionValid: boolean;
  failureReason?: string;
}> {
  try {
    const { userId, error } = await getServerSessionUserId();
    
    if (userId && !error) {
      return {
        userId,
        isSystem: false,
        sessionValid: true
      };
    }
    
    // No fallback - return null userId with failure reason
    const failureReason = error ? `Auth error: ${error}` : 'No authenticated user';
    console.log(`[Supabase Server Auth] Authentication failed: ${failureReason}`);
    
    return {
      userId: null,
      isSystem: false,
      sessionValid: false,
      failureReason
    };
    
  } catch (error) {
    console.error('[Supabase Server Auth] Session validation failed:', error);
    return {
      userId: null,
      isSystem: false,
      sessionValid: false,
      failureReason: `Fatal error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}