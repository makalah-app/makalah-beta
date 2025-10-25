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
import BrandLogo from '@/components/ui/BrandLogo';
import { Button } from "../ui/button";
import { UserDropdown } from "../ui/user-dropdown";
import { useAuth, type LoginCredentials } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { MAIN_MENU_ITEMS, type MainMenuItem } from '../../constants/main-menu';
import { debugLog } from '@/lib/utils/debug-log';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "../ui/sheet";
import { PanelLeftIcon } from 'lucide-react';

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
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    try {
      debugLog('ui:header', 'state', {
        path: pathname,
        isAuthenticated,
        isLoading,
        hasUser: !!user,
        userId: user?.id || null,
      });
    } catch {}
  }, [pathname, isAuthenticated, isLoading, user?.id]);

  // Fetch app version once on mount (manual refresh via page reload)
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await fetch('/api/public/app-version');
        const result = await response.json();

        if (result.success && result.version) {
          setAppVersion(result.version);
        }
      } catch (error) {
        // Silent fail - use default version
      }
    };

    fetchVersion();
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/auth');
  };

  const handleLogin = (redirectTo?: string) => {
    // Define public pages that should redirect back after login
    const PUBLIC_PAGES = ['/', '/docs', '/tutorial', '/blog'];
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

  // Build ordered navigation: Harga, Chat, Blog, Tutorial, Dokumentasi, Tentang
  const byLabel = useMemo(() => {
    const m = new Map<string, MainMenuItem>();
    navItems.forEach((i) => m.set(i.label, i));
    return m;
  }, [navItems]);

  const orderedNav = useMemo(() => {
    const list: (MainMenuItem | 'CHAT')[] = [];
    const harga = byLabel.get('Harga');
    if (harga) list.push(harga);
    list.push('CHAT');
    const blog = byLabel.get('Blog');
    if (blog) list.push(blog);
    const tutorial = byLabel.get('Tutorial');
    if (tutorial) list.push(tutorial);
    const docs = byLabel.get('Dokumentasi');
    if (docs) list.push(docs);
    const tentang = byLabel.get('Tentang');
    if (tentang) list.push(tentang);
    return list;
  }, [byLabel]);

  const showChatLink = isAuthenticated && Boolean(user);

  const handleMobileMenuSelect = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header
      className={cn(
        'relative bg-background',
        className
      )}
    >
      {/* Scrim dihilangkan sesuai permintaan (hindari efek shadow) */}
      <div className="flex items-center justify-between px-6 pt-4 pb-6 relative z-10">
      {/* Brand Section */}
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <BrandLogo variant="white" size="sm" priority />
          <div className="flex items-center gap-2">
            {/* Theme-adaptive brand text via CSS mask (uses bg-foreground) */}
            <div
              role="img"
              aria-label="Makalah AI"
              className="h-8 md:h-8 w-[140px] bg-foreground"
              style={{
                WebkitMaskImage: 'url(/makalah_brand_text.svg)',
                maskImage: 'url(/makalah_brand_text.svg)',
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
                WebkitMaskPosition: 'left center',
                maskPosition: 'left center',
              }}
            />
            <div className="text-xs font-light text-foreground self-end">
              {appVersion ? `V. ${appVersion}` : 'Memuat...'}
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation and Controls - Hidden on Chat Page */}
      {!isChatPage && (
        <div className="flex items-center gap-2 md:gap-4">
          {showNavigation && (
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium mr-6">
              {orderedNav.map((item) => {
                if (item === 'CHAT') {
                  return showChatLink ? (
                    <NavLink key="/chat" href="/chat" label="Chat" isActive={pathname === '/chat'} />
                  ) : null;
                }
                return (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    isActive={pathname === item.href}
                  />
                );
              })}
            </nav>
          )}

          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'md:hidden h-9 w-9 [&_svg]:size-6 text-foreground hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-0',
                  !showNavigation && 'ml-2'
                )}
                aria-label="Buka menu utama"
              >
                <PanelLeftIcon className="!h-6 !w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="flex w-56 flex-col gap-5 p-6 pt-16"
              hideCloseButton={false}
              customCloseButton={
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="absolute left-6 top-6 h-9 w-9 [&_svg]:!size-6 flex items-center justify-center rounded text-foreground opacity-70 transition-all hover:opacity-100 hover:bg-accent focus:outline-none disabled:pointer-events-none"
                >
                  <PanelLeftIcon className="!h-6 !w-6" />
                  <span className="sr-only">Close</span>
                </button>
              }
            >
              <div className="flex flex-col gap-5 mt-4">
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
                      contentClassName="w-44"
                      sideOffset={0}
                      align="start"
                    />
                  </div>
                )}

                <nav className="flex flex-col gap-3 text-sm font-medium">
                  {showNavigation && orderedNav.map((item) => {
                    if (item === 'CHAT') {
                      return showChatLink ? (
                        <MobileNavItem
                          key="/chat"
                          href="/chat"
                          label="Chat"
                          isActive={pathname === '/chat'}
                          onSelect={handleMobileMenuSelect}
                        />
                      ) : null;
                    }
                    return (
                      <MobileNavItem
                        key={item.href}
                        href={item.href}
                        label={item.label}
                        isActive={pathname === item.href}
                        onSelect={handleMobileMenuSelect}
                      />
                    );
                  })}
                </nav>
              </div>
            </SheetContent>
          </Sheet>

          {isAuthenticated && user && showUserProfile ? (
            <UserDropdown
              user={user}
              variant="header"
              onLogout={handleLogout}
              className="hidden md:block"
              triggerClassName="min-w-52"
              contentClassName="min-w-52"
            />
          ) : (
            isLoading ? (
              // Skeleton placeholder: keep width stable, thin horizontal line
              <div className="hidden md:flex min-w-52 h-9 items-center">
                <div className="w-full h-[2px] bg-muted animate-pulse rounded" aria-hidden="true" />
              </div>
            ) : (
              <Button
                onClick={() => handleLogin(currentPath)}
                className="btn-green-solid hidden md:inline-flex"
              >
                Masuk
              </Button>
            )
          )}
        </div>
      )}
      </div>
      {/* Striped hairline separator (10px, sparser thin diagonal strokes) - SVG for pixel-perfect rendering */}
      <svg
        className="absolute inset-x-0 bottom-0 h-[10px] w-full opacity-30"
        aria-hidden="true"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="diagonal-stripes-header"
            x="0"
            y="0"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <line
              x1="0"
              y1="10"
              x2="10"
              y2="0"
              stroke="currentColor"
              strokeWidth="1"
              className="text-muted-foreground"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#diagonal-stripes-header)" />
      </svg>
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
      'transition-all duration-200 text-foreground hover:text-muted-foreground relative group',
      'after:content-[\'\'] after:absolute after:bottom-0 after:left-0 after:w-full after:h-px',
      'after:border-b after:border-dotted after:border-white after:transition-all after:duration-200',
      'after:scale-x-0 hover:after:scale-x-100 after:origin-left',
      'after:translate-y-[4px]', // Beri jarak proporsional antara text dan underline
      isActive && 'text-foreground'
    )}
    aria-current={isActive ? 'page' : undefined}
  >
    <span className="relative z-10">{label}</span>
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
      'flex items-center justify-start rounded px-3 py-2 text-sm font-medium transition-all duration-200 text-foreground hover:text-muted-foreground group',
      isActive && 'text-foreground'
    )}
    aria-current={isActive ? 'page' : undefined}
  >
    <span className={cn(
      'relative z-10 inline-block',
      'after:content-[\'\'] after:absolute after:bottom-0 after:left-0 after:w-full after:h-px',
      'after:border-b after:border-dotted after:border-white after:transition-all after:duration-200',
      'after:scale-x-0 group-hover:after:scale-x-100 after:origin-left',
      'after:translate-y-[4px]' // Beri jarak proporsional antara text dan underline
    )}>
      {label}
    </span>
  </Link>
);

export default GlobalHeader;
