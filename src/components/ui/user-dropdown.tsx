"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Settings, LogOut, Shield } from 'lucide-react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from './dropdown-menu';
import { SidebarMenuButton, SidebarMenu, SidebarMenuItem } from './sidebar';
import { UserAvatar } from './user-avatar';
import { getUserInitials, getUserDisplayName, getUserRole } from '@/lib/utils/user-helpers';
import { cn } from '@/lib/utils';
import type { User } from '@/hooks/useAuth';

export interface UserDropdownProps {
  user: User | null;
  variant?: 'header' | 'sidebar';
  onLogout: () => void | Promise<void>;
  className?: string;
  showRole?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
  sideOffset?: number;
  align?: 'start' | 'center' | 'end';
}

export const UserDropdown: React.FC<UserDropdownProps> = ({
  user,
  variant = 'header',
  onLogout,
  className,
  showRole = true,
  triggerClassName,
  contentClassName,
  sideOffset = 0,
  align = 'end'
}) => {
  const router = useRouter();

  if (!user) return null;

  const handleLogout = async () => {
    await onLogout();
  };

  const handleDashboard = () => {
    router.push('/admin');
  };

  const handleSettings = () => {
    router.push('/settings');
  };

  // Color tokens for header variant (matching GlobalHeader)
  const userMenuColorTokens: React.CSSProperties & Record<string, string> = {
    '--user-menu-surface-hover': 'color-mix(in oklch, var(--primary) 14%, var(--card))',
    '--user-menu-item-hover': 'color-mix(in oklch, var(--primary) 8%, var(--popover))',
    '--user-menu-item-danger': 'color-mix(in oklch, var(--destructive) 8%, var(--popover))',
  };

  const renderMenuItems = () => (
    <>
      {(user.role === 'superadmin' || user.role === 'admin') && (
        <DropdownMenuItem
          onSelect={handleDashboard}
          className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 focus:bg-[var(--user-menu-item-hover)] focus:text-foreground data-[highlighted]:bg-[var(--user-menu-item-hover)] data-[highlighted]:text-foreground"
        >
          <Shield className="w-4 h-4" />
          <span>Dashboard</span>
        </DropdownMenuItem>
      )}
      <DropdownMenuItem
        onSelect={handleSettings}
        className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 focus:bg-[var(--user-menu-item-hover)] focus:text-foreground data-[highlighted]:bg-[var(--user-menu-item-hover)] data-[highlighted]:text-foreground"
      >
        <Settings className="w-4 h-4" />
        <span>Settings</span>
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={handleLogout}
        className="logout-item flex items-center gap-3 px-3 py-2 text-sm transition-colors duration-150"
      >
        <LogOut className="w-4 h-4" />
        <span>Logout</span>
      </DropdownMenuItem>
    </>
  );

  if (variant === 'sidebar') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={cn("flex w-full items-center justify-between gap-3 rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2", className, triggerClassName)}>
            <div className="flex items-center gap-3">
              <UserAvatar
                initials={getUserInitials(user)}
                size="md"
              />
              <div className="text-left">
                <span className="block text-sm font-medium text-foreground">
                  {getUserDisplayName(user)}
                </span>
                {showRole && (
                  <span className="block text-xs text-muted-foreground">
                    {getUserRole(user)}
                  </span>
                )}
              </div>
            </div>
            <ChevronDown className="w-4 h-4 transition-transform duration-200 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" sideOffset={sideOffset} className={cn("w-56", contentClassName)}>
          {renderMenuItems()}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Header variant
  return (
    <div style={userMenuColorTokens} className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "group mr-4 flex items-center justify-between gap-3 rounded-[3px] border border-border bg-card px-3 py-2 text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--user-menu-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              triggerClassName
            )}
          >
            <div className="flex items-center gap-3">
              <UserAvatar
                initials={getUserInitials(user)}
                size="md"
              />
              <div className="text-left">
                <span className="block text-sm font-medium text-foreground">
                  {getUserDisplayName(user)}
                </span>
                {showRole && (
                  <span className="block text-xs text-muted-foreground">
                    {getUserRole(user)}
                  </span>
                )}
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} sideOffset={sideOffset} className={contentClassName ? cn("p-2", contentClassName) : "w-52 p-2"}>
          {renderMenuItems()}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
