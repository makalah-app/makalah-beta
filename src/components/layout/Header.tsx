'use client';

/**
 * Header - Industrial Academic layout header dengan brand, navigation, theme toggle, dan user profile
 *
 * DESIGN COMPLIANCE:
 * - Industrial Academic design system dengan sharp corners
 * - 64px sticky header dengan backdrop blur effects
 * - Brand gradient badge dan text gradients
 * - AISDK Elements naming patterns
 *
 * FUNCTIONALITY:
 * - Theme toggle dengan localStorage persistence
 * - User authentication state management
 * - Conditional navigation (hidden on chat page)
 * - User dropdown menu (Settings, Logout)
 */

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { ThemeToggle } from '../theme/ThemeToggle';
import { cn } from '../../lib/utils';

interface HeaderProps {
  className?: string;
  showNavigation?: boolean;
  customNavItems?: Array<{ label: string; href: string }>;
}

export const Header: React.FC<HeaderProps> = ({
  className,
  showNavigation = true,
  customNavItems
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const isChatPage = pathname === '/chat';
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  // User dropdown state
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // User menu handlers
  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
    setLogoutError(null); // Clear error when menu toggles
  };

  const handleSettingsClick = () => {
    setIsUserMenuOpen(false);
    router.push('/settings');
  };

  const handleLogoutClick = async () => {
    setIsUserMenuOpen(false);
    setIsLoggingOut(true);
    setLogoutError(null);

    try {
      const result = await logout();

      // Only redirect if logout was successful
      if (result.success) {
        router.push('/auth');
      } else {
        setLogoutError('Logout gagal. Silakan coba lagi.');
      }
    } catch (error) {
      setLogoutError('Terjadi kesalahan saat logout. Silakan coba lagi.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Outside click detection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isUserMenuOpen]);

  // Get user's first name for display
  const getUserDisplayName = () => {
    if (!user || !user.name) return null;
    return user.name.split(' ')[0]; // First word only
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user || !user.name) return 'U';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  // Default navigation items
  const defaultNavItems = [
    { label: 'Dokumentasi', href: '#' },
    { label: 'Tutorial', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Tentang', href: '#' }
  ];

  const navItems = customNavItems || defaultNavItems;

  return (
    <header className={cn('header-container', className)}>
      {/* Brand Section */}
      <Link href="/" className="header-brand">
        <div className="header-brand-badge">M</div>
        <div className="header-brand-name">Makalah AI</div>
      </Link>

      {/* Navigation and Controls - Hidden on Chat Page */}
      {!isChatPage && (
        <div className="header-controls">
          {/* Navigation Menu */}
          {showNavigation && (
            <nav className="header-nav">
              {/* Chat Menu - Only visible when user is logged in */}
              {isAuthenticated && user && (
                <Link href="/chat" className="header-nav-link">
                  Chat
                </Link>
              )}

              {/* Dynamic Navigation Items */}
              {navItems.map((item, index) => (
                <Link key={index} href={item.href} className="header-nav-link">
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Authentication State */}
          {isAuthenticated && user ? (
            <div ref={userMenuRef} className="header-user-menu">
              <button onClick={toggleUserMenu} className="header-user-card">
                <div className="header-avatar">
                  {getUserInitials()}
                </div>
                <div className="header-user-meta">
                  <span className="header-user-name">{getUserDisplayName()}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {isUserMenuOpen ? '▲' : '▼'}
                </span>
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="header-dropdown">
                  <button onClick={handleSettingsClick} className="header-dropdown-item">
                    Settings
                  </button>
                  <button
                    onClick={handleLogoutClick}
                    disabled={isLoggingOut}
                    className="header-dropdown-item disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoggingOut ? 'Logging out...' : 'Logout'}
                  </button>

                  {/* Error Display */}
                  {logoutError && (
                    <div className="px-3 py-2 mx-2 mb-2 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-800 text-sm">{logoutError}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth" className="header-nav-link">
              Masuk
            </Link>
          )}

          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      )}
    </header>
  );
};

export default Header;
