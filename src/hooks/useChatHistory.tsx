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
  error: string | null;
  refetch: () => Promise<void>;
}

export function useChatHistory(): UseChatHistoryReturn {
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ FIXED: Stable fetch function using useRef to break circular dependencies
  const fetchConversationsRef = useRef<() => Promise<void>>();

  const fetchConversations = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      console.log('[useChatHistory] Not authenticated, skipping fetch');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[useChatHistory] Fetching conversations for user:', user.id);

      const response = await fetch(`/api/chat/history?userId=${user.id}&limit=50`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[useChatHistory] Fetched conversations:', data);

      // Handle both array response and object with conversations property
      const conversationList = Array.isArray(data) ? data : (data.conversations || []);

      setConversations(conversationList);
    } catch (err) {
      console.error('[useChatHistory] Error fetching conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chat history');
    } finally {
      setLoading(false);
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
      await fetchConversationsRef.current();
    }
  }, []); // No dependencies = stable function

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
    error,
    refetch,
  };
}
