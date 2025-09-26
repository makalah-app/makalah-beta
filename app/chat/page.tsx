'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MessageSquare, Trash2, Search, MessageCircle, ChevronRight, ChevronDown } from 'lucide-react';
import { ChatContainer } from '../../src/components/chat/ChatContainer';
import { ThemeProvider } from '../../src/components/theme/ThemeProvider';
import { generateUUID } from '../../src/lib/utils/uuid-generator';
import { useAuth } from '../../src/hooks/useAuth';
import RoleBasedRoute from '../../src/components/auth/AuthRoutes';
import { useChatHistory } from '../../src/hooks/useChatHistory';

// ShadCN UI Components
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '../../src/components/ui/sidebar';
import { UserDropdown } from '../../src/components/ui/user-dropdown';
import { Input } from '../../src/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../src/components/ui/tooltip';

function MobileHeader() {
  const { openMobile } = useSidebar();

  if (openMobile) return null;

  return (
    <div className="flex md:hidden items-center justify-between p-4 border-b border-border">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary text-primary-foreground rounded-[3px] flex items-center justify-center text-sm font-semibold">
            M
          </div>
          <span className="font-semibold">Makalah AI</span>
        </div>
      </div>
    </div>
  );
}

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, isLoading } = useAuth();
  const { conversations, loading: historyLoading, loadingMore, hasMore, loadMore } = useChatHistory();
  const [searchQuery, setSearchQuery] = useState('');

  // Stable user ID reference to prevent infinite loops
  const userIdRef = useRef<string | null>(null);

  // Helper function untuk truncate judul - CLEAN & SIMPLE
  const truncateTitle = (title: string, maxLength: number = 28): string => {
    if (title.length <= maxLength) return title;
    return title.slice(0, maxLength - 3) + '...';
  };

  // ✅ PURE COMPUTATION: Calculate chatId without side effects
  // useMemo MUST be pure - no sessionStorage writes, no URL updates
  const currentChatId = useMemo(() => {
    // Priority order: conversationId > urlChatId > sessionChatId > newId
    const conversationId = searchParams.get('conversationId');
    if (conversationId) {
      console.log(`[ChatPage] Using conversation ID: ${conversationId}`);
      return conversationId;
    }

    const urlChatId = searchParams.get('chatId');
    if (urlChatId) {
      console.log(`[ChatPage] Using URL chatId: ${urlChatId}`);
      return urlChatId;
    }

    // Read-only check - no writes in useMemo
    try {
      const sessionChatId = sessionStorage.getItem('currentChatId');
      if (sessionChatId) {
        console.log(`[ChatPage] Using session chatId: ${sessionChatId}`);
        return sessionChatId;
      }
    } catch {}

    // Generate new ID but don't save yet - pure calculation
    const newChatId = generateUUID();
    console.log(`[ChatPage] Generated new chatId: ${newChatId}`);
    return newChatId;
  }, [searchParams]); // Only stable dependency

  // ✅ SIDE EFFECT: Sync chatId to sessionStorage
  useEffect(() => {
    if (!currentChatId) return;

    try {
      // Only update if different to prevent unnecessary writes
      const storedChatId = sessionStorage.getItem('currentChatId');
      if (storedChatId !== currentChatId) {
        console.log(`[ChatPage] Syncing chatId to sessionStorage: ${currentChatId}`);
        sessionStorage.setItem('currentChatId', currentChatId);
      }

      // Set current user as owner
      const currentUserId = userIdRef.current || '';
      const storedOwner = sessionStorage.getItem('currentChatOwner');
      if (storedOwner !== currentUserId) {
        sessionStorage.setItem('currentChatOwner', currentUserId);
      }
    } catch (error) {
      console.warn('[ChatPage] SessionStorage sync failed:', error);
    }
  }, [currentChatId]); // Only depend on chatId change

  // ✅ SIDE EFFECT: Handle cross-user state cleanup
  useEffect(() => {
    if (!user?.id) return;

    try {
      const storedOwner = sessionStorage.getItem('currentChatOwner');
      const currentUserId = user.id;

      // Clear chat state if user changed (cross-user leakage)
      if (storedOwner && storedOwner !== currentUserId) {
        console.log(`[ChatPage] Clearing state for user change: ${storedOwner} → ${currentUserId}`);
        sessionStorage.removeItem('currentChatId');
        sessionStorage.setItem('currentChatOwner', currentUserId);
      }
    } catch (error) {
      console.warn('[ChatPage] User state cleanup failed:', error);
    }
  }, [user?.id]); // Only when user changes

  // ✅ SIDE EFFECT: Sync chatId to URL when needed
  useEffect(() => {
    if (!currentChatId) return;

    try {
      const urlChatId = searchParams.get('chatId');
      const conversationId = searchParams.get('conversationId');

      // Only update URL if we're not in conversation mode and chatId is different
      if (!conversationId && urlChatId !== currentChatId) {
        console.log(`[ChatPage] Syncing URL with chatId: ${currentChatId}`);

        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('chatId', currentChatId);
        window.history.replaceState(null, '', newUrl.toString());
      }
    } catch (error) {
      console.warn('[ChatPage] URL sync failed:', error);
    }
  }, [currentChatId, searchParams]); // Depend on both chatId and searchParams

  // Get active conversation ID from URL - simplified (AFTER currentChatId is defined)
  const getActiveConversationId = (): string | null => {
    return searchParams.get('conversationId') || currentChatId || null;
  };

  // Filter conversations based on search query
  const filteredConversations = conversations.filter((conversation) =>
    !searchQuery ||
    (conversation.title && conversation.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group conversations by date
  const groupConversationsByDate = (conversations: typeof filteredConversations) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    const groups = {
      'Hari Ini': [] as typeof conversations,
      'Kemarin': [] as typeof conversations,
      'Minggu Ini': [] as typeof conversations,
      'Lebih Lama': [] as typeof conversations,
    };

    conversations.forEach((conversation) => {
      const lastActivity = new Date(conversation.lastActivity);
      if (lastActivity >= today) {
        groups['Hari Ini'].push(conversation);
      } else if (lastActivity >= yesterday) {
        groups['Kemarin'].push(conversation);
      } else if (lastActivity >= thisWeek) {
        groups['Minggu Ini'].push(conversation);
      } else {
        groups['Lebih Lama'].push(conversation);
      }
    });

    return groups;
  };

  const conversationGroups = groupConversationsByDate(filteredConversations);
  const activeConversationId = getActiveConversationId();

  // ✅ BROWSER STATE CLEANUP: ensure owner flag exists without clearing chatId
  useEffect(() => {
    try {
      const currentOwner = sessionStorage.getItem('currentChatOwner');
      const currentChatId = sessionStorage.getItem('currentChatId');
      const ownerCandidate = user?.id || userIdRef.current;

      if (currentChatId && !currentOwner && ownerCandidate) {
        sessionStorage.setItem('currentChatOwner', ownerCandidate);
        console.log('[ChatPage] Restored missing chat owner flag');
      }

      console.log('[ChatPage] Browser state cleanup completed');
    } catch (error) {
      console.warn('[ChatPage] SessionStorage cleanup failed:', error);
    }
  }, [user?.id]);

  // Track user ID changes with stable reference
  useEffect(() => {
    userIdRef.current = user?.id || null;
  }, [user?.id]);


  // Show loading screen while authentication is being processed
  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 animate-spin rounded-full border-2 border-border border-t-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading chat interface...</p>
        </div>
      </div>
    );
  }



  // Handle New Chat - Create fresh session with new chatId
  const handleNewChat = () => {
    console.log('[ChatPage] Creating new chat session...');

    // 1. Clear existing session
    sessionStorage.removeItem('currentChatId');
    sessionStorage.removeItem('currentChatOwner');

    // 2. Generate new ID and navigate (no setTimeout needed)
    const newChatId = generateUUID();
    console.log(`[ChatPage] Generated new chatId: ${newChatId}`);

    // 3. Navigate to new chat URL - let useMemo handle the rest
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('conversationId');
    newUrl.searchParams.set('chatId', newChatId);
    window.history.pushState(null, '', newUrl.toString());

    console.log('[ChatPage] ✅ New chat session created successfully');

    // Refresh history if available
    if ((window as any).refreshHistoryList) {
      console.log('[ChatPage] Refreshing chat history list...');
      (window as any).refreshHistoryList();
    }
  };

  // Handle delete conversation dengan confirmation
  const handleDeleteConversation = async (conversationId: string) => {
    if (!confirm('Hapus percakapan ini?')) return;

    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'X-User-Id': user?.id || '',
        },
      });

      if (response.ok) {
        // Refresh history list setelah delete
        if ((window as any).refreshChatHistory) {
          (window as any).refreshChatHistory();
        }

        // Jika current chat yang di-delete, create new chat
        if (currentChatId === conversationId) {
          handleNewChat();
        }
      }
    } catch (error) {
      console.error('[ChatPage] Failed to delete conversation:', error);
    }
  };

  // Get user initials for avatar

  // Handle conversation click
  const handleConversationClick = (conversationId: string) => {
    console.log('[ChatPage] Loading conversation:', conversationId);
    const url = `/chat?conversationId=${conversationId}`;
    router.push(url);
  };

  return (
    <ThemeProvider>
      <SidebarProvider>
        <div className="flex h-screen w-full bg-background">
          <Sidebar className="border-r border-border bg-card/30">
            <SidebarHeader className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <a href="/" className="flex items-center text-decoration-none cursor-pointer">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-[3px] flex items-center justify-center text-sm font-semibold">
                    M
                  </div>
                </a>
              </div>
            </SidebarHeader>

            <SidebarContent>
              {/* Search Bar */}
              <div className="p-4 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari percakapan..."
                    className="pl-10 border-border"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* New Chat Button */}
              <div className="pb-2 border-b border-border">
                <button
                  onClick={handleNewChat}
                  className="flex items-center gap-2 text-base md:text-sm bg-transparent hover:bg-sidebar-accent rounded-[3px] px-4 py-1 w-full h-9 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Percakapan Baru</span>
                </button>
              </div>

              {/* Conversation Groups */}
              {Object.entries(conversationGroups).map(([groupName, groupConversations]) => {
                if (groupConversations.length === 0) return null;

                return (
                  <SidebarGroup key={groupName}>
                    <SidebarGroupLabel className="text-sm font-medium tracking-wider text-muted-foreground">
                      {groupName}
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {groupConversations.map((conversation) => {
                          const isActive = activeConversationId === conversation.id;
                          const fullTitle = conversation.title || 'New Conversation';
                          const shouldShowTooltip = fullTitle.length > 39;

                          return (
                            <SidebarMenuItem key={conversation.id}>
                              <div className="flex items-center gap-1">
                                <TooltipProvider>
                                  <Tooltip delayDuration={500}>
                                    <TooltipTrigger asChild>
                                      <SidebarMenuButton
                                        onClick={() => handleConversationClick(conversation.id)}
                                        className={`flex-1 hover:bg-muted/50 rounded-[3px] ${
                                          isActive ? 'bg-muted/70 text-primary font-medium' : 'text-muted-foreground'
                                        }`}
                                      >
                                        <MessageCircle className="w-4 h-4" />
                                        <span className="truncate">
                                          {truncateTitle(fullTitle, 39)}
                                        </span>
                                        {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                                      </SidebarMenuButton>
                                    </TooltipTrigger>
                                    {shouldShowTooltip && (
                                      <TooltipContent side="right" className="max-w-xs rounded-[3px] bg-green-600 text-white">
                                        <p className="text-xs">{fullTitle}</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                                <button
                                  onClick={() => handleDeleteConversation(conversation.id)}
                                  className="opacity-0 group-hover/menu-item:opacity-100 p-1 hover:bg-destructive/10 rounded-[3px] transition-opacity"
                                  aria-label="Delete conversation"
                                >
                                  <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                                </button>
                              </div>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                );
              })}

              {/* Empty State */}
              {filteredConversations.length === 0 && !historyLoading && (
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton disabled>
                          <span className="text-muted-foreground text-sm">
                            {searchQuery ? 'No matching conversations' : 'No conversations yet'}
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}

              {/* Load More Button */}
              {!searchQuery && hasMore && filteredConversations.length > 0 && (
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={loadMore}
                          disabled={loadingMore}
                          className="w-full justify-center text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {loadingMore ? (
                            <>
                              <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                              <span>Loading...</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-2" />
                              <span>Sebelumnya</span>
                            </>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}
            </SidebarContent>

            <SidebarFooter className="p-4 border-t border-border">
              <UserDropdown
                user={user}
                variant="sidebar"
                onLogout={async () => {
                  await logout();
                  router.push('/auth');
                }}
              />
            </SidebarFooter>
          </Sidebar>

          <main className="flex-1 flex flex-col">
            {/* Mobile Header Bar - Only visible on mobile and when sidebar closed */}
            <MobileHeader />

            {/* Natural LLM Intelligence Interface - No Rigid Workflow Controls */}
            <ChatContainer
              key={currentChatId || 'default-chat'}
              chatId={currentChatId}
              debugMode={false}
              onError={(error) => {
                console.error('Chat error:', error);
              }}
            />
          </main>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}

export default function ChatPage() {
  return (
    <RoleBasedRoute
      requiresAuth={true}
      allowedRoles={['admin', 'researcher', 'student']}
      redirectTo="/auth"
    >
      <ChatPageContent />
    </RoleBasedRoute>
  );
}
