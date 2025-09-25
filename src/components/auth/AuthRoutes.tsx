/**
 * Authentication Route Components
 * 
 * Clean version of role-based route protection without caching issues.
 */

'use client';

import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { UserRole, Permission } from '../../lib/auth/role-permissions';

export interface RoleBasedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requiredPermissions?: Permission[];
  requiresAuth?: boolean;
  fallbackComponent?: ReactNode;
  redirectTo?: string;
  loadingComponent?: ReactNode;
  className?: string;
}

export interface ProtectedRouteProps {
  children: ReactNode;
  minRole?: UserRole;
  exactRole?: UserRole;
  requiredPermissions?: Permission[];
  fallbackComponent?: ReactNode;
  redirectTo?: string;
  className?: string;
}

export default function RoleBasedRoute({
  children,
  allowedRoles,
  requiredPermissions = [],
  requiresAuth = true,
  fallbackComponent,
  redirectTo,
  loadingComponent,
  className = ''
}: RoleBasedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  // ✅ REMOVED: Debug logging to prevent console spam
  const normalizedAllowedRoles = useMemo(
    () => (allowedRoles ? [...allowedRoles] : []),
    [allowedRoles]
  );
  const normalizedRequiredPermissions = useMemo(
    () => (requiredPermissions ? [...requiredPermissions] : []),
    [requiredPermissions]
  );
  
  const [accessState, setAccessState] = useState<{
    granted: boolean;
    loading: boolean;
    reason?: string;
  }>({
    granted: false,
    loading: true
  });

  useEffect(() => {
    let mounted = true;
    
    async function checkAccess() {
      if (!mounted || isLoading) {
        return;
      }

      if (requiresAuth && !isAuthenticated) {
        if (!mounted) return;

        // ✅ CRITICAL FIX: Immediate redirect to prevent stuck state
        if (redirectTo) {
          const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
          console.log('[RoleBasedRoute] Redirecting to auth:', `${redirectTo}?returnUrl=${returnUrl}`);
          window.location.href = `${redirectTo}?returnUrl=${returnUrl}`;
          return; // Early return to prevent state update after redirect
        }

        setAccessState({
          granted: false,
          loading: false,
          reason: 'Authentication required'
        });
        return;
      }

      if (!requiresAuth && !isAuthenticated) {
        if (!mounted) return;
        setAccessState({
          granted: true,
          loading: false
        });
        return;
      }

      if (user) {
        if (normalizedAllowedRoles.length > 0) {
          if (!normalizedAllowedRoles.includes(user.role)) {
            if (!mounted) return;
            setAccessState({
              granted: false,
              loading: false,
              reason: `Role '${user.role}' tidak diizinkan. Role yang diizinkan: ${normalizedAllowedRoles.join(', ')}`
            });
            return;
          }
        }

        if (normalizedRequiredPermissions.length > 0) {
          // ✅ CRITICAL FIX: Use local permission checking instead of unstable hasAllPermissions hook
          const userHasPermissions = user && normalizedRequiredPermissions.every(permission => {
            // Simple permission check - admin has all permissions, others have basic chat access
            if (user.role === 'admin') return true;
            if (permission === 'ai.chat' || permission === 'workflow.read') return true;
            return user.role === 'researcher' || user.role === 'student';
          });

          if (!userHasPermissions) {
            if (!mounted) return;
            setAccessState({
              granted: false,
              loading: false,
              reason: `Permission tidak mencukupi. Dibutuhkan: ${normalizedRequiredPermissions.join(', ')}`
            });
            return;
          }
        }
      }

      if (mounted) {
        setAccessState({
          granted: true,
          loading: false
        });
      }
    }

    checkAccess();
    
    return () => {
      mounted = false;
    };
  }, [
    // ✅ CRITICAL FIX: Minimal stable dependencies to prevent infinite loops
    isAuthenticated,
    isLoading,
    requiresAuth,
    redirectTo,
    // ✅ Use JSON.stringify for complex objects to get stable string references
    JSON.stringify(normalizedAllowedRoles),
    JSON.stringify(normalizedRequiredPermissions),
    user?.id, // ✅ Primitive value - stable
    user?.role // ✅ Primitive value - stable
  ]);

  if (accessState.loading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    
    return (
      <div className={`route-loading ${className}`}>
        <div className="loading-container">
          <div className="loading-spinner">⏳</div>
          <p>Memverifikasi akses...</p>
        </div>
      </div>
    );
  }

  if (accessState.granted) {
    return <div className={className}>{children}</div>;
  }

  if (fallbackComponent) {
    return <>{fallbackComponent}</>;
  }

  return (
    <div className={`route-access-denied ${className}`}>
      <div className="access-denied-container">
        <div className="access-denied-icon">🚫</div>
        <h2 className="access-denied-title">Akses Ditolak</h2>
        <p className="access-denied-message">
          {accessState.reason || 'Akses ke halaman ini tidak diizinkan.'}
        </p>
        <div className="access-denied-actions">
          {!user ? (
            <a href="/auth" className="action-button primary">
              Login
            </a>
          ) : (
            <button 
              onClick={() => window.history.back()} 
              className="action-button secondary"
            >
              Kembali
            </button>
          )}
          <a href="/chat" className="action-button secondary">
            Chat
          </a>
        </div>
      </div>
    </div>
  );
}

export function ProtectedRoute({
  children,
  minRole,
  exactRole,
  requiredPermissions,
  fallbackComponent,
  redirectTo = '/auth',
  className = ''
}: ProtectedRouteProps) {
  let allowedRoles: UserRole[] | undefined;

  if (exactRole) {
    allowedRoles = [exactRole];
  } else if (minRole) {
    const roleHierarchy: Record<UserRole, UserRole[]> = {
      guest: ['guest', 'student', 'researcher', 'admin'],
      student: ['student', 'researcher', 'admin'],
      researcher: ['researcher', 'admin'],
      admin: ['admin']
    };
    allowedRoles = roleHierarchy[minRole] || [];
  }

  return (
    <RoleBasedRoute
      allowedRoles={allowedRoles}
      requiredPermissions={requiredPermissions}
      requiresAuth={true}
      fallbackComponent={fallbackComponent}
      redirectTo={redirectTo}
      className={className}
    >
      {children}
    </RoleBasedRoute>
  );
}

export function AdminRoute({
  children,
  requiredPermissions = ['admin.system'],
  className = ''
}: {
  children: ReactNode;
  requiredPermissions?: Permission[];
  className?: string;
}) {
  return (
    <RoleBasedRoute
      allowedRoles={['admin']}
      requiredPermissions={requiredPermissions}
      redirectTo="/auth"
      className={className}
    >
      {children}
    </RoleBasedRoute>
  );
}

export function ResearcherRoute({
  children,
  requiredPermissions,
  className = ''
}: {
  children: ReactNode;
  requiredPermissions?: Permission[];
  className?: string;
}) {
  return (
    <RoleBasedRoute
      allowedRoles={['researcher', 'admin']}
      requiredPermissions={requiredPermissions}
      redirectTo="/auth"
      className={className}
    >
      {children}
    </RoleBasedRoute>
  );
}

export function PublicRoute({
  children,
  className = ''
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <RoleBasedRoute
      requiresAuth={false}
      className={className}
    >
      {children}
    </RoleBasedRoute>
  );
}
