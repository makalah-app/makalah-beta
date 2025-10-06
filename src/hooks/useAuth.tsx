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
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
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
      role: (session.user.user_metadata?.role || 'student') as UserRole,
      institution: session.user.user_metadata?.institution || undefined,
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
      return;
    }

    try {
      initializingRef.current = true;
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // Check if we've tried too many times for this session
      if (providedSession?.user?.id) {
        const attempts = profileFetchAttemptsRef.current.get(providedSession.user.id) || 0;
        if (attempts >= 3) {
          initializingRef.current = false;
          return;
        }
      }

      // First, try to get current session from Supabase
      let session = providedSession ?? null;

      if (!session) {
        const sessionResult = await withTimeout(
          supabaseClient.auth.getSession(),
          2500,
          async () => ({ data: { session: null }, error: null } as any)
        );
        const { data: { session: fetchedSession }, error } = sessionResult as any;

        if (error) {
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
        setAuthState(prev => ({ ...prev, isLoading: false }));
        initializingRef.current = false;
        return;
      }

      if (
        lastAccessTokenRef.current &&
        lastAccessTokenRef.current === session.access_token &&
        lastSessionUserIdRef.current === session.user?.id
      ) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        initializingRef.current = false;
        return;
      }

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
        5000,
        async () => ({ data: null, error: { message: 'profile timeout' } } as any)
      );
      const { data: userProfile, error: profileError } = profileResult as any;

      if (profileError && profileError.code !== 'PGRST116') {
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
      if (!mounted) return;

      // Use ref for atomic check-and-set to prevent race conditions
      if (hasInitializedRef.current) {
        return;
      }
      hasInitializedRef.current = true;

      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        await initializeAuth(session);
      } catch (error) {
        if (mounted) {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      }
    }

    // Listen for auth state changes from Supabase
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // ✅ CRITICAL FIX: Handle INITIAL_SESSION separately to prevent double initialization
      if (event === 'INITIAL_SESSION') {
        // INITIAL_SESSION is handled by main initialize() function, don't duplicate
        return;
      }

      if (event === 'SIGNED_OUT' || !session) {
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
          await initializeAuth(session);
        }
      }
      // ✅ CRITICAL FIX: Ignore ALL refresh events to prevent infinite loops
      else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        // Ignored to prevent infinite loops
      }
    });

    // Initialize once
    initialize();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      profileFetchAttemptsRef.current.clear(); // Clear attempts map
      hasInitializedRef.current = false; // Reset initialization flag
    };
  }, []); // NO DEPENDENCIES - run only once on mount

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
        // SSR cookie sync failed, but login still successful
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
      // Supabase logout failed, but continue with local cleanup
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
  }, [authState.user?.id, permissionManager]);

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
        return false;
      }

      // Get updated user profile
      if (!data.user) {
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

  // Auto token refresh timer to keep session alive
  useEffect(() => {
    if (!authState.isAuthenticated || !authState.session) return;

    const checkAndRefreshToken = async () => {
      const expiresAt = authState.session?.expiresAt;
      if (!expiresAt) return;

      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      // Refresh if token expires within 5 minutes (300,000 ms)
      if (timeUntilExpiry < 5 * 60 * 1000) {
        await refreshToken();
      }
    };

    // Check immediately
    checkAndRefreshToken();

    // Check every 4 minutes (240,000 ms)
    const interval = setInterval(checkAndRefreshToken, 4 * 60 * 1000);

    return () => clearInterval(interval);
  }, [authState.isAuthenticated, authState.session?.expiresAt, refreshToken]);

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