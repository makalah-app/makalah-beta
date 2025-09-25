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
import { ChevronDown, Settings, LogOut, Shield } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Switch } from "../ui/switch";
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

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user || !user.name) return 'U';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  // Get user's first name for display
  const getUserDisplayName = () => {
    if (!user || !user.name) return 'User';
    return user.name.split(' ')[0]; // First word only
  };

  // Get user role for display
  const getUserRole = () => {
    if (!user || !user.role) return 'Pengguna';
    const roleMap: Record<string, string> = {
      'admin': 'Admin',
      'researcher': 'Peneliti',
      'student': 'Mahasiswa'
    };
    return roleMap[user.role] || 'Pengguna';
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
  const userMenuColorTokens: React.CSSProperties & Record<string, string> = {
    '--user-menu-surface-hover': 'color-mix(in oklch, var(--primary) 14%, var(--card))',
    '--user-menu-item-hover': 'color-mix(in oklch, var(--primary) 18%, var(--background))',
    '--user-menu-item-danger': 'color-mix(in oklch, var(--destructive) 18%, var(--background))'
  };

  return (
    <header className={cn(
      'flex items-center justify-between px-6 py-4 border-b border-border bg-background z-50 relative',
      className
    )}>
      {/* Brand Section */}
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-primary text-white rounded-[3px] flex items-center justify-center font-medium text-lg" aria-hidden="true">
            M
          </div>
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
            <div style={userMenuColorTokens}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="group mr-4 flex items-center gap-3 rounded-[3px] border border-border bg-card px-3 py-2 text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--user-menu-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div
                      className="w-8 h-8 avatar-green-solid rounded-[3px] flex items-center justify-center text-sm"
                      aria-hidden="true"
                    >
                      {getUserInitials()}
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-medium text-foreground">{getUserDisplayName()}</span>
                      <span className="block text-xs text-muted-foreground">{getUserRole()}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 ml-2 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 p-2">
                  {user?.role === 'admin' && (
                    <DropdownMenuItem
                      onSelect={() => router.push('/admin')}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 focus:bg-[var(--user-menu-item-hover)] focus:text-foreground data-[highlighted]:bg-[var(--user-menu-item-hover)] data-[highlighted]:text-foreground"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Dashboard</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onSelect={() => router.push('/settings')}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 focus:bg-[var(--user-menu-item-hover)] focus:text-foreground data-[highlighted]:bg-[var(--user-menu-item-hover)] data-[highlighted]:text-foreground"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      void handleLogout();
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 focus:bg-[var(--user-menu-item-danger)] focus:text-destructive data-[highlighted]:bg-[var(--user-menu-item-danger)] data-[highlighted]:text-destructive"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
