'use client';

/**
 * MakalahAppLayout - Wrapper for ShadCN ResizablePanelGroup dari AISDK elements
 *
 * Features:
 * - Responsive 2-column layout dengan resizable panels
 * - Mobile-responsive dengan collapsible sidebar
 * - Theme-aware styling untuk MakalahApp design system
 * - Maintains compatibility dengan existing AppLayout props
 */

import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { useTheme } from '../../theme/ThemeProvider';

// ResizablePanelGroup removed - fixed layout without resize functionality

export interface MakalahAppLayoutProps {
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

export const MakalahAppLayout: React.FC<MakalahAppLayoutProps> = ({
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

  // Fixed sidebar width - no dynamic sizing needed

  if (isMobile) {
    // Mobile layout with overlay sidebar
    return (
      <div className={cn(
        "min-h-screen flex flex-col bg-bg-900 text-text-100",
        "transition-colors duration-200",
        className
      )}>
        {/* Mobile Header */}
        {header && (
          <header className={cn(
            "sticky top-0 z-40 bg-bg-900/80 backdrop-blur-sm border-b border-line-600",
            stickyHeader && "sticky"
          )}>
            {header}
          </header>
        )}

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/50 lg:hidden"
              onClick={closeMobileSidebar}
            />
            <div className="fixed left-0 top-0 bottom-0 z-50 w-64 bg-bg-850 border-r border-line-600 lg:hidden">
              {sidebar}
            </div>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>

        {/* Footer */}
        {showFooter && footer && (
          <footer className="border-t border-line-600 bg-bg-850">
            {footer}
          </footer>
        )}
      </div>
    );
  }

  // Desktop layout with ResizablePanelGroup
  return (
    <div className={cn(
      "min-h-screen flex flex-col bg-bg-900 text-text-100",
      "transition-colors duration-200",
      className
    )}>
      {/* Desktop Header */}
      {header && (
        <header className={cn(
          "z-40 bg-bg-900/80 backdrop-blur-sm border-b border-line-600",
          stickyHeader && "sticky top-0"
        )}>
          {header}
        </header>
      )}

      {/* Main Layout with Fixed Flexbox */}
      <div className="flex-1 overflow-hidden flex gap-0">
        {/* Sidebar Panel - Fixed Width */}
        {sidebar && !isSidebarCollapsed && (
          <div className="w-64 bg-bg-850 flex-shrink-0 m-0 p-0">
            {sidebar}
          </div>
        )}

        {/* Main Content Panel - Takes Remaining Space */}
        <div className="flex-1 bg-bg-900 overflow-hidden m-0 p-0">
          {children}
        </div>
      </div>

      {/* Footer */}
      {showFooter && footer && (
        <footer className="border-t border-line-600 bg-bg-850">
          {footer}
        </footer>
      )}

      {/* Sidebar Toggle Button */}
      {collapsibleSidebar && sidebar && (
        <button
          onClick={toggleSidebarCollapse}
          className={cn(
            "fixed left-4 top-4 z-30 p-2 rounded",
            "bg-bg-850 border border-line-600",
            "hover:bg-bg-800 transition-colors",
            "lg:hidden" // Only show on desktop when sidebar is present
          )}
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isSidebarCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default MakalahAppLayout;
