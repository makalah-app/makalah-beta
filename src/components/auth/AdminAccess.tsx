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
      <div className={`admin-access-loading ${className}`}>
        <div className="loading-container">
          <div className="loading-spinner">⏳</div>
          <p>Memverifikasi akses admin...</p>
        </div>
      </div>
    );
  }

  // Access granted
  if (accessGranted) {
    return (
      <div className={`admin-access-granted ${className}`}>
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
    <div className={`admin-access-denied-inline ${className}`}>
      {fallbackMessage || `Akses ke fitur ini memerlukan permission: ${requiredPermission}`}
    </div>
  );
}

/**
 * Admin Access Denied Component
 * Shows when user doesn't have admin access
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
  const getAccessDeniedMessage = () => {
    if (!user) {
      return {
        title: 'Akses Tidak Diotorisasi',
        message: 'Anda harus login untuk mengakses area admin.',
        action: 'Silakan login dengan akun admin yang valid.',
        icon: '🔒'
      };
    }

    if (user.role !== 'admin') {
      return {
        title: 'Akses Admin Diperlukan',
        message: `Akun Anda (${user.role}) tidak memiliki akses ke area admin.`,
        action: showUpgradeSuggestion 
          ? 'Hubungi administrator sistem untuk upgrade akun ke admin.'
          : 'Akses ini hanya untuk administrator sistem.',
        icon: '⛔'
      };
    }

    return {
      title: 'Permission Tidak Mencukupi',
      message: `Akun admin Anda tidak memiliki permission yang diperlukan.`,
      action: `Permission yang dibutuhkan: ${requiredPermissions.join(', ')}`,
      icon: '🚫'
    };
  };

  const accessInfo = getAccessDeniedMessage();

  return (
    <div className={`admin-access-denied ${className}`}>
      <div className="access-denied-container">
        <div className="access-denied-icon">
          {accessInfo.icon}
        </div>
        
        <div className="access-denied-content">
          <h3 className="access-denied-title">
            {accessInfo.title}
          </h3>
          
          <p className="access-denied-message">
            {accessInfo.message}
          </p>
          
          <p className="access-denied-action">
            {accessInfo.action}
          </p>


          {/* Action buttons */}
          <div className="access-denied-actions">
            {!user && (
              <a href="/auth" className="action-button primary">
                Login
              </a>
            )}
            
            {user && user.role !== 'admin' && (
              <a href="/contact" className="action-button secondary">
                Hubungi Admin
              </a>
            )}
            
            <a href="/chat" className="action-button secondary">
              Chat
            </a>
          </div>
        </div>
      </div>

      {/* Admin features overview */}
      <div className="admin-features-overview">
        <h4>Fitur Admin yang Tersedia</h4>
        <div className="features-grid">
          <div className="feature-item">
            <span className="feature-icon">👥</span>
            <div>
              <h5>Manajemen User</h5>
              <p>Kelola akun user, role, dan permission</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⚙️</span>
            <div>
              <h5>Konfigurasi Sistem</h5>
              <p>Setting aplikasi dan parameter AI</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📊</span>
            <div>
              <h5>Analytics & Monitoring</h5>
              <p>Dashboard usage dan performance</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📝</span>
            <div>
              <h5>Content Management</h5>
              <p>Kelola konten dan template sistem</p>
            </div>
          </div>
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
      className={`admin-panel ${className}`}
    >
      <div className="admin-panel-container">
        <div className="admin-panel-header">
          <h1 className="admin-panel-title">{title}</h1>
          <div className="admin-panel-breadcrumb">
            <a href="/admin">Admin</a>
            <span className="breadcrumb-separator">›</span>
            <span>{title}</span>
          </div>
        </div>
        
        <div className="admin-panel-content">
          {children}
        </div>
      </div>
    </AdminAccess>
  );
}

// CSS-in-JS styles (you can move these to a separate CSS file)
const styles = `
.admin-access-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.loading-container {
  text-align: center;
}

.loading-spinner {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.admin-access-denied {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
}

.access-denied-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 2rem;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  margin-bottom: 2rem;
}

.access-denied-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.access-denied-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #dc2626;
  margin-bottom: 1rem;
}

.access-denied-message {
  font-size: 1rem;
  color: #374151;
  margin-bottom: 0.5rem;
}

.access-denied-action {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 1.5rem;
}


.access-denied-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

.action-button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 0.2s;
}

.action-button.primary {
  background-color: #3b82f6;
  color: white;
}

.action-button.primary:hover {
  background-color: #2563eb;
}

.action-button.secondary {
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.action-button.secondary:hover {
  background-color: #e5e7eb;
}

.admin-features-overview {
  background-color: #f9fafb;
  padding: 1.5rem;
  border-radius: 0.5rem;
}

html.dark .admin-features-overview {
  background-color: #1f2937;
}

.admin-features-overview h4 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
  text-align: center;
  color: #1a1a1a;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background-color: white;
  border-radius: 0.375rem;
  border: 1px solid #e5e7eb;
}

html.dark .feature-item {
  background-color: #374151;
  border: 1px solid #4b5563;
}

.feature-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.feature-item h5 {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: #1a1a1a;
}

.feature-item p {
  font-size: 0.8rem;
  color: #6b7280;
  margin: 0;
}

.admin-access-denied-inline {
  padding: 0.5rem;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  color: #dc2626;
}

.admin-panel-container {
  min-height: 100vh;
  background-color: #f9fafb;
}

html.dark .admin-panel-container {
  background-color: #111827;
}

.admin-panel-header {
  background-color: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 1.5rem 2rem;
}

html.dark .admin-panel-header {
  background-color: #1f2937;
  border-bottom: 1px solid #374151;
}

.admin-panel-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 0.5rem;
}

.admin-panel-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.admin-panel-breadcrumb a {
  color: #3b82f6;
  text-decoration: none;
}

.admin-panel-breadcrumb a:hover {
  text-decoration: underline;
}

.breadcrumb-separator {
  font-weight: 500;
}

.admin-panel-content {
  padding: 2rem;
}

@media (max-width: 640px) {
  .admin-access-denied {
    margin: 1rem;
    padding: 1rem;
  }
  
  .access-denied-container {
    padding: 1.5rem;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .access-denied-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .admin-panel-header {
    padding: 1rem;
  }
  
  .admin-panel-content {
    padding: 1rem;
  }
}
`;

// Inject styles (in a real app, you'd put this in a CSS file)
if (typeof document !== 'undefined' && !document.querySelector('#admin-access-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'admin-access-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}