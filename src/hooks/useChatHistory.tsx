/**
 * Chat History Hook - BASIC FUNCTIONALITY ONLY
 * 
 * NO STYLING - Fokus pada data fetching dan state management
 * Mengambil conversation history dari database untuk user yang sedang login
 */

import { useState, useEffect, useCallback } from 'react';
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
      
      const response = await fetch(`/api/chat/history?userId=${user.id}&limit=20`, {
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

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Expose refetch function for manual refresh
  const refetch = useCallback(async () => {
    await fetchConversations();
  }, [fetchConversations]);

  // Add global refresh handler
  useEffect(() => {
    // Make refetch available globally for other components to trigger
    if (typeof window !== 'undefined') {
      // Make refetch available globally for direct calls from ChatContainer
      (window as any).refreshChatHistory = refetch;
      return () => {
        delete (window as any).refreshChatHistory;
      };
    }

    return () => {};
  }, [refetch]);

  return {
    conversations,
    loading,
    error,
    refetch,
  };
}
