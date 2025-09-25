'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MessageSquare, Settings, LogOut, ChevronDown } from 'lucide-react';
import { ChatContainer } from '../../src/components/chat/ChatContainer';
import { ThemeProvider } from '../../src/components/theme/ThemeProvider';
import { generateUUID } from '../../src/lib/utils/uuid-generator';
import { AuthProvider, useAuth } from '../../src/hooks/useAuth';
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
} from '../../src/components/ui/sidebar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../src/components/ui/dropdown-menu';
import { Button } from '../../src/components/ui/button';
import { Avatar, AvatarFallback } from '../../src/components/ui/avatar';

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(undefined);
  const { conversations, loading: historyLoading } = useChatHistory();

  // Initialize and track chat ID for persistence
  const initializeChatId = useCallback(() => {
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
      if (conversationId) {
        console.log(`[ChatPage] Loading existing conversation: ${conversationId}`);
        setCurrentChatId(conversationId);
        return;
      }

      // 2. Try to get chatId from URL params (for new chats)
      const urlChatId = searchParams.get('chatId');
      if (urlChatId) {
        console.log(`[ChatPage] Using chatId from URL: ${urlChatId}`);
        setCurrentChatId(urlChatId);
        return;
      }

      // 3. Try to get chatId from sessionStorage
      const sessionChatId = sessionStorage.getItem('currentChatId');
      if (sessionChatId) {
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

      // 4. Generate new chatId for new session
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
  }, [searchParams, user, setCurrentChatId]);

  useEffect(() => {
    initializeChatId();
  }, [initializeChatId]);

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
          <Sidebar className="border-r border-border">
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
              <SidebarGroup>
                <SidebarMenu>
                  <SidebarMenuItem className="border-b border-border py-2">
                    <SidebarMenuButton onClick={handleNewChat}>
                      <MessageSquare className="w-4 h-4" />
                      <span>New chat</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>

              <SidebarGroup>
                <SidebarGroupLabel>Riwayat</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {conversations.slice(0, 10).map((conversation) => (
                      <SidebarMenuItem key={conversation.id}>
                        <SidebarMenuButton onClick={() => handleConversationClick(conversation.id)}>
                          <span className="truncate">
                            {conversation.title || 'New Conversation'}
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                    {conversations.length === 0 && !historyLoading && (
                      <SidebarMenuItem>
                        <SidebarMenuButton disabled>
                          <span className="text-muted-foreground text-sm">No conversations yet</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
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
    <AuthProvider>
      <RoleBasedRoute
        requiresAuth={true}
        allowedRoles={['admin', 'researcher', 'student']}
        redirectTo="/auth"
      >
        <ChatPageContent />
      </RoleBasedRoute>
    </AuthProvider>
  );
}
