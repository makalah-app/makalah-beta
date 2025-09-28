'use client';

/**
 * GlobalHeader - Modern header component based on design reference
 *
 * DESIGN COMPLIANCE:
 * - Follows knowledge_base/design_reference/components/global-header.tsx
 * - Uses ShadCN UI components (Button, DropdownMenu)
 * - 3px border radius consistency (rounded-[3px])
 * - Proper theme integration dengan ThemeProvider
 * - Authentication state management dengan useAuth
 */

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { UserDropdown } from "../ui/user-dropdown";
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../theme/ThemeProvider';
import { cn } from '../../lib/utils';

interface GlobalHeaderProps {
  className?: string;
  showNavigation?: boolean;
  showUserProfile?: boolean;
  customNavItems?: Array<{ label: string; href: string }>;
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({
  className,
  showNavigation = true,
  showUserProfile = true,
  customNavItems
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const isChatPage = pathname === '/chat';
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/auth');
  };

  const handleLogin = () => {
    // Define public pages that should redirect back after login
    const PUBLIC_PAGES = ['/', '/docs', '/tutorial', '/blog', '/about'];
    const currentPath = pathname;

    // Check if current page is a public page
    const isPublicPage = PUBLIC_PAGES.includes(currentPath);

    if (isPublicPage) {
      // Add redirectTo parameter to preserve current page
      router.push(`/auth?redirectTo=${encodeURIComponent(currentPath)}`);
    } else {
      // For non-public pages, use default behavior
      router.push('/auth');
    }
  };



  // Don't render theme toggle until mounted
  const isDark = mounted ? (resolvedTheme ?? theme ?? 'light') === 'dark' : false;

  // Default navigation items
  const defaultNavItems = [
    { label: 'Dokumentasi', href: '/documentation' },
    { label: 'Tutorial', href: '/tutorial' },
    { label: 'Blog', href: '/blog' },
    { label: 'Tentang', href: '/about' }
  ];

  const navItems = customNavItems || defaultNavItems;

  return (
    <header className={cn(
      'flex items-center justify-between px-6 py-4 border-b border-border bg-background',
      className
    )}>
      {/* Brand Section */}
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Image
            src="/logo/makalah_logo_500x500.png"
            alt="Makalah AI - Academic Paper Writing Assistant"
            width={40}
            height={40}
            className="rounded-[3px]"
            priority
          />
          <div className="text-xl font-medium text-foreground">Makalah AI</div>
        </Link>
      </div>

      {/* Navigation and Controls - Hidden on Chat Page */}
      {!isChatPage && (
        <div className="flex items-center gap-4">
          {/* Navigation Menu */}
          {showNavigation && (
            <div className="hidden md:flex items-center space-x-8 text-sm font-medium tracking-wide mr-8">
              {/* Chat Menu - Only visible when user is logged in */}
              {isAuthenticated && user && (
                <Link
                  href="/chat"
                  className="transition-colors duration-200 text-muted-foreground hover:text-primary"
                >
                  Chat
                </Link>
              )}

              {/* Dynamic Navigation Items */}
              {navItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className="transition-colors duration-200 text-muted-foreground hover:text-primary"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}

          {/* Authentication State */}
          {isLoading ? (
            <span className="text-sm text-muted-foreground mr-4">Loading...</span>
          ) : isAuthenticated && user && showUserProfile ? (
            <UserDropdown
              user={user}
              variant="header"
              onLogout={handleLogout}
            />
          ) : (
            <Button
              onClick={handleLogin}
              className="mr-4 btn-green-solid"
            >
              Masuk
            </Button>
          )}

          {/* Modern Theme Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              checked={mounted ? isDark : false}
              onCheckedChange={(checked) => {
                if (!mounted) return;
                const newTheme = checked ? 'dark' : 'light';
                setTheme(newTheme);
              }}
              disabled={!mounted}
              className={cn(!mounted && 'opacity-50 cursor-not-allowed')}
              aria-label={mounted ? (isDark ? 'Switch to light mode' : 'Switch to dark mode') : 'Loading theme toggle'}
            />
          </div>
        </div>
      )}
    </header>
  );
};

export default GlobalHeader;
