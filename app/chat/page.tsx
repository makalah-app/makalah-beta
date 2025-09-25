'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MessageSquare, Settings, LogOut, ChevronDown, Trash2, Search, MessageCircle, ChevronRight } from 'lucide-react';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../src/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '../../src/components/ui/avatar';
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
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(undefined);
  const { conversations, loading: historyLoading, loadingMore, hasMore, loadMore } = useChatHistory();
  const [searchQuery, setSearchQuery] = useState('');

  // Helper function untuk truncate judul - CLEAN & SIMPLE
  const truncateTitle = (title: string, maxLength: number = 28): string => {
    if (title.length <= maxLength) return title;
    return title.slice(0, maxLength - 3) + '...';
  };

  // Get active conversation ID from URL
  const getActiveConversationId = (): string | null => {
    const conversationId = searchParams.get('conversationId');
    if (conversationId) return conversationId;
    return currentChatId || null;
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

  // ✅ CRITICAL FIX: Initialize chat ID with stable dependencies - REMOVE currentChatId from deps to prevent loop
  useEffect(() => {
    const initializeChatId = () => {
      // Reset cross-user leakage: if stored owner != current user, reset chatId
      try {
        const storedOwner = sessionStorage.getItem('currentChatOwner');
        const currentUserId = (user as any)?.id || null;
        if (currentUserId && storedOwner !== currentUserId) {
          sessionStorage.removeItem('currentChatId');
        }
      } catch {}

      // 1. Try to get conversationId from URL (for loading existing conversations)
      const conversationId = searchParams.get('conversationId');
      if (conversationId && conversationId !== currentChatId) {
        console.log(`[ChatPage] Loading existing conversation: ${conversationId}`);
        setCurrentChatId(conversationId);
        return;
      }

      // 2. Try to get chatId from URL params (for new chats)
      const urlChatId = searchParams.get('chatId');
      if (urlChatId && urlChatId !== currentChatId) {
        console.log(`[ChatPage] Using chatId from URL: ${urlChatId}`);
        setCurrentChatId(urlChatId);
        return;
      }

      // 3. Try to get chatId from sessionStorage
      const sessionChatId = sessionStorage.getItem('currentChatId');
      if (sessionChatId && sessionChatId !== currentChatId) {
        console.log(`[ChatPage] Using chatId from session: ${sessionChatId}`);
        setCurrentChatId(sessionChatId);
        // Update URL to reflect current chat
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('chatId', sessionChatId);
        window.history.replaceState(null, '', newUrl.toString());
        // Ensure owner is set to current user
        try {
          const currentUserId = (user as any)?.id || '';
          sessionStorage.setItem('currentChatOwner', currentUserId);
        } catch {}
        return;
      }

      // 4. Generate new chatId for new session (only if no current ID)
      if (!currentChatId) {
        const newChatId = generateUUID();
        console.log(`[ChatPage] Generated new chatId: ${newChatId}`);
        setCurrentChatId(newChatId);

        // Save to sessionStorage and update URL
        sessionStorage.setItem('currentChatId', newChatId);
        try {
          const currentUserId = (user as any)?.id || '';
          sessionStorage.setItem('currentChatOwner', currentUserId);
        } catch {}
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('chatId', newChatId);
        window.history.replaceState(null, '', newUrl.toString());
      }
    };

    initializeChatId();
  }, [searchParams, user?.id]); // ✅ CRITICAL FIX: Removed currentChatId to break infinite dependency loop

  // Show loading screen while authentication is being processed
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 animate-spin rounded-full border-2 border-border border-t-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading chat interface...</p>
        </div>
      </div>
    );
  }

  const handleUserMenuAction = async (action: string) => {
    console.log('User menu action:', action);
    
    if (action === 'logout') {
      try {
        console.log('[ChatPage] Logging out user...');
        await logout();
        console.log('[ChatPage] ✅ Logout successful, redirecting to auth page');
        router.push('/auth');
      } catch (error) {
        console.error('[ChatPage] ❌ Logout error:', error);
        // Still redirect to auth page even if logout fails
        router.push('/auth');
      }
    } else if (action === 'settings') {
      console.log('[ChatPage] Navigating to settings...');
      router.push('/settings');
    } else {
      console.log('[ChatPage] Unknown user menu action:', action);
    }
  };


  // Handle New Chat - Create fresh session with new chatId
  const handleNewChat = () => {
    console.log('[ChatPage] Creating new chat session...');

    // 1. Clear existing session completely
    sessionStorage.removeItem('currentChatId');
    sessionStorage.removeItem('currentChatOwner');

    // 2. Force unmount first (critical for clean reset)
    setCurrentChatId(undefined);

    // 3. Generate new ID
    const newChatId = generateUUID();
    console.log(`[ChatPage] Generated new chatId: ${newChatId}`);

    // 4. Set new chat after micro-delay (ensures unmount completes)
    setTimeout(() => {
      setCurrentChatId(newChatId);
      sessionStorage.setItem('currentChatId', newChatId);

      // Update URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('conversationId'); // Clear old conversation
      newUrl.searchParams.set('chatId', newChatId);
      window.history.pushState(null, '', newUrl.toString());

      console.log('[ChatPage] ✅ New chat session created successfully');

      // Refresh history if available
      if ((window as any).refreshHistoryList) {
        console.log('[ChatPage] Refreshing chat history list...');
        (window as any).refreshHistoryList();
      }
    }, 50); // 50ms delay - enough for React to process unmount
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
  const getUserInitials = () => {
    if (!user || !user.fullName) return 'U';
    const names = user.fullName.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

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
              <SidebarGroup>
                <SidebarMenu>
                  <SidebarMenuItem className="border-b border-border py-2">
                    <SidebarMenuButton onClick={handleNewChat} className="text-sm">
                      <MessageSquare className="w-4 h-4" />
                      <span>Percakapan Baru</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>

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
              <SidebarMenu>
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton className="w-full justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="avatar-green-solid text-white text-sm font-semibold">
                              {getUserInitials()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-left">
                            <span className="block text-sm font-medium text-foreground">
                              {user?.fullName || user?.email || 'User'}
                            </span>
                          </div>
                        </div>
                        <ChevronDown className="w-4 h-4 transition-transform duration-200 text-muted-foreground" />
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top" align="start" className="w-56">
                      <DropdownMenuItem onClick={() => handleUserMenuAction('settings')}>
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUserMenuAction('logout')}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>

          <main className="flex-1 flex flex-col">
            {/* Mobile Header Bar - Only visible on mobile and when sidebar closed */}
            <MobileHeader />

            {/* Natural LLM Intelligence Interface - No Rigid Workflow Controls */}
            <ChatContainer
              key={currentChatId}
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
