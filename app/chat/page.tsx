'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  useLayoutEffect,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import BrandLogo from '@/components/ui/BrandLogo';
import { MessageSquare, Trash2, Search, MessageCircle, ChevronRight, ChevronDown, RefreshCw, Pencil } from 'lucide-react';
import { ChatContainer } from '../../src/components/chat/ChatContainer';
import { ThemeProvider } from '../../src/components/theme/ThemeProvider';
import { generateUUID } from '../../src/lib/utils/uuid-generator';
import { useAuth } from '../../src/hooks/useAuth';
import { useChatHistory } from '../../src/hooks/useChatHistory';
import type { ConversationItem } from '../../src/hooks/useChatHistory';

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
import { DeleteConversationDialog } from '../../src/components/chat/DeleteConversationDialog';
import { useInlineEdit } from '../../src/hooks/useInlineEdit';
import { updateConversationTitle } from '../../src/lib/api/conversations';
import { useToast } from '../../src/hooks/use-toast';

function MobileHeader() {
  const { openMobile } = useSidebar();

  if (openMobile) return null;

  return (
    <div className="flex md:hidden items-center justify-between p-4 border-b border-border">
      <SidebarTrigger />
    </div>
  );
}

// Wrapper component for new chat button with sidebar context access
function SidebarNewChatButton({ onNewChat }: { onNewChat: () => void }) {
  const { setOpenMobile } = useSidebar();

  const handleClick = () => {
    onNewChat();
    // Auto-close sidebar on mobile
    setOpenMobile(false);
  };

  return (
    <div className="pb-2 border-b border-border">
      <button
        onClick={handleClick}
        className="flex items-center gap-2 text-base md:text-sm bg-transparent hover:bg-sidebar-accent rounded px-4 py-1 w-full h-9 transition-colors"
      >
        <MessageSquare className="w-4 h-4" />
        <span>Percakapan Baru</span>
      </button>
    </div>
  );
}

// Wrapper component for conversation item with sidebar context access
function SidebarConversationItem({
  conversation,
  isActive,
  truncatedTitle,
  fullTitle,
  onSelect,
  onDelete,
  onTitleUpdate,
}: ConversationHistoryItemProps) {
  const { setOpenMobile } = useSidebar();

  const handleSelect = (conversationId: string) => {
    onSelect(conversationId);
    // Auto-close sidebar on mobile after selecting chat
    setOpenMobile(false);
  };

  return (
    <ConversationHistoryItem
      conversation={conversation}
      isActive={isActive}
      truncatedTitle={truncatedTitle}
      fullTitle={fullTitle}
      onSelect={handleSelect}
      onDelete={onDelete}
      onTitleUpdate={onTitleUpdate}
    />
  );
}

const useIsTextTruncated = (
  ref: React.RefObject<HTMLElement>,
  deps: React.DependencyList = []
) => {
  const [isTruncated, setIsTruncated] = useState(false);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const update = () => {
      const el = ref.current;
      if (!el) return;
      const horizontalOverflow = el.scrollWidth - el.clientWidth > 1;
      const verticalOverflow = el.scrollHeight - el.clientHeight > 1;
      setIsTruncated(horizontalOverflow || verticalOverflow);
    };

    update();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(update);
      resizeObserver.observe(node);
    }

    window.addEventListener('resize', update);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [ref, ...deps]);

  return isTruncated;
};

interface ConversationHistoryItemProps {
  conversation: ConversationItem;
  isActive: boolean;
  truncatedTitle: string;
  fullTitle: string;
  onSelect: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
  onTitleUpdate?: () => void;
}

