'use client';

/**
 * MakalahSidebar - Wrapper for ShadCN Sidebar dari AISDK elements
 *
 * Features:
 * - Responsive sidebar dengan mobile sheet overlay
 * - Collapsible behavior dengan keyboard shortcuts
 * - Integrates dengan existing Sidebar functionality
 * - MakalahApp theme styling compatible
 * - Maintains chat history, user menu, new chat functions
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { useChatHistory, ConversationItem } from '../../../hooks/useChatHistory';

// Import ShadCN Sidebar components dari project ui components
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

interface ArtifactItem {
  id: string;
  title: string;
  type: 'markdown' | 'outline' | 'research' | 'draft' | 'final';
  version: number;
  lastModified: number;
  size?: number;
  tags?: string[];
}

export interface MakalahSidebarProps {
  className?: string;
  isCollapsed?: boolean;
  // Navigation
  currentPath?: string;
  onNavigate?: (path: string) => void;
  // Chat
  onNewChat?: () => void;
  // Artifacts
  artifacts?: ArtifactItem[];
  onArtifactSelect?: (artifact: ArtifactItem) => void;
  // User
  user?: {
    name: string;
    email: string;
    fullName?: string;
    avatar?: string;
    role?: string;
  };
  onUserMenuAction?: (action: string) => void;
}

const USER_MENU_ACTIONS = [
  { id: 'settings', label: 'Settings', icon: '⚙️' },
  { id: 'logout', label: 'Logout', icon: '🚪' },
];

// Internal sidebar content component
const MakalahSidebarContent: React.FC<MakalahSidebarProps> = ({
  className = '',
  currentPath = '',
  onNavigate,
  onNewChat,
  artifacts = [],
  onArtifactSelect,
  user,
  onUserMenuAction,
}) => {
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['history']));
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Get chat history from database
  const { conversations, loading, error, refetch } = useChatHistory();

  // Handle conversation click - BASIC NAVIGATION
  const handleConversationClick = (conversation: ConversationItem) => {
    console.log('[MakalahSidebar] Loading conversation:', conversation.id);
    // Navigate to chat page with conversation ID
    const url = `/chat?conversationId=${conversation.id}`;
    if (onNavigate) {
      onNavigate(url);
    } else {
      router.push(url);
    }
  };

  // Handle user menu actions
  const handleUserMenuClick = (action: string) => {
    setIsUserMenuOpen(false);
    if (onUserMenuAction) {
      onUserMenuAction(action);
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (conversationId: string) => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/chat/history/${conversationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        console.log('[MakalahSidebar] ✅ Conversation deleted successfully');
        refetch(); // Refresh the conversations list
        setDeleteTarget(null);
      } else {
        const errorData = await response.json();
        setDeleteError(errorData.error || 'Failed to delete conversation');
      }
    } catch (error) {
      console.error('[MakalahSidebar] ❌ Delete error:', error);
      setDeleteError('Network error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={cn("flex h-full flex-col bg-bg-850 text-text-100", className)}>
      <SidebarHeader className="border-b border-line-600 p-4">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="w-6 h-6 bg-accent-500 rounded-[3px] flex items-center justify-center text-sm font-bold text-white hover:bg-accent-600 transition-colors"
          >
            M
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-hidden">
        {/* New Chat Button */}
        <SidebarGroup className="p-2">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onNewChat}
                  className="w-full bg-accent-500 hover:bg-accent-600 text-white font-medium"
                >
                  <span>➕</span>
                  <span>New Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Chat History */}
        <SidebarGroup className="flex-1">
          <SidebarGroupLabel>Chat History</SidebarGroupLabel>
          <SidebarGroupContent className="overflow-y-auto">
            <SidebarMenu>
              {loading && (
                <SidebarMenuItem>
                  <div className="px-3 py-2 text-text-300 text-sm">
                    Loading conversations...
                  </div>
                </SidebarMenuItem>
              )}

              {error && (
                <SidebarMenuItem>
                  <div className="px-3 py-2 text-red-400 text-sm">
                    Error loading conversations
                  </div>
                </SidebarMenuItem>
              )}

              {conversations.map((conversation) => (
                <SidebarMenuItem key={conversation.id}>
                  <SidebarMenuButton
                    onClick={() => handleConversationClick(conversation)}
                    className="group w-full justify-between hover:bg-bg-800 text-text-200 hover:text-text-100"
                  >
                    <div className="flex flex-col items-start min-w-0 flex-1">
                      <span className="text-sm font-medium truncate">
                        {conversation.title || 'Untitled'}
                      </span>
                      <span className="text-xs text-text-300 truncate">
                        {new Date(conversation.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </SidebarMenuButton>

                  <SidebarMenuAction
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(conversation.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400"
                  >
                    <span>🗑️</span>
                  </SidebarMenuAction>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer Section */}
      {user && (
        <SidebarFooter className="border-t border-line-600 p-2">
          <SidebarMenu>
            {/* Admin Dashboard - Only for Admin users */}
            {user?.role === 'Admin' && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/admin" className="text-accent-400 hover:text-accent-300">
                    <span>⚙️</span>
                    <span>Admin Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <div className="relative">
                <SidebarMenuButton
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="w-full hover:bg-bg-800"
                >
                  <div className="w-8 h-8 avatar-green-solid rounded-[3px] flex items-center justify-center text-sm font-medium">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="text-sm font-medium truncate text-text-100">
                      {user.name}
                    </span>
                    <span className="text-xs text-text-300 truncate">
                      {user.role}
                    </span>
                  </div>
                </SidebarMenuButton>

                {/* User Menu Dropdown */}
                {isUserMenuOpen && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-bg-800 border border-line-600 rounded-[3px] shadow-xl z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2">
                    {USER_MENU_ACTIONS.map((action, index) => (
                      <button
                        key={action.id}
                        onClick={() => handleUserMenuClick(action.id)}
                        className={cn(
                          "w-full px-3 py-2.5 text-left text-sm text-text-200 hover:bg-bg-700 hover:text-text-100 transition-all duration-200 flex items-center gap-3 cursor-pointer",
                          index === 0 && "rounded-t-[3px]",
                          index === USER_MENU_ACTIONS.length - 1 && "rounded-b-[3px]"
                        )}
                      >
                        <span className="text-base">{action.icon}</span>
                        <span className="font-medium">{action.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-850 border border-line-600 rounded-md p-4 max-w-sm mx-4">
            <h3 className="font-medium text-text-100 mb-2">Delete Conversation</h3>
            <p className="text-text-300 text-sm mb-4">
              Are you sure you want to delete this conversation? This action cannot be undone.
            </p>
            {deleteError && (
              <p className="text-red-400 text-sm mb-4">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 px-3 py-2 text-sm border border-line-600 rounded hover:bg-bg-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteTarget && handleDeleteConversation(deleteTarget)}
                disabled={isDeleting}
                className="flex-1 px-3 py-2 text-sm bg-red-500 hover:bg-red-600 rounded disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main wrapper that provides SidebarProvider
export const MakalahSidebar: React.FC<MakalahSidebarProps & { children?: React.ReactNode }> = ({
  children,
  ...props
}) => {
  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar
        variant="sidebar"
        collapsible="icon"
        className="bg-bg-850"
      >
        <MakalahSidebarContent {...props} />
      </Sidebar>
      {children}
    </SidebarProvider>
  );
};

// Export SidebarTrigger for use in headers
export { SidebarTrigger };

export default MakalahSidebar;