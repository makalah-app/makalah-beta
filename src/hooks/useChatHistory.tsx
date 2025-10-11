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
  workflowId: string | null;
}

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
  const fetchConversationsRef = useRef<() => Promise<void>>();

  // ✅ AUTH STABILITY DETECTION: Wait for auth to stabilize before fetching
  useEffect(() => {
    console.log('[useChatHistory] Setting up auth stability timer');
    const timer = setTimeout(() => {
      console.log('[useChatHistory] Auth stability timeout reached - setting authStable to true');
      setAuthStable(true);
    }, 500); // Wait 500ms for auth to stabilize

    return () => {
      console.log('[useChatHistory] Clearing auth stability timer');
      clearTimeout(timer);
    };
  }, []);

  const fetchConversations = useCallback(async (currentOffset = 0, isLoadMore = false) => {
    console.log('[useChatHistory] fetchConversations called:', {
      currentOffset,
      isLoadMore,
      isAuthenticated,
      userId: user?.id,
      userEmail: user?.email
    });

    if (!isAuthenticated || !user?.id) {
      console.warn('[useChatHistory] Skipping fetch - not authenticated or no user ID:', {
        isAuthenticated,
        userId: user?.id
      });
      setLoading(false);
      return;
    }

    // ✅ PREVENT DUPLICATE REQUESTS: Check if same params already being fetched
    const fetchParams = `${user.id}-${currentOffset}-${isLoadMore}`;
    if (fetchParams === lastFetchParamsRef.current) {
      console.warn('[useChatHistory] Duplicate request prevented:', fetchParams);
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
      console.log('[useChatHistory] Starting fetch request...');

      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      const limit = 20;
      const url = `/api/chat/history?userId=${user.id}&limit=${limit}&offset=${currentOffset}`;
      console.log('[useChatHistory] Fetching from URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortControllerRef.current.signal,
      });

      console.log('[useChatHistory] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[useChatHistory] Data received:', {
        isArray: Array.isArray(data),
        hasConversations: !!data.conversations,
        dataLength: Array.isArray(data) ? data.length : data.conversations?.length || 0,
        rawData: data
      });

      // Handle both array response and object with conversations property
      const rawConversationList = Array.isArray(data) ? data : (data.conversations || []);
      const conversationList: ConversationItem[] = rawConversationList.map((conv: any) => ({
        ...conv,
      }));

      console.log('[useChatHistory] Processed conversations:', {
        count: conversationList.length,
        isLoadMore,
        conversations: conversationList.map(c => ({ id: c.id, title: c.title }))
      });

      if (isLoadMore) {
        setConversations(prev => {
          const updated = [...prev, ...conversationList];
          console.log('[useChatHistory] Updated conversations (load more):', updated.length);
          return updated;
        });
      } else {
        console.log('[useChatHistory] Setting conversations (fresh):', conversationList.length);
        setConversations(conversationList);
      }

      // Check if there are more conversations to load
      setHasMore(conversationList.length === limit);
      setOffset(currentOffset + limit);
      console.log('[useChatHistory] Fetch completed successfully');
    } catch (err) {
      // ✅ HANDLE ABORTED REQUESTS: Don't treat aborted requests as errors
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('[useChatHistory] Request aborted');
        return;
      }
      console.error('[useChatHistory] Error fetching conversations:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load chat history';
      setError(errorMessage);
      console.error('[useChatHistory] Error message set:', errorMessage);
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
    console.log('[useChatHistory] Updating fetchConversationsRef.current');
    fetchConversationsRef.current = fetchConversations;
  }, [fetchConversations]); // Depend on the function itself to capture latest closure

  // ✅ FIXED: Initial fetch with stable dependencies only
  // ✅ AUTH RACE CONDITION FIX: Wait for auth to stabilize before fetching
  useEffect(() => {
    console.log('[useChatHistory] Initial fetch effect triggered:', {
      authStable,
      isAuthenticated,
      userId: user?.id,
      hasRefFunction: !!fetchConversationsRef.current
    });

    if (authStable && isAuthenticated && user?.id && fetchConversationsRef.current) {
      console.log('[useChatHistory] Calling fetchConversationsRef.current()');
      fetchConversationsRef.current();
    } else {
      console.log('[useChatHistory] Conditions not met for fetch:', {
        authStable,
        isAuthenticated,
        hasUserId: !!user?.id,
        hasRefFunction: !!fetchConversationsRef.current
      });
    }
  }, [authStable, user?.id, isAuthenticated]); // Wait for authStable before fetching

  // ✅ FIXED: Stable refetch function without circular dependencies
  const refetch = useCallback(async () => {
    console.log('[useChatHistory] refetch called');
    if (fetchConversationsRef.current) {
      setOffset(0);
      setHasMore(true);
      await fetchConversationsRef.current();
    } else {
      console.warn('[useChatHistory] refetch called but fetchConversationsRef.current is null');
    }
  }, []); // No dependencies = stable function

  // Load more conversations
  const loadMore = useCallback(async () => {
    if (fetchConversationsRef.current && hasMore && !loadingMore) {
      await fetchConversationsRef.current();
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

  // Log state on every render for debugging
  console.log('[useChatHistory] Hook state:', {
    conversationsCount: conversations.length,
    loading,
    loadingMore,
    error,
    hasMore,
    authStable,
    isAuthenticated,
    userId: user?.id
  });

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
