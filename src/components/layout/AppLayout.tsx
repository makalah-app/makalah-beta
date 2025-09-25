'use client';

/**
 * AppLayout - Main responsive layout component untuk chat interface
 *
 * DESIGN COMPLIANCE:
 * - 2-column desktop layout sesuai chat-page-styleguide.md (280px sidebar + main area)
 * - Mobile-responsive design dengan proper breakpoints
 * - Header/footer integration dengan consistent styling
 * - Theme-aware layout dengan proper dark/light mode support
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '../theme/ThemeProvider';

interface AppLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  // Layout configuration
  sidebarWidth?: number;
  collapsibleSidebar?: boolean;
  stickyHeader?: boolean;
  showFooter?: boolean;
  // Mobile behavior
  mobileBreakpoint?: number;
  // Percentage layout mode
  layoutMode?: 'fixed' | 'percentage';
  sidebarPercentage?: number;
  chatPageMode?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  sidebar,
  header,
  footer,
  className = '',
  sidebarWidth = 280,
  collapsibleSidebar = true,
  stickyHeader = true,
  showFooter = true,
  mobileBreakpoint = 1024, // lg breakpoint
  layoutMode = 'fixed',
  sidebarPercentage = 20,
  chatPageMode = false,
}) => {
  const { theme } = useTheme();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Check if we're in mobile view
  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < mobileBreakpoint;
      setIsMobile(mobile);

      // Close sidebar on mobile when switching to desktop
      if (!mobile) {
        setIsSidebarOpen(false);
      }
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, [mobileBreakpoint]);

  // Toggle sidebar collapse (desktop)
  const toggleSidebarCollapse = () => {
    if (!isMobile && collapsibleSidebar) {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  // Toggle sidebar open (mobile)
  const toggleSidebarOpen = () => {
    if (isMobile) {
      setIsSidebarOpen(!isSidebarOpen);
    }
  };

  // Close mobile sidebar when clicking outside
  const closeMobileSidebar = () => {
    if (isMobile && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  };

  // Calculate sidebar width based on state
  const getSidebarWidth = () => {
    if (isMobile) return sidebarWidth; // Full width for mobile overlay
    if (isSidebarCollapsed) return 64; // Collapsed width
    return sidebarWidth; // Full width
  };

  const currentSidebarWidth = getSidebarWidth();

  // Generate layout classes
  const getLayoutClasses = () => {
    const baseClasses = className;
    if (layoutMode === 'percentage') {
      const fullHeight = !header && !footer ? 'layout-fullscreen' : '';
      return `${baseClasses} layout-percentage-${sidebarPercentage}-${100 - sidebarPercentage} ${fullHeight}`.trim();
    }
    return baseClasses;
  };

  return (
    <div className={getLayoutClasses()}>
      {/* Header */}
      {header && (
        <header>
          {header}
        </header>
      )}

      {/* Percentage Layout: Direct children for grid areas */}
      {layoutMode === 'percentage' ? (
        <>
          {/* Sidebar */}
          {sidebar && (
            <aside>
              {/* Sidebar Header */}
              <div>
              </div>

              {/* Sidebar Content */}
              <div>
                <div>
                  {sidebar}
                </div>
              </div>
            </aside>
          )}

          {/* Main Content Area */}
          <main>
            {/* Main Content */}
            <div>
              {children}
            </div>
          </main>

          {/* Footer */}
          {showFooter && footer && (
            <footer>
              {footer}
            </footer>
          )}
        </>
      ) : (
        /* Fixed Layout: Original structure */
        <div>
          {/* Mobile Sidebar Overlay */}
          {isMobile && isSidebarOpen && (
            <div
              onClick={closeMobileSidebar}
            />
          )}

          {/* Sidebar */}
          {sidebar && (
            <aside>
              <div>
                <h2>Navigation</h2>
                {sidebar}
              </div>
            </aside>
          )}

          {/* Main Content Area */}
          <main>
            <div>
              {children}
            </div>
            {showFooter && footer && (
              <footer>
                {footer}
              </footer>
            )}
          </main>
        </div>
      )}
    </div>
  );
};

// Keyboard shortcuts handler
export const useLayoutKeyboardShortcuts = (
  toggleSidebar: () => void,
  closeMobileSidebar: () => void
) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // ESC to close mobile sidebar
      if (event.key === 'Escape') {
        closeMobileSidebar();
      }

      // Ctrl+B to toggle sidebar
      if (event.ctrlKey && event.key === 'b') {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, closeMobileSidebar]);
};

export default AppLayout;