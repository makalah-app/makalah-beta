/**
 * Authentication State Management Hook
 *
 * Provides centralized authentication state management with JWT handling,
 * role-based access control, and integration with Supabase backend.
 *
 * Features:
 * - JWT token management with automatic refresh
 * - Role-based state handling (admin/researcher/student)
 * - Session persistence with localStorage
 * - Login/logout functionality with API integration
 * - Permission checking integration
 * - Authentication context for React components
 *
 * DEBUG FEATURES:
 * - Unique instance tracking with stack traces
 * - Comprehensive lifecycle logging
 * - Multiple instance detection and reporting
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';

// ========================================================================================
// DEBUG INFRASTRUCTURE - INSTANCE TRACKING SYSTEM
// ========================================================================================

interface AuthInstanceDebugInfo {
  id: string;
  createdAt: number;
  componentStack: string;
  source: string;
  isActive: boolean;
  initializationCount: number;
  lastActivity: number;
}

// Global instance registry for debug tracking
const GLOBAL_AUTH_INSTANCES = new Map<string, AuthInstanceDebugInfo>();

// Generate unique instance ID with timestamp and random component
function generateInstanceId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `auth-${timestamp}-${random}`;
}

// Capture stack trace to identify component source
function captureComponentStack(): { stack: string; source: string } {
  const error = new Error();
  const stack = error.stack || '';

  // Extract the most relevant line from stack trace (skip useAuth internals)
  const stackLines = stack.split('\n');
  let source = 'unknown';

  for (let i = 0; i < stackLines.length; i++) {
    const line = stackLines[i];
    if (line.includes('.tsx') || line.includes('.jsx')) {
      // Skip internal useAuth calls
      if (!line.includes('useAuth.tsx') && !line.includes('AuthProvider')) {
        const match = line.match(/\/([^/]+\.(tsx|jsx)):/);
        if (match) {
          source = match[1];
          break;
        }
      }
    }
  }

  return { stack, source };
}

// Register new auth instance
function registerAuthInstance(id: string): AuthInstanceDebugInfo {
  const { stack, source } = captureComponentStack();

  const debugInfo: AuthInstanceDebugInfo = {
    id,
    createdAt: Date.now(),
    componentStack: stack,
    source,
    isActive: true,
    initializationCount: 0,
    lastActivity: Date.now()
  };

  GLOBAL_AUTH_INSTANCES.set(id, debugInfo);

  console.group(`🔍 [AUTH-DEBUG] NEW INSTANCE REGISTERED`);
  console.log(`Instance ID: ${id}`);
  console.log(`Source Component: ${source}`);
  console.log(`Created At: ${new Date(debugInfo.createdAt).toISOString()}`);
  console.log(`Total Active Instances: ${Array.from(GLOBAL_AUTH_INSTANCES.values()).filter(i => i.isActive).length}`);
  console.groupCollapsed('📍 Component Stack Trace');
  console.log(stack);
  console.groupEnd();

  // Report if multiple instances detected
  const activeInstances = Array.from(GLOBAL_AUTH_INSTANCES.values()).filter(i => i.isActive);
  if (activeInstances.length > 1) {
    console.warn(`⚠️ [AUTH-DEBUG] MULTIPLE INSTANCES DETECTED! Count: ${activeInstances.length}`);
    console.table(activeInstances.map(i => ({
      id: i.id,
      source: i.source,
      createdAt: new Date(i.createdAt).toLocaleTimeString(),
      initCount: i.initializationCount
    })));
  }

  console.groupEnd();

  return debugInfo;
}

// Update instance activity
function updateInstanceActivity(id: string, activity: string) {
  const instance = GLOBAL_AUTH_INSTANCES.get(id);
  if (instance) {
    instance.lastActivity = Date.now();
    if (activity === 'initialization') {
      instance.initializationCount++;
    }
    console.log(`📝 [AUTH-DEBUG-${id.substring(5, 11)}] ${activity} | Init Count: ${instance.initializationCount}`);
  }
}

// Unregister auth instance
function unregisterAuthInstance(id: string) {
  const instance = GLOBAL_AUTH_INSTANCES.get(id);
  if (instance) {
    instance.isActive = false;
    console.log(`🗑️ [AUTH-DEBUG-${id.substring(5, 11)}] INSTANCE CLEANUP | Source: ${instance.source}`);

    // Clean up old inactive instances
    setTimeout(() => {
      GLOBAL_AUTH_INSTANCES.delete(id);
    }, 5000);
  }
}

// Debug logger with instance context
function debugLog(instanceId: string, level: 'log' | 'warn' | 'error', message: string, ...args: any[]) {
  const shortId = instanceId.substring(5, 11);
  const instance = GLOBAL_AUTH_INSTANCES.get(instanceId);
  const source = instance?.source || 'unknown';

  const prefix = `[AUTH-${shortId}:${source}]`;

  switch (level) {
    case 'warn':
      console.warn(`⚠️ ${prefix} ${message}`, ...args);
      break;
    case 'error':
      console.error(`❌ ${prefix} ${message}`, ...args);
      break;
    default:
      console.log(`🔄 ${prefix} ${message}`, ...args);
      break;
  }
}

// Debug utility to get comprehensive instance report
function getAuthInstancesReport() {
  const instances = Array.from(GLOBAL_AUTH_INSTANCES.values());
  const activeInstances = instances.filter(i => i.isActive);

  const report = {
    totalInstances: instances.length,
    activeInstances: activeInstances.length,
    inactiveInstances: instances.length - activeInstances.length,
    sources: [...new Set(instances.map(i => i.source))],
    instances: instances.map(i => ({
      id: i.id.substring(5, 11),
      source: i.source,
      active: i.isActive,
      createdAt: new Date(i.createdAt).toLocaleTimeString(),
      initCount: i.initializationCount,
      lastActivity: new Date(i.lastActivity).toLocaleTimeString()
    }))
  };

  console.group('📊 AUTH INSTANCES REPORT');
  console.log(`Total Instances: ${report.totalInstances}`);
  console.log(`Active Instances: ${report.activeInstances}`);
  console.log(`Inactive Instances: ${report.inactiveInstances}`);
  console.log(`Sources: ${report.sources.join(', ')}`);
  console.table(report.instances);
  console.groupEnd();

  return report;
}

// Make debug report available globally for dev tools
if (typeof window !== 'undefined') {
  (window as any).getAuthInstancesReport = getAuthInstancesReport;
  (window as any).GLOBAL_AUTH_INSTANCES = GLOBAL_AUTH_INSTANCES;
}
import { Session } from '@supabase/supabase-js';
import { UserRole, PermissionManager, UserPermissionContext, createPermissionHook } from '../lib/auth/role-permissions';
import { supabaseClient } from '../lib/database/supabase-client';

// Small helper to avoid indefinite waits on 3rd-party SDK calls
async function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => T | Promise<T>): Promise<T> {
  return await new Promise<T>((resolve) => {
    let settled = false;
    const id = setTimeout(async () => {
      if (settled) return;
      settled = true;
      resolve(await onTimeout());
    }, ms);
    promise.then((res) => {
      if (settled) return;
      settled = true;
      clearTimeout(id);
      resolve(res);
    }).catch(async () => {
      if (settled) return;
      settled = true;
      clearTimeout(id);
      resolve(await onTimeout());
    });
  });
}

// Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  fullName?: string;
  role: UserRole;
  institution?: string;
  isVerified: boolean;
  createdAt: string;
  lastLogin?: string;
  avatarUrl?: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: User;
  sessionId: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegistrationData {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  institution?: string;
}

export interface AuthState {
  user: User | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  // Authentication Methods
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (data: RegistrationData) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  isTokenExpired: (bufferMinutes?: number) => boolean;

  // Password Reset Methods
  requestPasswordReset: (email: string) => Promise<boolean>;
  resetPassword: (newPassword: string) => Promise<boolean>;

  // Email Verification
  resendVerificationEmail: (email: string) => Promise<boolean>;

  // Permission Methods
  hasPermission: (permission: string, resourceId?: string) => boolean;
  isAdmin: () => boolean;
  canPerformAcademicOperations: () => boolean;

  // Utility Methods
  clearError: () => void;
  updateProfile: (updates: Partial<User>) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
}

// Storage Keys
const STORAGE_KEYS = {
  SESSION: 'makalah_auth_session',
  REMEMBER_ME: 'makalah_remember_me',
  USER_PREFERENCES: 'makalah_user_preferences'
} as const;

// Context Creation
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication Provider Component
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // ========================================================================================
  // DEBUG: INSTANCE REGISTRATION & TRACKING
  // ========================================================================================
  const instanceIdRef = useRef<string>(generateInstanceId());
  const instanceId = instanceIdRef.current;

  // Register this AuthProvider instance on first render
  useEffect(() => {
    const debugInfo = registerAuthInstance(instanceId);
    debugLog(instanceId, 'log', '🚀 PROVIDER MOUNTED');

    return () => {
      debugLog(instanceId, 'log', '🛑 PROVIDER UNMOUNTING');
      unregisterAuthInstance(instanceId);
    };
  }, []); // Only run once on mount

  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  const permissionManager = PermissionManager.getInstance();

  // Prevent multiple initialization attempts
  const initializingRef = React.useRef(false);
  const lastAccessTokenRef = useRef<string | null>(null);
  const lastSessionUserIdRef = useRef<string | null>(null);
  // Track failed profile fetch attempts per session
  const profileFetchAttemptsRef = useRef<Map<string, number>>(new Map());
  // Track if main initialization has been triggered
  const hasInitializedRef = useRef(false);

  // Helper function to create fallback user from session
  const createFallbackUserFromSession = (session: any): User | null => {
    if (!session?.user) return null;

    const emailName = session.user.email?.split('@')[0] || 'User';

    return {
      id: session.user.id,
      email: session.user.email || '',
      name: emailName,
      fullName: emailName,
      role: 'user' as UserRole,
      institution: undefined,
      isVerified: !!session.user.email_confirmed,
      createdAt: session.user.created_at || new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      avatarUrl: session.user.user_metadata?.avatar_url || undefined
    };
  };

  /**
   * Initialize authentication from stored session
   */
  const initializeAuth = useCallback(async (providedSession?: Session | null) => {
    if (initializingRef.current) {
      debugLog(instanceId, 'warn', 'Already initializing, skipping...');
      return;
    }

    updateInstanceActivity(instanceId, 'initialization');

    try {
      initializingRef.current = true;
      debugLog(instanceId, 'log', '🔄 STARTING AUTHENTICATION INITIALIZATION...');
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // Check if we've tried too many times for this session
      if (providedSession?.user?.id) {
        const attempts = profileFetchAttemptsRef.current.get(providedSession.user.id) || 0;
        if (attempts >= 3) {
          debugLog(instanceId, 'warn', 'Too many profile fetch attempts, using cached state');
          initializingRef.current = false;
          return;
        }
      }

      // First, try to get current session from Supabase
      let session = providedSession ?? null;

      if (!session) {
        debugLog(instanceId, 'log', '📡 Getting session from Supabase...');
        const sessionResult = await withTimeout(
          supabaseClient.auth.getSession(),
          2500,
          async () => ({ data: { session: null }, error: null } as any)
        );
        const { data: { session: fetchedSession }, error } = sessionResult as any;

        if (error) {
          debugLog(instanceId, 'error', 'Error getting Supabase session:', error);
          setAuthState({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
          initializingRef.current = false;
          return;
        }

        session = fetchedSession;
      }

      if (!session) {
        debugLog(instanceId, 'log', '❌ No active session found, setting isLoading: false');
        setAuthState(prev => ({ ...prev, isLoading: false }));
        initializingRef.current = false;
        return;
      }

      if (
        lastAccessTokenRef.current &&
        lastAccessTokenRef.current === session.access_token &&
        lastSessionUserIdRef.current === session.user?.id
      ) {
        debugLog(instanceId, 'log', '✅ Session already synchronized, skipping state update');
        setAuthState(prev => ({ ...prev, isLoading: false }));
        initializingRef.current = false;
        return;
      }

      debugLog(instanceId, 'log', '👤 Session found, fetching user profile...');

      // Get user profile from database (join users with user_profiles)
      const profileResult = await withTimeout(
        (supabaseClient as any)
          .from('users')
          .select(`
            id, email, role, email_verified_at, created_at, last_login_at,
            user_profiles!inner(
              display_name, first_name, last_name, institution, avatar_url
            )
          `)
          .eq('id', session.user.id)
          .maybeSingle(),
        3000,
        async () => ({ data: null, error: { message: 'profile timeout' } } as any)
      );
      const { data: userProfile, error: profileError } = profileResult as any;

      if (profileError && profileError.code !== 'PGRST116') {
        console.warn('[initializeAuth] Profile fetch failed, using fallback:', profileError);

        // Check retry attempts
        const sessionId = session.user?.id;
        const attempts = profileFetchAttemptsRef.current.get(sessionId) || 0;
        profileFetchAttemptsRef.current.set(sessionId, attempts + 1);

        // Create fallback user from session instead of nullifying
        const fallbackUser = createFallbackUserFromSession(session);

        if (fallbackUser) {
          // Create auth session with fallback data
          const authSession: AuthSession = {
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            expiresAt: session.expires_at ? session.expires_at * 1000 : Date.now(),
            user: fallbackUser,
            sessionId: session.user?.id || 'session-' + Date.now()
          };

          setAuthState({
            user: fallbackUser,
            session: authSession,      // ← PRESERVE session!
            isAuthenticated: true,      // ← KEEP authenticated!
            isLoading: false,
            error: null                // ← No error state
          });

          // Update tracking refs
          lastAccessTokenRef.current = session.access_token;
          lastSessionUserIdRef.current = session.user?.id;

          console.log('[initializeAuth] Using fallback user profile');
        } else {
          setAuthState({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Failed to create user profile'
          });
        }

        initializingRef.current = false;
        return;
      }

      const profileData = userProfile?.user_profiles?.[0];
      const profile = profileData || undefined;
      const emailName = userProfile.email?.split('@')[0] || 'User';
      const displayName = profile?.display_name ||
                         (profile?.first_name && profile?.last_name ?
                          `${profile.first_name} ${profile.last_name}` : emailName);

      // Create user object with correct data mapping
      const user: User = {
        id: userProfile.id,
        email: userProfile.email,
        name: displayName,
        fullName: displayName,
        role: userProfile.role as UserRole,
        institution: profile?.institution || undefined,
        isVerified: !!userProfile.email_verified_at,
        createdAt: userProfile.created_at,
        lastLogin: userProfile.last_login_at || new Date().toISOString(),
        avatarUrl: profile?.avatar_url || userProfile.avatar_url || undefined
      };

      // Create our auth session
      const authSession: AuthSession = {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at ? session.expires_at * 1000 : Date.now(),
        user: user,
        sessionId: session.user?.id || 'session-' + Date.now()
      };

      // Store session
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(authSession));
      // Store userId separately for easy access
      localStorage.setItem('userId', authSession.user.id);

      setAuthState({
        user: authSession.user,
        session: authSession,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });

      lastAccessTokenRef.current = session.access_token;
      lastSessionUserIdRef.current = session.user?.id ?? null;

      // Clear retry attempts on success
      if (session?.user?.id) {
        profileFetchAttemptsRef.current.delete(session.user.id);
      }

    } catch (error) {
      console.error('Auth initialization error:', error);
      setAuthState({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    } finally {
      initializingRef.current = false;
    }
  }, []);

  // Initialize authentication and set up auth state change listener
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      if (!mounted) {
        debugLog(instanceId, 'warn', 'Component unmounted before initialization');
        return;
      }

      // Use ref for atomic check-and-set to prevent race conditions
      if (hasInitializedRef.current) {
        debugLog(instanceId, 'warn', '🔒 INITIALIZATION ALREADY TRIGGERED, SKIPPING DUPLICATE');
        return;
      }
      hasInitializedRef.current = true;

      debugLog(instanceId, 'log', '🔄 INITIALIZING AUTHENTICATION...');
      updateInstanceActivity(instanceId, 'main-initialization');

      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        await initializeAuth(session);
        debugLog(instanceId, 'log', '✅ AUTHENTICATION INITIALIZATION COMPLETE');
      } catch (error) {
        debugLog(instanceId, 'error', '❌ AUTHENTICATION INITIALIZATION FAILED:', error);
        if (mounted) {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      }
    }

    // Listen for auth state changes from Supabase
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) {
        debugLog(instanceId, 'warn', 'Auth state change after unmount, ignoring');
        return;
      }

      debugLog(instanceId, 'log', `🔔 AUTH STATE CHANGE: ${event} | User ID: ${session?.user?.id || 'none'}`);
      updateInstanceActivity(instanceId, `auth-event-${event.toLowerCase()}`);

      if (event === 'SIGNED_OUT' || !session) {
        debugLog(instanceId, 'log', '🚪 SIGNED OUT - Resetting state');
        initializingRef.current = false; // Reset flag
        setAuthState({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      } else if (event === 'SIGNED_IN') {
        // ✅ CRITICAL FIX: Only handle first sign-in if not initializing
        if (!initializingRef.current) {
          debugLog(instanceId, 'log', '🔑 NEW SIGN IN DETECTED - Initializing...');
          await initializeAuth(session);
        } else {
          debugLog(instanceId, 'warn', '🔑 SIGN IN EVENT IGNORED - Already initializing');
        }
      }
      // ✅ CRITICAL FIX: Ignore ALL refresh events to prevent infinite loops
      else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        debugLog(instanceId, 'log', `🔄 ${event} EVENT IGNORED - Preventing infinite loops`);
      }
    });

    // Initialize once
    initialize();

    return () => {
      mounted = false;
      debugLog(instanceId, 'log', '🧹 CLEANUP - Unsubscribing and resetting flags');
      subscription.unsubscribe();
      profileFetchAttemptsRef.current.clear(); // Clear attempts map
      hasInitializedRef.current = false; // Reset initialization flag
      updateInstanceActivity(instanceId, 'cleanup');
    };
  }, []); // NO DEPENDENCIES - run only once on mount

  // ✅ CRITICAL FIX: Completely disable auto token refresh to prevent infinite loops
  // Token refresh will be handled manually on API calls instead of timer-based
  const tokenRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timeout to prevent multiple timers
    if (tokenRefreshTimeoutRef.current) {
      clearTimeout(tokenRefreshTimeoutRef.current);
      tokenRefreshTimeoutRef.current = null;
    }

    // ✅ DISABLE: Auto token refresh timer - causes infinite loop
    // Token refresh will be handled on-demand when API calls fail with 401
    console.log('[useAuth] Auto token refresh disabled to prevent infinite loops');

    return () => {
      if (tokenRefreshTimeoutRef.current) {
        clearTimeout(tokenRefreshTimeoutRef.current);
        tokenRefreshTimeoutRef.current = null;
      }
    };
  }, []); // ✅ CRITICAL FIX: No dependencies - run only once


  /**
   * Login user with credentials
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      // Use Supabase auth for real authentication
      const signInResult = await withTimeout(
        supabaseClient.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password
        }),
        3000,
        async () => ({ data: { user: null, session: null }, error: { message: 'Login timeout' } } as any)
      );
      const { data, error } = signInResult as any;

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user || !data.session) {
        throw new Error('Login failed - no user or session returned');
      }

      // Try to get user profile - but if users table doesn't exist, use auth.users data
      let userProfile = null;
      let profileError = null;

      try {
        // First try user_profiles directly (skip users table yang mungkin belum sinkron)
        const profileResult = await withTimeout(
          (supabaseClient as any)
            .from('user_profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .maybeSingle(),
          3000,
          async () => ({ data: null, error: { message: 'Profile fetch timeout' } } as any)
        );

        if (profileResult.data) {
          // Construct userProfile object dari user_profiles data
          userProfile = {
            id: data.user.id,
            email: data.user.email,
            role: data.user.user_metadata?.role || 'student',
            email_verified_at: data.user.email_confirmed_at,
            created_at: data.user.created_at,
            last_login_at: new Date().toISOString(),
            user_profiles: [profileResult.data]
          };
        }
        // 406 (PGRST116) berarti belum ada baris -> aman buat fallback
        if (profileResult.error && profileResult.error.code !== 'PGRST116') {
          profileError = profileResult.error;
        }
      } catch (err: any) {
        if (err?.code !== 'PGRST116') {
          profileError = err;
        }
      }


      // Map Supabase user to our User interface (fallback to auth metadata if profile missing)
      const emailName = userProfile?.email?.split('@')[0] || data.user.email?.split('@')[0] || 'User';
      const fallbackName = data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User';

      const profileData = userProfile?.user_profiles?.[0];

      const user: User = userProfile ? {
        // Extract profile data from joined result
        id: userProfile.id,
        email: userProfile.email,
        name: (() => {
          const profile = profileData;
          return profile?.display_name ||
                 (profile?.first_name && profile?.last_name ?
                  `${profile.first_name} ${profile.last_name}` : emailName);
        })(),
        fullName: (() => {
          const profile = profileData;
          return profile?.display_name ||
                 (profile?.first_name && profile?.last_name ?
                  `${profile.first_name} ${profile.last_name}` : undefined);
        })(),
        role: userProfile.role as UserRole,
        institution: profileData?.institution || undefined,
        isVerified: !!userProfile.email_verified_at,
        createdAt: userProfile.created_at,
        lastLogin: new Date().toISOString(),
        avatarUrl: profileData?.avatar_url || undefined
      } : {
        // Fallback to auth user_metadata if profile doesn't exist
        id: data.user.id,
        email: data.user.email!,
        name: fallbackName,
        fullName: data.user.user_metadata?.full_name || undefined,
        role: (data.user.user_metadata?.role || 'student') as UserRole,
        institution: data.user.user_metadata?.institution || undefined,
        isVerified: data.user.email_confirmed_at != null,
        createdAt: data.user.created_at!,
        lastLogin: new Date().toISOString(),
        avatarUrl: data.user.user_metadata?.avatar_url || undefined
      };

      // Create our auth session
      const session: AuthSession = {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at ? data.session.expires_at * 1000 : Date.now(),
        user: user,
        sessionId: data.session.user?.id || 'session-' + Date.now()
      };

      // Store session
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
      // Store userId separately for easy access
      localStorage.setItem('userId', session.user.id);
      if (credentials.rememberMe) {
        localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
      }

      setAuthState({
        user: session.user,
        session: session,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });

      lastAccessTokenRef.current = data.session.access_token;
      lastSessionUserIdRef.current = data.session.user?.id ?? null;

      // Sync SSR cookies on server for RLS (set session cookies)
      try {
        await fetch('/api/auth/set-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          }),
        });
      } catch (e) {
        console.warn('[useAuth] SSR cookie sync failed:', e);
      }

      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login error occurred';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      return false;
    }
  }, []);

  /**
   * Register new user
   */
  const register = useCallback(async (data: RegistrationData): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      // Use Supabase auth for real registration
      const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            role: data.role,
            institution: data.institution
          }
        }
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Registration failed - no user returned');
      }

      // Skip the users table entirely - Supabase auth is the source of truth
      // Only create user_profiles entry for additional profile information
      const nameParts = data.fullName.trim().split(' ');
      const firstName = nameParts[0] || data.fullName;
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      // Create user profile in user_profiles table
      const { error: profileError } = await (supabaseClient as any)
        .from('user_profiles')
        .upsert({
          user_id: authData.user.id,
          first_name: firstName,
          last_name: lastName,
          display_name: data.fullName,
          institution: data.institution || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any, { onConflict: 'user_id' });

      if (profileError) {
        console.warn('Failed to create user profile:', profileError);
        // Don't throw error since auth registration was successful
        // User can still use the app with just auth.users entry
      }

      // Registration successful - user needs to verify email
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: null
      }));

      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration error occurred';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      return false;
    }
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(async (): Promise<void> => {
    const currentUserId = authState.user?.id;

    try {
      // Use Supabase auth logout
      await supabaseClient.auth.signOut();
      // Clear SSR cookies
      try { await fetch('/api/auth/signout', { method: 'POST' }); } catch {}
    } catch (error) {
      console.warn('Supabase logout failed:', error);
    }

    // Clear local storage
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
    localStorage.removeItem(STORAGE_KEYS.USER_PREFERENCES);
    localStorage.removeItem('userId');

    // Clear permission cache
    if (currentUserId) {
      permissionManager.clearCache(currentUserId);
    }

    // Reset state
    setAuthState({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
  }, [authState.user?.id]);

  /**
   * Refresh authentication token
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (!authState.session) return false;

    return await attemptTokenRefresh(authState.session.refreshToken);
  }, [authState.session?.refreshToken]); // ✅ CRITICAL FIX: Depend only on refreshToken value, not full session

  /**
   * Attempt token refresh
   */
  const attemptTokenRefresh = useCallback(async (refreshTokenValue: string): Promise<boolean> => {
    try {
      // Use Supabase auth refresh
      const { data, error } = await supabaseClient.auth.refreshSession({ refresh_token: refreshTokenValue });

      if (error || !data.session) {
        console.error('Token refresh failed:', error);
        return false;
      }

      // Get updated user profile
      if (!data.user) {
        console.error('Token refresh returned no user.');
        return false;
      }
      const { data: userProfile, error: profileError } = await (supabaseClient as any)
        .from('users')
        .select(`
          id, email, role, email_verified_at, created_at, last_login_at,
          user_profiles!inner(
            display_name, first_name, last_name, institution, avatar_url
          )
        `)
        .eq('id', data.user.id)
        .single();

      if (profileError || !userProfile) {
        console.error('Failed to fetch updated user profile:', profileError);
        return false;
      }

      // Update session with refreshed tokens
      const profile = userProfile.user_profiles?.[0];
      const emailName = userProfile.email?.split('@')[0] || 'User';
      const displayName = profile?.display_name ||
                         (profile?.first_name && profile?.last_name ?
                          `${profile.first_name} ${profile.last_name}` : emailName);

      const user: User = {
        id: userProfile.id,
        email: userProfile.email,
        name: displayName,
        fullName: displayName,
        role: userProfile.role as UserRole,
        institution: profile?.institution || undefined,
        isVerified: !!userProfile.email_verified_at,
        createdAt: userProfile.created_at,
        lastLogin: new Date().toISOString(),
        avatarUrl: profile?.avatar_url || userProfile.avatar_url || undefined
      };

      const newSession: AuthSession = {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at ? data.session.expires_at * 1000 : Date.now(),
        user: user,
        sessionId: data.session.user?.id || 'session-' + Date.now()
      };

      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(newSession));
      // Store userId separately for easy access
      localStorage.setItem('userId', newSession.user.id);

      setAuthState(prev => ({
        ...prev,
        session: newSession,
        user: user
      }));

      lastAccessTokenRef.current = data.session.access_token;
      lastSessionUserIdRef.current = data.session.user?.id ?? null;

      return true;

    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }, []);

  /**
   * Validate session with server
   */
  const validateSession = useCallback(async (accessToken: string): Promise<boolean> => {
    try {
      // Use Supabase to validate the current session
      const { data, error } = await supabaseClient.auth.getUser(accessToken);
      
      return !error && !!data.user;
    } catch (error) {
      return false;
    }
  }, []);

  // ✅ REMOVED: setupTokenRefresh function - moved inline to prevent callback dependency loops

  /**
   * Permission checking methods
   */
  const hasPermission = useCallback((permission: string, resourceId?: string): boolean => {
    if (!authState.user) return false;

    const permissionContext: UserPermissionContext = {
      userId: authState.user.id,
      role: authState.user.role,
      institution: authState.user.institution,
      isVerified: authState.user.isVerified,
      sessionData: authState.session ? {
        sessionId: authState.session.sessionId,
        loginTime: Date.now() - 3600000, // Approximate
        lastActivity: Date.now()
      } : undefined
    };

    const result = permissionManager.hasPermission(permissionContext, permission as any, resourceId);
    return result.granted;
  }, [authState.user?.id, authState.user?.role, authState.session?.sessionId, permissionManager]); // ✅ CRITICAL FIX: Depend only on stable primitive values

  const isAdmin = useCallback((): boolean => {
    return authState.user?.role === 'admin' && hasPermission('admin.system');
  }, [authState.user?.role, hasPermission]); // ✅ CRITICAL FIX: Depend only on role value, not full user object

  const canPerformAcademicOperations = useCallback((): boolean => {
    if (!authState.user) return false;

    const permissionContext: UserPermissionContext = {
      userId: authState.user.id,
      role: authState.user.role,
      institution: authState.user.institution,
      isVerified: authState.user.isVerified
    };

    return permissionManager.canPerformAcademicOperations(permissionContext);
  }, [authState.user?.id, authState.user?.role, authState.user?.isVerified, permissionManager]); // ✅ CRITICAL FIX: Depend only on specific user properties

  /**
   * Utility methods
   */
  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  const updateProfile = useCallback(async (updates: Partial<User>): Promise<boolean> => {
    if (!authState.user || !authState.session) return false;

    try {
      // Prepare updates for user_profiles table (correct table with proper field mapping)
      const dbUpdates: any = {};
      if (updates.fullName) {
        dbUpdates.display_name = updates.fullName;
        // Split fullName into first_name and last_name if possible
        const nameParts = updates.fullName.trim().split(' ');
        if (nameParts.length >= 2) {
          dbUpdates.first_name = nameParts[0];
          dbUpdates.last_name = nameParts.slice(1).join(' ');
        } else {
          dbUpdates.first_name = updates.fullName;
          dbUpdates.last_name = '';
        }
      }
      if (updates.institution !== undefined) dbUpdates.institution = updates.institution;
      if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
      dbUpdates.updated_at = new Date().toISOString();

      // Update user profile in user_profiles table (correct table)
      const { error } = await (supabaseClient as any)
        .from('user_profiles')
        .update(dbUpdates as any)
        .eq('user_id', authState.user.id);

      if (error) {
        throw new Error(`Profile update failed: ${error.message}`);
      }

      // Update local state
      setAuthState(prev => ({
        ...prev,
        user: { ...prev.user!, ...updates },
        session: prev.session ? {
          ...prev.session,
          user: { ...prev.session.user, ...updates }
        } : prev.session
      }));

      return true;

    } catch (error) {
      console.error('Profile update error:', error);
      return false;
    }
  }, [authState.user?.id, authState.session?.sessionId]); // ✅ CRITICAL FIX: Depend only on stable user and session IDs

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<boolean> => {
    if (!authState.session) return false;

    try {
      // Use Supabase auth to update password
      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw new Error(`Password change failed: ${error.message}`);
      }

      return true;

    } catch (error) {
      console.error('Password change error:', error);
      return false;
    }
  }, [authState.session?.sessionId]); // ✅ CRITICAL FIX: Depend only on sessionId, not full session object

  /**
   * Request password reset
   */
  const requestPasswordReset = useCallback(async (email: string): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: error.message
        }));
        return false;
      }

      setAuthState(prev => ({ ...prev, isLoading: false }));
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset request failed';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      return false;
    }
  }, []);

  /**
   * Reset password with new password
   */
  const resetPassword = useCallback(async (newPassword: string): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: error.message
        }));
        return false;
      }

      setAuthState(prev => ({ ...prev, isLoading: false }));
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      return false;
    }
  }, []);

  /**
   * Resend verification email
   */
  const resendVerificationEmail = useCallback(async (email: string): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      const { error } = await supabaseClient.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`
        }
      });

      if (error) {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: error.message
        }));
        return false;
      }

      setAuthState(prev => ({ ...prev, isLoading: false }));
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resend verification email';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      return false;
    }
  }, []);

  /**
   * Check if current session token is expired or will expire soon
   */
  const isTokenExpired = useCallback((bufferMinutes: number = 1): boolean => {
    if (!authState.session || !authState.session.expiresAt) return true;

    // Check if expires within buffer time (reduced to 1 minute to prevent aggressive refresh)
    const bufferTime = bufferMinutes * 60 * 1000;
    return Date.now() > (authState.session.expiresAt - bufferTime);
  }, [authState.session?.expiresAt]); // ✅ CRITICAL FIX: Depend only on expiresAt value, not full session

  // Context value
  const contextValue: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    refreshToken,
    isTokenExpired,
    requestPasswordReset,
    resetPassword,
    resendVerificationEmail,
    hasPermission,
    isAdmin,
    canPerformAcademicOperations,
    clearError,
    updateProfile,
    changePassword
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to use authentication context
 */
export function useAuth(): AuthContextType {
  // ========================================================================================
  // DEBUG: HOOK INSTANCE TRACKING
  // ========================================================================================
  const hookInstanceIdRef = useRef<string | null>(null);

  if (!hookInstanceIdRef.current) {
    hookInstanceIdRef.current = generateInstanceId();
    const hookInstanceId = hookInstanceIdRef.current;

    // Register this useAuth hook instance
    const { stack, source } = captureComponentStack();
    const debugInfo: AuthInstanceDebugInfo = {
      id: hookInstanceId,
      createdAt: Date.now(),
      componentStack: stack,
      source,
      isActive: true,
      initializationCount: 1,
      lastActivity: Date.now()
    };

    GLOBAL_AUTH_INSTANCES.set(hookInstanceId, debugInfo);

    debugLog(hookInstanceId, 'log', `🎣 HOOK INSTANCE CREATED | Source: ${source}`);

    // Check for multiple hook instances
    const activeHookInstances = Array.from(GLOBAL_AUTH_INSTANCES.values()).filter(i => i.isActive);
    if (activeHookInstances.length > 1) {
      console.group(`⚠️ [AUTH-DEBUG] MULTIPLE HOOK INSTANCES DETECTED! Count: ${activeHookInstances.length}`);
      console.table(activeHookInstances.map(i => ({
        id: i.id.substring(5, 11),
        source: i.source,
        createdAt: new Date(i.createdAt).toLocaleTimeString(),
        active: i.isActive
      })));
      console.groupEnd();
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    const hookInstanceId = hookInstanceIdRef.current;
    if (hookInstanceId) {
      return () => {
        const instance = GLOBAL_AUTH_INSTANCES.get(hookInstanceId);
        if (instance) {
          instance.isActive = false;
          debugLog(hookInstanceId, 'log', '🗑️ HOOK INSTANCE CLEANUP');

          // Clean up after delay
          setTimeout(() => {
            GLOBAL_AUTH_INSTANCES.delete(hookInstanceId);
          }, 5000);
        }
      };
    }
  }, []);

  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook for permission checking
 */
export function usePermissions() {
  const { user } = useAuth();
  
  if (!user) {
    return {
      hasPermission: () => false,
      hasAnyPermission: () => false,
      hasAllPermissions: () => false,
      isAdmin: () => false,
      canPerformAcademicOperations: () => false,
      getUserPermissions: () => [],
      getRoleInfo: () => null
    };
  }

  const permissionContext: UserPermissionContext = {
    userId: user.id,
    role: user.role,
    institution: user.institution,
    isVerified: user.isVerified
  };

  return createPermissionHook(permissionContext);
}

/**
 * HOC for authenticated components
 */
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
      return <div>Please login to access this content</div>;
    }

    return <Component {...props} />;
  };
}

/**
 * HOC for role-based access
 */
export function withRole<P extends object>(requiredRole: UserRole, Component: React.ComponentType<P>) {
  return function RoleProtectedComponent(props: P) {
    const { user, isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return <div>Loading...</div>;
    }

    if (!isAuthenticated || !user) {
      return <div>Please login to access this content</div>;
    }

    const permissionManager = PermissionManager.getInstance();
    if (permissionManager.compareRoles(user.role, requiredRole) < 0) {
      return <div>Insufficient permissions to access this content</div>;
    }

    return <Component {...props} />;
  };
}

export default useAuth;
