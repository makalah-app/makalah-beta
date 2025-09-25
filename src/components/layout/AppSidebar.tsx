'use client';

/**
 * AppSidebar - Reusable sidebar component for MakalahApp
 *
 * FEATURES:
 * - Configurable header, content, and footer
 * - Flexible width options (w-64, w-80, custom)
 * - ShadCN/UI compliant with built-in responsive behavior
 * - Optional sidebar trigger for mobile
 * - Type-safe prop configuration
 *
 * USAGE:
 * - Chat page: Logo header + chat history content + user profile footer
 * - Documentation page: Search header + navigation content + no footer
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

export interface AppSidebarProps {
  // Layout props
  width?: string; // default "w-64", can override to "w-80" etc
  variant?: 'default' | 'compact';

  // Content props
  header?: React.ReactNode;
  children?: React.ReactNode; // Main content
  footer?: React.ReactNode;

  // Behavior props
  defaultOpen?: boolean;
  collapsible?: boolean;
  showTrigger?: boolean;
  triggerTitle?: string;

  // Style props
  className?: string;

  // Layout props for main content
  mainContent?: React.ReactNode;
  mainClassName?: string;

  // Header coexistence props
  hasGlobalHeader?: boolean; // default false, set true if page has GlobalHeader
  headerHeight?: string; // default "h-16", height of global header
}

export function AppSidebar({
  width = "w-64",
  variant = "default",
  header,
  children,
  footer,
  defaultOpen = true,
  collapsible = true,
  showTrigger = true,
  triggerTitle,
  className,
  mainContent,
  mainClassName,
  hasGlobalHeader = false,
  headerHeight = "h-16",
}: AppSidebarProps) {
  // Calculate container classes based on global header presence
  const containerClasses = hasGlobalHeader
    ? "flex w-full h-full" // Work within global layout - no viewport calculations needed
    : "flex h-screen w-full"; // Standalone mode for pages like chat

  // Calculate z-index - simpler when working within global layout
  const sidebarZIndex = hasGlobalHeader ? "z-10" : "z-40";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <div className={containerClasses}>
        <Sidebar
          className={cn(
            width,
            "border-r border-border",
            variant === 'compact' && "w-16",
            hasGlobalHeader && sidebarZIndex,
            className
          )}
          collapsible={collapsible ? "icon" : "none"}
        >
          {header && (
            <SidebarHeader className="border-b">
              {header}
            </SidebarHeader>
          )}

          <SidebarContent>
            {children}
          </SidebarContent>

          {footer && (
            <SidebarFooter className="border-t">
              {footer}
            </SidebarFooter>
          )}
        </Sidebar>

        {mainContent && (
          <SidebarInset>
            {showTrigger && (
              <header className="flex h-16 items-center border-b px-6">
                <SidebarTrigger className="-ml-1" />
                {triggerTitle && (
                  <>
                    <Separator
                      orientation="vertical"
                      className="mr-2 data-[orientation=vertical]:h-4"
                    />
                    <h1 className="text-xl font-semibold">{triggerTitle}</h1>
                  </>
                )}
              </header>
            )}

            <div className={cn("flex-1 overflow-auto", mainClassName)}>
              {mainContent}
            </div>
          </SidebarInset>
        )}
      </div>
    </SidebarProvider>
  );
}

export default AppSidebar;