const ConversationHistoryItem: React.FC<ConversationHistoryItemProps> = ({
  conversation,
  isActive,
  truncatedTitle,
  fullTitle,
  onSelect,
  onDelete,
  onTitleUpdate,
}) => {
  const titleRef = useRef<HTMLSpanElement>(null);
  const { toast } = useToast();

  // Inline edit hook
  const {
    value,
    isEditing,
    isSaving,
    inputRef,
    startEdit,
    setValue,
    handleKeyDown,
    handleBlur
  } = useInlineEdit({
    initialValue: fullTitle,
    onSave: async (newTitle) => {
      const result = await updateConversationTitle(conversation.id, newTitle);

      if (result.success) {
        toast({
          title: 'Judul diperbarui',
          description: 'Judul percakapan berhasil diubah.'
        });

        // Trigger refresh chat history
        if (typeof window !== 'undefined' && (window as any).refreshChatHistory) {
          (window as any).refreshChatHistory();
        }

        // Notify parent untuk local update
        onTitleUpdate?.();

        return true;
      } else {
        toast({
          variant: 'destructive',
          title: 'Gagal memperbarui judul',
          description: result.error || 'Terjadi kesalahan saat menyimpan.'
        });
        return false;
      }
    }
  });

  // Always show tooltip for consistent UX
  const shouldShowTooltip = true;

  // Handle double-click untuk start edit
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    startEdit();
  };

  return (
    <SidebarMenuItem>
      <div className="group/menu-item flex items-center gap-1">
        {isEditing ? (
          // Edit Mode
          <div className="flex-1 px-2">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              disabled={isSaving}
              maxLength={100}
              className="w-full bg-background border-[0.5px] border-primary/60 rounded px-2 py-1 text-sm focus:outline-none focus:border-primary disabled:opacity-50"
              placeholder="Untitled Chat"
            />
          </div>
        ) : (
          // Display Mode
          <TooltipProvider>
            <Tooltip delayDuration={500}>
              <TooltipTrigger asChild>
                <SidebarMenuButton
                  onClick={() => onSelect(conversation.id)}
                  onDoubleClick={handleDoubleClick}
                          className={`flex-1 hover:bg-muted/50 rounded ${
                    isActive ? 'bg-muted/70 text-success-600 font-medium' : 'text-muted-foreground'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span ref={titleRef} className="truncate">
                    {truncatedTitle}
                  </span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto text-success-600" />}
                </SidebarMenuButton>
              </TooltipTrigger>
              {shouldShowTooltip && (
                <TooltipContent
                  side="top"
                  align="center"
                  className="max-w-xs"
                >
                  <p>{fullTitle}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}

        {!isEditing && (
          <div className="flex items-center gap-1 pr-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                startEdit();
              }}
              className="opacity-0 group-hover/menu-item:opacity-100 p-1 hover:bg-muted/20 rounded transition-opacity"
              aria-label="Rename conversation"
            >
              <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conversation.id);
              }}
              className="opacity-0 group-hover/menu-item:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
              aria-label="Delete conversation"
            >
              <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        )}
      </div>
    </SidebarMenuItem>
  );
};

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, isLoading, isAuthenticated } = useAuth();
  const { conversations, loading: historyLoading, loadingMore, hasMore, loadMore, refetch: refreshChatHistory } = useChatHistory();
  const [searchQuery, setSearchQuery] = useState('');

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<ConversationItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Stable user ID reference to prevent infinite loops
  const userIdRef = useRef<string | null>(null);

  // ✅ PROGRESSIVE AUTH: Non-blocking redirect for unauthenticated users
  // Trust middleware + useAuth hook for session management (no custom monitoring needed)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      router.replace(`/auth?returnUrl=${returnUrl}`);
    }
  }, [isLoading, isAuthenticated, router]);

  // Helper function untuk truncate judul - CLEAN & SIMPLE
  const truncateTitle = (title: string, maxLength: number = 28): string => {
    if (title.length <= maxLength) return title;
    return title.slice(0, maxLength - 3) + '...';
  };

  // ✅ SIMPLE COMPUTATION: Calculate chatId without over-engineering
  const currentChatId = useMemo(() => {
    // Check both parameters for backward compatibility - simple approach
    const urlChatId = searchParams.get('chatId') || searchParams.get('conversationId');
    if (urlChatId) {
      return urlChatId;
    }

    // Session fallback
    try {
      const sessionChatId = sessionStorage.getItem('currentChatId');
      if (sessionChatId) {
        return sessionChatId;
      }
    } catch {}

    // Generate new
    const newChatId = generateUUID();
    return newChatId;
  }, [searchParams]);

  // ✅ SIDE EFFECT: Sync chatId to sessionStorage
  useEffect(() => {
    if (!currentChatId) return;

    try {
      // Only update if different to prevent unnecessary writes
      const storedChatId = sessionStorage.getItem('currentChatId');
      if (storedChatId !== currentChatId) {
        sessionStorage.setItem('currentChatId', currentChatId);
      }

      // Set current user as owner
      const currentUserId = userIdRef.current || '';
      const storedOwner = sessionStorage.getItem('currentChatOwner');
      if (storedOwner !== currentUserId) {
        sessionStorage.setItem('currentChatOwner', currentUserId);
      }
    } catch (error) {
      // Silent fail - sessionStorage not critical
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
        sessionStorage.removeItem('currentChatId');
        sessionStorage.setItem('currentChatOwner', currentUserId);
      }
    } catch (error) {
      // Silent fail
    }
  }, [user?.id]); // Only when user changes

  // ✅ SIDE EFFECT: Sync chatId to URL when needed
  useEffect(() => {
    if (!currentChatId) return;

    try {
      const urlChatId = searchParams.get('chatId');

      // Only update URL if chatId is different (no special conversationId handling)
      if (urlChatId !== currentChatId) {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('chatId', currentChatId);
        newUrl.searchParams.delete('conversationId'); // Clean up old parameter
        window.history.replaceState(null, '', newUrl.toString());
      }
    } catch (error) {
      // Silent fail
    }
  }, [currentChatId, searchParams]); // Depend on both chatId and searchParams

  
  // Get active conversation ID from URL - UNIFIED (AFTER currentChatId is defined)
  const getActiveConversationId = (): string | null => {
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

  // ✅ BROWSER STATE CLEANUP: ensure owner flag exists without clearing chatId
  useEffect(() => {
    try {
      const currentOwner = sessionStorage.getItem('currentChatOwner');
      const currentChatId = sessionStorage.getItem('currentChatId');
      const ownerCandidate = user?.id || userIdRef.current;

      if (currentChatId && !currentOwner && ownerCandidate) {
        sessionStorage.setItem('currentChatOwner', ownerCandidate);
      }
    } catch (error) {
      // Silent fail
    }
  }, [user?.id]);

  // Track user ID changes with stable reference
  useEffect(() => {
    userIdRef.current = user?.id || null;
  }, [user?.id]);


  // Remove full-screen loading overlay to avoid double loaders; rely on inline loader in ChatContainer



  // Handle New Chat - Create fresh session with new chatId
  const handleNewChat = () => {
    // 1. Clear existing session
    sessionStorage.removeItem('currentChatId');
    sessionStorage.removeItem('currentChatOwner');

    // 2. Generate new ID and navigate (no setTimeout needed)
    const newChatId = generateUUID();

    // 3. Navigate to new chat URL - let useMemo handle the rest
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('conversationId');
    newUrl.searchParams.set('chatId', newChatId);
    window.history.pushState(null, '', newUrl.toString());

    // Refresh history if available
    if ((window as any).refreshHistoryList) {
      (window as any).refreshHistoryList();
    }
  };

  // Handle delete conversation dengan confirmation
  const handleDeleteConversation = (conversationId: string) => {
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (conversation) {
      setConversationToDelete(conversation);
      setDeleteDialogOpen(true);
    }
  };

  // Handle actual delete after confirmation
  const handleConfirmDelete = async () => {
    if (!conversationToDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/chat/conversations/${conversationToDelete.id}`, {
        method: 'DELETE',
        headers: {},
      });

      if (response.ok) {
        // Refresh history list setelah delete
        if ((window as any).refreshChatHistory) {
          (window as any).refreshChatHistory();
        }

        // Jika current chat yang di-delete, create new chat
        if (currentChatId === conversationToDelete.id) {
          handleNewChat();
        }

        // Close dialog and reset state
        setDeleteDialogOpen(false);
        setConversationToDelete(null);
      }
    } catch (error) {
      // Silent fail - user can retry
    } finally {
      setIsDeleting(false);
    }
  };

  // Get user initials for avatar

  // Handle conversation click - UNIFIED PARAMETER SYSTEM
  const handleConversationClick = (conversationId: string) => {
    const url = `/chat?chatId=${conversationId}`;
    router.push(url);
  };

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      
      <SidebarProvider>
        <div className="flex h-screen w-full bg-chat-background">
          <Sidebar className="border-r border-border bg-sidebar">
            <SidebarHeader className="p-4 border-b border-border">
              <Link
                href="/"
                className="flex items-start gap-3 hover:opacity-90 transition-opacity"
              >
                <BrandLogo variant="white" size="xs" priority />
                <div className="flex flex-col">
                  {/* Theme-adaptive brand text via CSS mask (uses bg-foreground) */}
                  <div
                    role="img"
                    aria-label="Makalah AI"
                    className="h-6 w-[120px] bg-foreground"
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
                </div>
              </Link>
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
              <SidebarNewChatButton onNewChat={handleNewChat} />

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
                          const truncated = truncateTitle(fullTitle, 39);

                          return (
                            <SidebarConversationItem
                              key={conversation.id}
                              conversation={conversation}
                              isActive={isActive}
                              fullTitle={fullTitle}
                              truncatedTitle={truncated}
                              onSelect={handleConversationClick}
                              onDelete={handleDeleteConversation}
                            />
                          );
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                );
              })}

              {/* Empty State with Retry */}
              {filteredConversations.length === 0 && !historyLoading && (
                <SidebarGroup>
                  <SidebarGroupContent>
                    <div className="flex flex-col items-center justify-center p-4 space-y-3">
                      <p className="text-muted-foreground text-sm text-center">
                        {searchQuery ? 'No matching conversations' : 'No conversations yet'}
                      </p>
                      {!searchQuery && (
                        <button
                          onClick={() => refreshChatHistory()}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Refresh
                        </button>
                      )}
                    </div>
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

            <SidebarFooter className="p-0 border-t border-border">
              <UserDropdown
                user={user}
                variant="sidebar"
                onLogout={async () => {
                  await logout();
                  router.push('/auth');
                }}
                className="p-4"
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
              onError={() => {
                // Silent error handling
              }}
            />
          </main>
        </div>
      </SidebarProvider>

      {/* Delete Conversation Confirmation Dialog */}
      <DeleteConversationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        conversationTitle={conversationToDelete?.title || undefined}
      />
    </ThemeProvider>
  );
}

// ✅ PROGRESSIVE RENDERING: Remove RoleBasedRoute blocking wrapper
// Auth protection moved inside ChatPageContent with progressive UX
export default function ChatPage() {
  return <ChatPageContent />;
}
