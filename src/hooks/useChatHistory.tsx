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
  currentPhase: number;
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

  // ✅ PERFORMANCE: Add AbortController untuk request deduplication
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchParamsRef = useRef<string>('');

  // ✅ FIXED: Stable fetch function using useRef to break circular dependencies
  const fetchConversationsRef = useRef<() => Promise<void>>();

  const fetchConversations = useCallback(async (currentOffset = 0, isLoadMore = false) => {
    if (!isAuthenticated || !user?.id) {
      console.log('[useChatHistory] Not authenticated, skipping fetch');
      setLoading(false);
      return;
    }

    // ✅ PREVENT DUPLICATE REQUESTS: Check if same params already being fetched
    const fetchParams = `${user.id}-${currentOffset}-${isLoadMore}`;
    if (fetchParams === lastFetchParamsRef.current) {
      console.log('[useChatHistory] Duplicate request prevented:', fetchParams);
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
      console.log(`[useChatHistory] Fetching conversations for user: ${user.id}, offset: ${currentOffset}`);

      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      const limit = 20;
      const response = await fetch(`/api/chat/history?userId=${user.id}&limit=${limit}&offset=${currentOffset}`, {
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
      console.log('[useChatHistory] Fetched conversations:', data);

      // Handle both array response and object with conversations property
      const conversationList = Array.isArray(data) ? data : (data.conversations || []);

      if (isLoadMore) {
        setConversations(prev => [...prev, ...conversationList]);
      } else {
        setConversations(conversationList);
      }

      // Check if there are more conversations to load
      setHasMore(conversationList.length === limit);
      setOffset(currentOffset + limit);
    } catch (err) {
      // ✅ HANDLE ABORTED REQUESTS: Don't treat aborted requests as errors
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('[useChatHistory] Request aborted:', err.message);
        return;
      }
      console.error('[useChatHistory] Error fetching conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chat history');
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
  }, [user?.id, isAuthenticated]); // Only update ref when actual dependencies change

  // ✅ FIXED: Initial fetch with stable dependencies only
  useEffect(() => {
    if (isAuthenticated && user?.id && fetchConversationsRef.current) {
      fetchConversationsRef.current();
    }
  }, [user?.id, isAuthenticated]); // Only depend on actual data, not function

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
