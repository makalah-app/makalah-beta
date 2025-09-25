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

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { UserRole, PermissionManager, UserPermissionContext, createPermissionHook } from '../lib/auth/role-permissions';
import { supabaseClient } from '../lib/database/supabase-client';

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

  // Initialize authentication from storage
  useEffect(() => {
    let mounted = true;
    
    async function initialize() {
      if (!mounted) return;
      
      console.log('[useAuth] Initializing authentication...');
      try {
        // Call initializeAuth directly without dependency
        await initializeAuth();
        console.log('[useAuth] ✅ Authentication initialization complete');
      } catch (error) {
        console.error('[useAuth] ❌ Authentication initialization failed:', error);
        // Set loading false on error
        if (mounted) {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      }
    }
    
    initialize();
    
    return () => {
      mounted = false;
    };
  }, []); // Empty dependency to avoid cycle

  // Set up token refresh timer
  useEffect(() => {
    if (authState.session) {
      setupTokenRefresh(authState.session);
    }
  }, [authState.session]);

  /**
   * Initialize authentication from stored session
   */
  const initializeAuth = async () => {
    try {
      console.log('[initializeAuth] Starting authentication initialization...');
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // First, try to get current session from Supabase
      console.log('[initializeAuth] Getting session from Supabase...');
      const { data: { session }, error } = await supabaseClient.auth.getSession();

      if (error) {
        console.error('[initializeAuth] Error getting Supabase session:', error);
        setAuthState({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
        return;
      }

      if (!session) {
        console.log('[initializeAuth] No active session found, setting isLoading: false');
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      console.log('[initializeAuth] Session found, fetching user profile...');

      // Get user profile from database (join users with user_profiles)
      const { data: userProfile, error: profileError } = await (supabaseClient as any)
        .from('users')
        .select(`
          id, email, role, email_verified_at, created_at, last_login_at,
          user_profiles!inner(
            display_name, first_name, last_name, institution, avatar_url
          )
        `)
        .eq('id', session.user.id)
        .single();

      if (profileError || !userProfile) {
        console.error('[initializeAuth] Failed to fetch user profile:', profileError);
        setAuthState({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'User profile not found'
        });
        return;
      }

      // Extract profile data from joined result
      const profile = userProfile.user_profiles?.[0];
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
        expiresAt: new Date(session.expires_at || 0).getTime(),
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

    } catch (error) {
      console.error('Auth initialization error:', error);
      setAuthState({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    }
  };

  /**
   * Login user with credentials
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      // Use Supabase auth for real authentication
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user || !data.session) {
        throw new Error('Login failed - no user or session returned');
      }

      // Get user profile from database (join users with user_profiles)
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


      // Map Supabase user to our User interface (fallback to auth metadata if profile missing)
      const emailName = userProfile?.email?.split('@')[0] || data.user.email?.split('@')[0] || 'User';
      const fallbackName = data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User';

      const user: User = userProfile ? {
        // Extract profile data from joined result
        id: userProfile.id,
        email: userProfile.email,
        name: (() => {
          const profile = userProfile.user_profiles?.[0];
          return profile?.display_name ||
                 (profile?.first_name && profile?.last_name ?
                  `${profile.first_name} ${profile.last_name}` : emailName);
        })(),
        fullName: (() => {
          const profile = userProfile.user_profiles?.[0];
          return profile?.display_name ||
                 (profile?.first_name && profile?.last_name ?
                  `${profile.first_name} ${profile.last_name}` : undefined);
        })(),
        role: userProfile.role as UserRole,
        institution: userProfile.user_profiles?.[0]?.institution || undefined,
        isVerified: !!userProfile.email_verified_at,
        createdAt: userProfile.created_at,
        lastLogin: new Date().toISOString(),
        avatarUrl: userProfile.user_profiles?.[0]?.avatar_url || userProfile.avatar_url || undefined
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
        expiresAt: new Date(data.session.expires_at || 0).getTime(),
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

      // Create user profile in our database (users table first, then user_profiles)
      const { error: userError } = await (supabaseClient as any)
        .from('users')
        .insert({
          id: authData.user.id,
          email: data.email,
          role: data.role,
          email_verified_at: null, // Will be set when email is verified
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any);

      if (userError) {
        console.error('Failed to create user:', userError);
        throw new Error('Registration failed - user creation error');
      }

      // Create user profile in user_profiles table
      const nameParts = data.fullName.trim().split(' ');
      const firstName = nameParts[0] || data.fullName;
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      const { error: profileError } = await (supabaseClient as any)
        .from('user_profiles')
        .insert({
          user_id: authData.user.id,
          first_name: firstName,
          last_name: lastName,
          display_name: data.fullName,
          institution: data.institution || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any);

      if (profileError) {
        console.error('Failed to create user profile:', profileError);
        throw new Error('Registration failed - profile creation error');
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
    if (authState.user) {
      permissionManager.clearCache(authState.user.id);
    }

    // Reset state
    setAuthState({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
  }, []);

  /**
   * Refresh authentication token
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (!authState.session) return false;
    
    return await attemptTokenRefresh(authState.session.refreshToken);
  }, [authState.session]);

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
        expiresAt: new Date(data.session.expires_at || 0).getTime(),
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

  /**
   * Setup automatic token refresh
   */
  const setupTokenRefresh = useCallback((session: AuthSession) => {
    const timeUntilExpiry = session.expiresAt - Date.now();
    const refreshTime = timeUntilExpiry - (5 * 60 * 1000); // Refresh 5 minutes before expiry

    if (refreshTime > 0) {
      setTimeout(() => {
        attemptTokenRefresh(session.refreshToken);
      }, refreshTime);
    }
  }, [attemptTokenRefresh]);

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
  }, [authState.user, authState.session, permissionManager]);

  const isAdmin = useCallback((): boolean => {
    return authState.user?.role === 'admin' && hasPermission('admin.system');
  }, [authState.user, hasPermission]);

  const canPerformAcademicOperations = useCallback((): boolean => {
    if (!authState.user) return false;

    const permissionContext: UserPermissionContext = {
      userId: authState.user.id,
      role: authState.user.role,
      institution: authState.user.institution,
      isVerified: authState.user.isVerified
    };

    return permissionManager.canPerformAcademicOperations(permissionContext);
  }, [authState.user, permissionManager]);

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
  }, [authState.user, authState.session]);

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
  }, [authState.session]);

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
   * Check if current session token is expired or will expire soon
   */
  const isTokenExpired = useCallback((bufferMinutes: number = 1): boolean => {
    if (!authState.session || !authState.session.expiresAt) return true;

    // Check if expires within buffer time (reduced to 1 minute to prevent aggressive refresh)
    const bufferTime = bufferMinutes * 60 * 1000;
    return Date.now() > (authState.session.expiresAt - bufferTime);
  }, [authState.session]);

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
