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

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from "../ui/button";
import { UserDropdown } from "../ui/user-dropdown";
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { MAIN_MENU_ITEMS, type MainMenuItem } from '../../constants/main-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "../ui/sheet";
import { ViewVerticalIcon } from '@radix-ui/react-icons';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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

  // Default navigation items
  const navItems: MainMenuItem[] = useMemo(
    () => customNavItems ?? MAIN_MENU_ITEMS,
    [customNavItems]
  );

  const showChatLink = isAuthenticated && Boolean(user);

  const handleMobileMenuSelect = () => {
    setIsMobileMenuOpen(false);
  };

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
          <div className="flex flex-col">
            <div className="text-xl font-medium text-foreground">Makalah AI</div>
            <div className="text-xs font-light text-muted-foreground mt-0.5">Versi Beta 0.1</div>
          </div>
        </Link>
      </div>

      {/* Navigation and Controls - Hidden on Chat Page */}
      {!isChatPage && (
        <div className="flex items-center gap-2 md:gap-4">
          {showNavigation && (
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium tracking-wide mr-6">
              {showChatLink && (
                <NavLink href="/chat" label="Chat" isActive={pathname === '/chat'} />
              )}
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  isActive={pathname === item.href}
                />
              ))}
            </nav>
          )}

          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn('md:hidden h-12 w-12 rounded-[3px] border border-border text-muted-foreground hover:text-primary', !showNavigation && 'ml-2')}
                aria-label="Buka menu utama"
              >
                <ViewVerticalIcon className="h-9 w-9" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="flex w-56 flex-col gap-5 p-6 pt-16 [&>button[data-radix-dialog-close]]:top-10 [&>button[data-radix-dialog-close]]:right-8"
            >
              <div className="flex flex-col gap-5">
                {!isLoading && !isAuthenticated && (
                  <Button
                    className="btn-green-solid w-full justify-center"
                    onClick={() => {
                      handleMobileMenuSelect();
                      handleLogin();
                    }}
                  >
                    Masuk
                  </Button>
                )}

                {!isLoading && isAuthenticated && user && showUserProfile && (
                  <div className="md:hidden">
                    <UserDropdown
                      user={user}
                      variant="header"
                      onLogout={async () => {
                        await handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full"
                      triggerClassName="mr-0 w-full justify-between"
                      contentClassName="w-full min-w-full max-w-full"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-3 text-sm font-medium">
                  {showChatLink && (
                    <MobileNavItem
                      href="/chat"
                      label="Chat"
                      isActive={pathname === '/chat'}
                    onSelect={handleMobileMenuSelect}
                  />
                )}
                {showNavigation && navItems.map((item) => (
                  <MobileNavItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    isActive={pathname === item.href}
                    onSelect={handleMobileMenuSelect}
                  />
                ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {isLoading ? (
            <span className="text-sm text-muted-foreground mr-2 md:mr-4">Loading...</span>
          ) : isAuthenticated && user && showUserProfile ? (
            <UserDropdown
              user={user}
              variant="header"
              onLogout={handleLogout}
              className="hidden md:block"
            />
          ) : (
            <Button
              onClick={handleLogin}
              className="btn-green-solid hidden md:inline-flex"
            >
              Masuk
            </Button>
          )}
        </div>
      )}
    </header>
  );
};

interface NavLinkProps {
  href: string;
  label: string;
  isActive: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ href, label, isActive }) => (
  <Link
    href={href}
    className={cn(
      'transition-colors duration-200 text-muted-foreground hover:text-primary',
      isActive && 'text-primary'
    )}
    aria-current={isActive ? 'page' : undefined}
  >
    {label}
  </Link>
);

interface MobileNavItemProps extends NavLinkProps {
  onSelect: () => void;
}

const MobileNavItem: React.FC<MobileNavItemProps> = ({ href, label, isActive, onSelect }) => (
  <Link
    href={href}
    onClick={onSelect}
    className={cn(
      'flex items-center justify-between rounded-[3px] px-3 py-2 text-base transition-colors duration-200',
      isActive ? 'bg-accent text-primary' : 'text-muted-foreground hover:bg-accent/60 hover:text-primary'
    )}
    aria-current={isActive ? 'page' : undefined}
  >
    <span>{label}</span>
  </Link>
);

export default GlobalHeader;
