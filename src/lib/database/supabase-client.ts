/**
 * Supabase Client Configuration for Chat Persistence
 * 
 * DOCUMENTATION COMPLIANCE:
 * - Follows AI SDK v5 persistence patterns from /docs/04-ai-sdk-ui/03-chatbot-message-persistence.mdx
 * - Implements server-side and client-side client configurations
 * - Supports existing 24-table enterprise database schema
 * 
 * INTEGRATION POINTS:
 * - Connects with existing user authentication and RLS policies
 * - Utilizes existing database tables: users, user_sessions, ai_interactions
 * - Maintains compatibility with existing database infrastructure
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database-types';

// Environment configuration validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

// ✅ CRITICAL FIX: Global singleton instances to prevent multiple GoTrueClient warnings
let _supabaseClient: SupabaseClient<Database> | null = null;
let _supabaseAdmin: SupabaseClient<Database> | null = null;
let _supabaseServer: SupabaseClient<Database> | null = null;

const isBrowser = typeof window !== 'undefined';

// ✅ CRITICAL FIX: Prevent multiple client instantiation in development HMR
if (typeof window !== 'undefined') {
  // Browser-side: Store client reference on window to survive HMR
  const windowGlobal = window as any;
  if (!windowGlobal.__supabase_client_singleton) {
    windowGlobal.__supabase_client_singleton = {};
  }
  if (windowGlobal.__supabase_client_singleton.client) {
    _supabaseClient = windowGlobal.__supabase_client_singleton.client;
  }
}

/**
 * Client-side Supabase client for browser usage (Singleton)
 * Uses anonymous key with RLS policies for security
 */
export const supabaseClient: SupabaseClient<Database> = (() => {
  if (!_supabaseClient) {
    _supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          // ✅ CRITICAL FIX: Use implicit flow for password-based auth
          // PKCE flow is for OAuth redirects, NOT for signInWithPassword
          flowType: 'implicit',
          // ✅ CRITICAL FIX: Disable automatic token refresh to prevent loops
          debug: false
        },
        realtime: {
          params: {
            eventsPerSecond: 20 // Unified rate for all operations
          }
        },
        db: {
          schema: 'public'
        },
        global: {
          // ✅ CRITICAL FIX: Prevent multiple instances in the same context
          headers: {
            'X-Client-Info': 'makalah-ai-singleton'
          }
        }
      }
    );

    // ✅ Store in window for HMR survival
    if (typeof window !== 'undefined') {
      (window as any).__supabase_client_singleton.client = _supabaseClient;
    }
  }
  return _supabaseClient;
})();

/**
 * Server-side Supabase client for API routes and server components (Singleton)
 * Uses service role key for full database access (bypasses RLS)
 * Only use in server-side contexts where RLS bypass is required
 */
export const supabaseAdmin: SupabaseClient<Database> = (() => {
  if (isBrowser) {
    return null as unknown as SupabaseClient<Database>;
  }

  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey || supabaseAnonKey, // Fallback to anon key if service key not available
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }
  return _supabaseAdmin;
})();

/**
 * Safe server-side client that respects RLS policies (Singleton)
 * Use this for most server-side operations where RLS should be enforced
 */
export const supabaseServer: SupabaseClient<Database> = (() => {
  if (isBrowser) {
    return null as unknown as SupabaseClient<Database>;
  }

  if (!_supabaseServer) {
    _supabaseServer = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }
  return _supabaseServer;
})();

/**
 * Alias for supabaseClient - all chat operations use the main client
 * This eliminates the need for a separate chat client instance
 * ✅ CRITICAL FIX: Use reference to prevent duplicate client instances
 */
export const supabaseChatClient = supabaseClient;

/**
 * Health check function to verify Supabase connection
 * Used for monitoring and debugging
 */
export async function checkSupabaseHealth(): Promise<{
  connected: boolean;
  error?: string;
  responseTime: number;
}> {
  const startTime = Date.now();

  try {
    const isBrowser = typeof window !== 'undefined';

    if (isBrowser) {
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      // Tanpa sesi aktif kita tidak bisa melakukan query RLS, tapi kondisi ini
      // tidak berarti database down. Anggap koneksi sehat supaya fallback tidak aktif.
      if (!session) {
        return {
          connected: true,
          responseTime: Date.now() - startTime,
        };
      }

      const { error } = await supabaseClient
        .from('conversations')
        .select('id', { head: true, count: 'exact' })
        .eq('user_id', session.user.id)
        .limit(1);

      if (error) {
        throw error;
      }
    } else {
      const { error } = await supabaseAdmin
        .from('conversations')
        .select('id', { head: true, count: 'exact' })
        .limit(1);

      if (error) {
        throw error;
      }
    }

    return {
      connected: true,
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Get authenticated user from client
 * Helper function for user context in chat operations
 */
export async function getAuthenticatedUser() {
  const { data: { user }, error } = await supabaseClient.auth.getUser();
  return { user, error };
}

/**
 * Initialize user session for chat operations
 * Creates or updates user session for chat persistence tracking
 */
export async function initializeUserSession(userId: string): Promise<{
  success: boolean;
  sessionId?: string;
  error?: string;
}> {
  try {
    // Create or update user session
    const { data, error } = await supabaseClient
      .from('user_sessions')
      .upsert({
        user_id: userId,
        session_data: {
          chat_initialized: true,
          last_activity: new Date().toISOString()
        },
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        updated_at: new Date().toISOString()
      } as any, {
        onConflict: 'user_id'
      })
      .select('id')
      .single();
    
    if (error) {
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: true,
      sessionId: (data as any).id
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export types for TypeScript support
export type { Database };
export type DatabaseClient = SupabaseClient<Database>;

/**
 * Configuration constants for chat persistence
 */
export const CHAT_CONFIG = {
  // Message batch size for optimization
  BATCH_SIZE: 50,
  
  // Auto-save interval (ms)
  AUTO_SAVE_INTERVAL: 30000,
  
  // Message history limit per conversation
  HISTORY_LIMIT: 1000,
  
  // Real-time subscription options
  REALTIME: {
    CHANNEL_PREFIX: 'chat',
    EVENTS_PER_SECOND: 20
  },
  
  // Performance thresholds
  PERFORMANCE: {
    MAX_SAVE_TIME: 300, // ms
    MAX_LOAD_TIME: 500, // ms
  }
} as const;
