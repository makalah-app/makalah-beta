/**
 * Chat History Hook - BASIC FUNCTIONALITY ONLY
 * 
 * NO STYLING - Fokus pada data fetching dan state management
 * Mengambil conversation history dari database untuk user yang sedang login
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';

export interface ConversationItem {
  id: string;
  title: string | null;
  messageCount: number;
  lastActivity: string;
}

const FALLBACK_ACTIVITY_ISO = new Date(0).toISOString();

const normalizeActivityTimestamp = (value: unknown, secondary?: unknown): string => {
  const attempt = (input: unknown): string | null => {
    if (!input && input !== 0) {
      return null;
    }

    if (input instanceof Date) {
      const timestamp = input.getTime();
      return Number.isNaN(timestamp) ? null : input.toISOString();
    }

    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (!trimmed) {
        return null;
      }
      const parsed = new Date(trimmed);
      const timestamp = parsed.getTime();
      return Number.isNaN(timestamp) ? null : parsed.toISOString();
    }

    if (typeof input === 'number' && Number.isFinite(input)) {
      const parsed = new Date(input);
      const timestamp = parsed.getTime();
      return Number.isNaN(timestamp) ? null : parsed.toISOString();
    }

    return null;
  };

  return (
    attempt(value) ??
    (secondary !== undefined ? attempt(secondary) : null) ??
    FALLBACK_ACTIVITY_ISO
  );
};

const sortByActivityDesc = <T extends { lastActivity: string }>(items: T[]): T[] => {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.lastActivity || FALLBACK_ACTIVITY_ISO).getTime();
    const bTime = new Date(b.lastActivity || FALLBACK_ACTIVITY_ISO).getTime();
    return bTime - aTime;
  });
};

interface UseChatHistoryReturn {
  conversations: ConversationItem[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useChatHistory(): UseChatHistoryReturn {
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  // ✅ FIX AUTH RACE CONDITION: Track auth stability to prevent empty sidebar
  const [authStable, setAuthStable] = useState<boolean>(false);

  // ✅ PERFORMANCE: Add AbortController untuk request deduplication
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchParamsRef = useRef<string>('');

  // ✅ FIXED: Stable fetch function using useRef to break circular dependencies
  const fetchConversationsRef = useRef<(
    currentOffset?: number,
    isLoadMore?: boolean
  ) => Promise<void>>();

  // ✅ AUTH STABILITY DETECTION: Wait for auth to stabilize before fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthStable(true);
    }, 500); // Wait 500ms for auth to stabilize

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const fetchConversations = useCallback(async (currentOffset = 0, isLoadMore = false) => {
    if (!isAuthenticated || !user?.id) {
      setLoading(false);
      return;
    }

    // ✅ PREVENT DUPLICATE REQUESTS: Check if same params already being fetched
    const fetchParams = `${user.id}-${currentOffset}-${isLoadMore}`;
    if (fetchParams === lastFetchParamsRef.current) {
      return;
    }

    // ✅ REQUEST DEDUPLICATION: Cancel previous request only when params change
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    lastFetchParamsRef.current = fetchParams;

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setOffset(0);
    }
    setError(null);

    try {
      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      const limit = 20;
      const url = `/api/chat/history?userId=${user.id}&limit=${limit}&offset=${currentOffset}&mode=lean`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.statusText}`);
      }

      const data = await response.json();

      // Handle both array response and object with conversations property
      const rawConversationList = Array.isArray(data) ? data : (data.conversations || []);
      const metaHasMore: boolean | undefined = !Array.isArray(data)
        ? Boolean(data?.metadata?.hasMore)
        : undefined;
      const conversationList: ConversationItem[] = rawConversationList.map((conv: any) => {
        const normalizedLastActivity = normalizeActivityTimestamp(
          conv.lastActivity ??
            conv.last_message_at ??
            conv.lastMessageAt ??
            conv.derivedLastActivity ??
            conv.metadata?.lastMessageAt ??
            conv.metadata?.last_message_at,
          conv.updated_at
        );
        const normalizedTitle = typeof conv.title === 'string' ? conv.title : null;
        const normalizedMessageCount = typeof conv.messageCount === 'number'
          ? conv.messageCount
          : Number(conv.message_count ?? 0) || 0;
        return {
          ...conv,
          title: normalizedTitle,
          messageCount: normalizedMessageCount,
          lastActivity: normalizedLastActivity,
        };
      });
      const sortedConversationList = sortByActivityDesc(conversationList);

      if (isLoadMore) {
        // Append only unique items by ID to prevent duplication on reordering
        setConversations(prev => {
          const existing = new Set(prev.map(c => c.id));
          const filtered = sortedConversationList.filter(c => !existing.has(c.id));
          if (filtered.length === 0) {
            return prev;
          }
          const merged = [...prev, ...filtered];
          return sortByActivityDesc(merged);
        });
      } else {
        // Replace list; also ensure uniqueness within the page
        const unique = (() => {
          const seen = new Set<string>();
          const out: ConversationItem[] = [];
          for (const item of sortedConversationList) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              out.push(item);
            }
          }
          return out;
        })();
        setConversations(sortByActivityDesc(unique));
      }

      // Check if there are more conversations to load
      if (typeof metaHasMore === 'boolean') {
        setHasMore(metaHasMore);
      } else {
        setHasMore(conversationList.length === limit);
      }
      setOffset(currentOffset + limit);
    } catch (err) {
      // ✅ HANDLE ABORTED REQUESTS: Don't treat aborted requests as errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to load chat history';
      setError(errorMessage);
    } finally {
      // Clear fetch params on completion
      lastFetchParamsRef.current = '';
      abortControllerRef.current = null;
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user?.id, isAuthenticated]);

  // ✅ CRITICAL FIX: Only update ref when dependencies actually change to prevent loop
  useEffect(() => {
    fetchConversationsRef.current = fetchConversations;
  }, [fetchConversations]); // Depend on the function itself to capture latest closure

  // ✅ FIXED: Initial fetch with stable dependencies only
  // ✅ AUTH RACE CONDITION FIX: Wait for auth to stabilize before fetching
  useEffect(() => {
    if (authStable && isAuthenticated && user?.id && fetchConversationsRef.current) {
      fetchConversationsRef.current();
    }
  }, [authStable, user?.id, isAuthenticated]); // Wait for authStable before fetching

  // ✅ FIXED: Stable refetch function without circular dependencies
  const refetch = useCallback(async () => {
    if (fetchConversationsRef.current) {
      setOffset(0);
      setHasMore(true);
      await fetchConversationsRef.current();
    }
  }, []); // No dependencies = stable function

  // Load more conversations
  const loadMore = useCallback(async () => {
    if (fetchConversationsRef.current && hasMore && !loadingMore) {
      await fetchConversationsRef.current(offset, true);
    }
  }, [offset, hasMore, loadingMore]);

  // ✅ FIXED: Global refresh handler with stable refetch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).refreshChatHistory = refetch;
      return () => {
        delete (window as any).refreshChatHistory;
      };
    }
  }, []); // No dependencies = runs once only

  return {
    conversations,
    loading,
    loadingMore,
    error,
    hasMore,
    refetch,
    loadMore,
  };
}
