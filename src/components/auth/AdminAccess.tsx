/**
 * Admin Access Component
 * 
 * Provides role-based access control for admin features with
 * comprehensive permission validation and user-friendly messaging.
 * 
 * Features:
 * - Admin role validation with permission checking
 * - Granular admin permission verification (system, users, analytics, etc.)
 * - User-friendly access denied messages with upgrade suggestions
 * - Loading states during permission verification
 * - Optional redirect behavior for unauthorized access
 * - Admin session monitoring and validation
 */

'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useAuth, usePermissions } from '../../hooks/useAuth';
import { UserRole, Permission } from '../../lib/auth/role-permissions';

export interface AdminAccessProps {
  children: ReactNode;
  requiredPermissions?: Permission[];
  fallbackComponent?: ReactNode;
  redirectTo?: string;
  showUpgradeSuggestion?: boolean;
  className?: string;
}

export interface AdminAccessCheckProps {
  requiredPermission: Permission;
  children: ReactNode;
  fallbackMessage?: string;
  className?: string;
}

/**
 * Main Admin Access Component
 * Wraps content that should only be accessible to admin users
 */
export default function AdminAccess({
  children,
  requiredPermissions = ['admin.system'],
  fallbackComponent,
  redirectTo,
  showUpgradeSuggestion = true,
  className = ''
}: AdminAccessProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { hasAllPermissions, isAdmin, getRoleInfo } = usePermissions();
  const [accessGranted, setAccessGranted] = useState<boolean>(false);
  const [accessChecking, setAccessChecking] = useState<boolean>(true);

  // Check admin access
  useEffect(() => {
    async function checkAccess() {
      setAccessChecking(true);

      // Basic authentication check
      if (!isAuthenticated || !user) {
        setAccessGranted(false);
        setAccessChecking(false);
        
        if (redirectTo) {
          setTimeout(() => {
            window.location.href = `${redirectTo}?redirect=${encodeURIComponent(window.location.pathname)}`;
          }, 1000);
        }
        return;
      }

      // Admin role check
      if (!isAdmin()) {
        setAccessGranted(false);
        setAccessChecking(false);
        return;
      }

      // Permission-specific checks
      if (requiredPermissions.length > 0) {
        const hasPermissions = hasAllPermissions(requiredPermissions);
        setAccessGranted(hasPermissions);
      } else {
        setAccessGranted(true);
      }

      setAccessChecking(false);
    }

    if (!isLoading) {
      checkAccess();
    }
  }, [isAuthenticated, user, isLoading, isAdmin, hasAllPermissions, requiredPermissions, redirectTo]);

  // Loading state
  if (isLoading || accessChecking) {
    return (
      <div className={`flex justify-center items-center min-h-[200px] ${className}`}>
        <div className="text-center">
          <div className="text-3xl mb-4">⏳</div>
          <p>Memverifikasi akses admin...</p>
        </div>
      </div>
    );
  }

  // Access granted
  if (accessGranted) {
    return (
      <div className={className}>
        {children}
      </div>
    );
  }

  // Access denied - show fallback or default message
  if (fallbackComponent) {
    return <>{fallbackComponent}</>;
  }

  return (
    <AdminAccessDenied
      user={user}
      requiredPermissions={requiredPermissions}
      showUpgradeSuggestion={showUpgradeSuggestion}
      className={className}
    />
  );
}

/**
 * Admin Access Check Component
 * For inline permission checking with custom messaging
 */
export function AdminAccessCheck({
  requiredPermission,
  children,
  fallbackMessage,
  className = ''
}: AdminAccessCheckProps) {
  const { hasPermission } = usePermissions();

  const hasAccess = hasPermission(requiredPermission);

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className={`p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive ${className}`}>
      {fallbackMessage || `Akses ke fitur ini memerlukan permission: ${requiredPermission}`}
    </div>
  );
}

/**
 * Admin Access Denied Component
 * Shows when user doesn't have admin access
 * Styled consistently with auth page using ShadCN components
 */
function AdminAccessDenied({
  user,
  requiredPermissions,
  showUpgradeSuggestion,
  className
}: {
  user: any;
  requiredPermissions: Permission[];
  showUpgradeSuggestion: boolean;
  className: string;
}) {
  return (
    <div className={`min-h-screen bg-background ${className}`}>
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-6 py-12">
        <div className="w-full max-w-md">
          <Card className="p-8 border-border bg-card shadow-lg">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
                  <BrandLogo variant="white" size="sm" priority />
                </Link>
              </div>

              <h1 className="text-xl font-medium mb-2 text-foreground font-heading">
                Akses Tidak Diotorisasi
              </h1>

              <p className="text-sm text-muted-foreground mb-6">
                Anda harus login dengan akun admin yang valid untuk mengakses area admin.
              </p>

              <Button asChild className="w-full" size="lg">
                <Link href="/auth">Login</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Admin Panel Wrapper Component
 * Provides consistent admin panel layout
 */
export function AdminPanel({
  title,
  children,
  requiredPermissions,
  className = ''
}: {
  title: string;
  children: ReactNode;
  requiredPermissions?: Permission[];
  className?: string;
}) {
  return (
    <AdminAccess
      requiredPermissions={requiredPermissions}
      className={className}
    >
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border px-8 py-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/admin" className="text-primary hover:underline">
              Admin
            </Link>
            <span className="font-medium">›</span>
            <span>{title}</span>
          </div>
        </div>

        <div className="p-8">
          {children}
        </div>
      </div>
    </AdminAccess>
  );
}
import BrandLogo from '@/components/ui/BrandLogo';
