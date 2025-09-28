'use client';

/**
 * ConversationProvider - Context for managing chat conversation state
 * 
 * DOCUMENTATION COMPLIANCE:
 * - Supports AI SDK v5 persistence patterns
 * - Manages conversation loading and saving
 * - Provides conversation metadata and history
 * 
 * FEATURES:
 * - Conversation creation and management
 * - Message persistence with database integration
 * - Real-time conversation state synchronization
 * - Error handling and recovery
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UIMessage } from 'ai';
import { AcademicUIMessage, AcademicMetadata } from './ChatContainer';
import { 
  loadChat, 
  createChat, 
  getUserConversations, 
  getConversationDetails 
} from '../../lib/database/chat-store';
import { 
  ConversationSummary, 
  ConversationDetails, 
  DatabaseResponse 
} from '../../lib/types/database-types';

// =====================================================================================
// CONTEXT TYPES
// =====================================================================================

export interface ConversationContextState {
  // Current conversation
  currentConversationId?: string;
  currentConversation?: ConversationDetails;
  isLoading: boolean;
  error?: string;
  
  // Conversation management
  conversations: ConversationSummary[];
  loadingConversations: boolean;
  
  // Actions
  createNewConversation: () => Promise<string>;
  loadConversation: (conversationId: string) => Promise<AcademicUIMessage[]>;
  loadUserConversations: () => Promise<void>;
  switchConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  archiveConversation: (conversationId: string) => Promise<void>;
  
  // Real-time state
  refreshConversation: (conversationId?: string) => Promise<void>;
}

const ConversationContext = createContext<ConversationContextState | null>(null);

// =====================================================================================
// CONTEXT PROVIDER
// =====================================================================================

interface ConversationProviderProps {
  children: React.ReactNode;
  userId?: string; // For user-specific conversations
}

export const ConversationProvider: React.FC<ConversationProviderProps> = ({ 
  children, 
  userId = 'system' 
}) => {
  const [currentConversationId, setCurrentConversationId] = useState<string>();
  const [currentConversation, setCurrentConversation] = useState<ConversationDetails>();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [error, setError] = useState<string>();

  // =====================================================================================
  // CONVERSATION MANAGEMENT ACTIONS
  // =====================================================================================

  /**
   * Create new conversation
   */
  const createNewConversation = useCallback(async (): Promise<string> => {
    try {
      setIsLoading(true);
      setError(undefined);

      console.log(`[ConversationProvider] Creating new conversation for user ${userId}`);
      
      const conversationId = await createChat(userId, 'New Academic Chat');
      
      console.log(`[ConversationProvider] Created conversation ${conversationId}`);
      
      // Refresh conversation list
      await loadUserConversations();
      
      return conversationId;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create conversation';
      setError(errorMessage);
      console.error('[ConversationProvider] Create conversation error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Load conversation messages (AI SDK compliant)
   */
  const loadConversation = useCallback(async (conversationId: string): Promise<AcademicUIMessage[]> => {
    try {
      setIsLoading(true);
      setError(undefined);

      console.log(`[ConversationProvider] Loading conversation ${conversationId}`);
      
      // Load messages using AI SDK compliant loadChat function
      const messages = await loadChat(conversationId);
      
      console.log(`[ConversationProvider] Loaded ${messages.length} messages for conversation ${conversationId}`);
      
      // Load full conversation details
      const details = await getConversationDetails(conversationId);
      
      if (details) {
        setCurrentConversation(details);
        setCurrentConversationId(conversationId);
      }
      
      return messages as AcademicUIMessage[];
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load conversation';
      setError(errorMessage);
      console.error('[ConversationProvider] Load conversation error:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load user conversations list
   */
  const loadUserConversations = useCallback(async (): Promise<void> => {
    try {
      setLoadingConversations(true);
      
      console.log(`[ConversationProvider] Loading conversations for user ${userId}`);
      
      const userConversations = await getUserConversations(userId);
      
      setConversations(userConversations);
      
      console.log(`[ConversationProvider] Loaded ${userConversations.length} conversations`);
      
    } catch (error) {
      console.error('[ConversationProvider] Load conversations error:', error);
      setConversations([]); // Fallback to empty array
    } finally {
      setLoadingConversations(false);
    }
  }, [userId]);

  /**
   * Switch to different conversation
   */
  const switchConversation = useCallback(async (conversationId: string): Promise<void> => {
    try {
      if (conversationId === currentConversationId) {
        return; // Already on this conversation
      }

      await loadConversation(conversationId);
      
    } catch (error) {
      console.error('[ConversationProvider] Switch conversation error:', error);
      throw error;
    }
  }, [currentConversationId, loadConversation]);

  /**
   * Delete conversation (placeholder - implement based on requirements)
   */
  const deleteConversation = useCallback(async (conversationId: string): Promise<void> => {
    try {
      console.log(`[ConversationProvider] Delete conversation ${conversationId} (not implemented)`);
      
      // TODO: Implement conversation deletion
      // For now, we'll archive it
      await archiveConversation(conversationId);
      
    } catch (error) {
      console.error('[ConversationProvider] Delete conversation error:', error);
      throw error;
    }
  }, []);

  /**
   * Archive conversation
   */
  const archiveConversation = useCallback(async (conversationId: string): Promise<void> => {
    try {
      console.log(`[ConversationProvider] Archive conversation ${conversationId} (placeholder)`);
      
      // TODO: Implement conversation archiving via API
      // This would set archived = true in the conversations table
      
      // Refresh conversation list
      await loadUserConversations();
      
      // If current conversation was archived, clear it
      if (conversationId === currentConversationId) {
        setCurrentConversation(undefined);
        setCurrentConversationId(undefined);
      }
      
    } catch (error) {
      console.error('[ConversationProvider] Archive conversation error:', error);
      throw error;
    }
  }, [currentConversationId, loadUserConversations]);

  /**
   * Refresh conversation data
   */
  const refreshConversation = useCallback(async (conversationId?: string): Promise<void> => {
    const targetId = conversationId || currentConversationId;
    
    if (!targetId) {
      return;
    }

    try {
      await loadConversation(targetId);
      await loadUserConversations();
      
    } catch (error) {
      console.error('[ConversationProvider] Refresh conversation error:', error);
    }
  }, [currentConversationId, loadConversation, loadUserConversations]);

  // =====================================================================================
  // INITIAL LOADING
  // =====================================================================================

  useEffect(() => {
    // Load user conversations on mount
    loadUserConversations();
  }, [loadUserConversations]);

  // =====================================================================================
  // CONTEXT VALUE
  // =====================================================================================

  const contextValue: ConversationContextState = {
    // Current state
    currentConversationId,
    currentConversation,
    isLoading,
    error,
    
    // Conversations
    conversations,
    loadingConversations,
    
    // Actions
    createNewConversation,
    loadConversation,
    loadUserConversations,
    switchConversation,
    deleteConversation,
    archiveConversation,
    refreshConversation,
  };

  return (
    <ConversationContext.Provider value={contextValue}>
      {children}
    </ConversationContext.Provider>
  );
};

// =====================================================================================
// CONTEXT HOOK
// =====================================================================================

export const useConversation = (): ConversationContextState => {
  const context = useContext(ConversationContext);
  
  if (!context) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  
  return context;
};

// =====================================================================================
// UTILITY HOOKS
// =====================================================================================

/**
 * Hook for managing conversation creation with error handling
 */
export const useCreateConversation = () => {
  const { createNewConversation, isLoading, error } = useConversation();
  
  const createAndNavigate = useCallback(async (): Promise<string | null> => {
    try {
      const conversationId = await createNewConversation();
      return conversationId;
    } catch (error) {
      console.error('[useCreateConversation] Error:', error);
      return null;
    }
  }, [createNewConversation]);

  return {
    createAndNavigate,
    isCreating: isLoading,
    error
  };
};

/**
 * Hook for conversation selection and loading
 */
export const useConversationSelector = () => {
  const { 
    conversations, 
    loadingConversations, 
    currentConversationId,
    switchConversation,
    loadUserConversations 
  } = useConversation();

  return {
    conversations,
    loading: loadingConversations,
    currentId: currentConversationId,
    selectConversation: switchConversation,
    refreshList: loadUserConversations
  };
};

export default ConversationProvider;
