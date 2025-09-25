/**
 * CONVERSATION MANAGEMENT LIBRARY - PHASE 2 IMPLEMENTATION
 * 
 * TECHNICAL SPECIFICATIONS:
 * - Conversation listing and management interfaces
 * - Client-side conversation handling with AI SDK v5 compliance
 * - Session state management for academic workflow
 * - 100% AI SDK v5 compliance using ONLY /Users/eriksupit/Desktop/makalah/documentation as primary source
 * 
 * FEATURES:
 * - Conversation creation and retrieval
 * - Message history management
 * - Session lifecycle management
 * - Academic workflow state tracking
 */

import { UIMessage } from 'ai';
import type { ConversationSummary, ConversationDetails } from '../types/database-types';

export interface ConversationCreateRequest {
  userId: string;
  title?: string;
  description?: string;
  initialMessage?: string;
  phase?: number;
  workflowTemplate?: string;
}

export interface ConversationUpdateRequest {
  title?: string;
  description?: string;
  currentPhase?: number;
  archived?: boolean;
  metadata?: any;
}

export interface ConversationSearchRequest {
  userId: string;
  query: string;
  conversationIds?: string[];
  limit?: number;
  searchInContent?: boolean;
  searchInMetadata?: boolean;
  phase?: number;
  messageType?: 'user' | 'assistant' | 'system';
}

export interface ConversationHistoryRequest {
  userId: string;
  conversationId?: string;
  limit?: number;
  offset?: number;
  phase?: number;
  dateFrom?: string;
  dateTo?: string;
  messageType?: 'user' | 'assistant' | 'system';
}

export interface ConversationListResponse {
  conversations: ConversationSummary[];
  metadata: {
    total: number;
    hasMore: boolean;
    userId: string;
    includeArchived: boolean;
    timestamp: number;
  };
}

export interface ConversationResponse {
  conversation: any;
  messages?: UIMessage[];
  workflow?: any;
  metadata: {
    conversationId: string;
    messageCount: number;
    hasWorkflow: boolean;
    includeMessages: boolean;
    includeWorkflow: boolean;
    timestamp: number;
  };
}

export interface ConversationSearchResult {
  message: UIMessage;
  conversation: {
    id: string;
    title: string;
    currentPhase: number;
    updatedAt: string;
  };
  matchType: 'content' | 'metadata' | 'content_and_metadata';
}

export interface ConversationSearchResponse {
  results: ConversationSearchResult[];
  query: string;
  metadata: {
    total: number;
    limit: number;
    searchCriteria: any;
    timestamp: number;
  };
}

/**
 * CONVERSATION MANAGER CLASS
 * 
 * Provides comprehensive conversation management functionality
 * with AI SDK v5 compliance and academic workflow support
 */
export class ConversationManager {
  private baseUrl: string;
  
  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }
  
  /**
   * Create a new conversation
   */
  async createConversation(request: ConversationCreateRequest): Promise<ConversationResponse> {
    try {
      console.log('[ConversationManager] Creating new conversation:', request);
      
      const response = await fetch(`${this.baseUrl}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create conversation');
      }
      
      const result = await response.json();
      console.log('[ConversationManager] Conversation created successfully:', result.conversationId);
      
      return result;
    } catch (error) {
      console.error('[ConversationManager] Error creating conversation:', error);
      throw error;
    }
  }
  
  /**
   * Get list of user conversations
   */
  async getUserConversations(
    userId: string, 
    options: { 
      limit?: number; 
      includeArchived?: boolean; 
    } = {}
  ): Promise<ConversationListResponse> {
    try {
      const params = new URLSearchParams({
        userId,
        limit: (options.limit || 50).toString(),
        archived: (options.includeArchived || false).toString(),
      });
      
      console.log('[ConversationManager] Loading conversations for user:', userId);
      
      const response = await fetch(`${this.baseUrl}/api/conversations?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load conversations');
      }
      
      const result = await response.json();
      console.log('[ConversationManager] Loaded conversations:', result.metadata.total);
      
      return result;
    } catch (error) {
      console.error('[ConversationManager] Error loading conversations:', error);
      throw error;
    }
  }
  
  /**
   * Get conversation details
   */
  async getConversation(
    conversationId: string,
    options: {
      includeMessages?: boolean;
      includeWorkflow?: boolean;
    } = {}
  ): Promise<ConversationResponse> {
    try {
      const params = new URLSearchParams({
        includeMessages: (options.includeMessages !== false).toString(),
        includeWorkflow: (options.includeWorkflow !== false).toString(),
      });
      
      console.log('[ConversationManager] Loading conversation:', conversationId);
      
      const response = await fetch(`${this.baseUrl}/api/conversations/${conversationId}?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load conversation');
      }
      
      const result = await response.json();
      console.log('[ConversationManager] Loaded conversation with', result.metadata.messageCount, 'messages');
      
      return result;
    } catch (error) {
      console.error('[ConversationManager] Error loading conversation:', error);
      throw error;
    }
  }
  
  /**
   * Update conversation metadata
   */
  async updateConversation(
    conversationId: string,
    updates: ConversationUpdateRequest
  ): Promise<ConversationResponse> {
    try {
      console.log('[ConversationManager] Updating conversation:', conversationId, updates);
      
      const response = await fetch(`${this.baseUrl}/api/conversations/${conversationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update conversation');
      }
      
      const result = await response.json();
      console.log('[ConversationManager] Conversation updated successfully');
      
      return result;
    } catch (error) {
      console.error('[ConversationManager] Error updating conversation:', error);
      throw error;
    }
  }
  
  /**
   * Archive or delete conversation
   */
  async deleteConversation(
    conversationId: string,
    permanent: boolean = false
  ): Promise<{ success: boolean; deleted: boolean; archived: boolean }> {
    try {
      const params = new URLSearchParams({
        permanent: permanent.toString(),
      });
      
      console.log('[ConversationManager]', permanent ? 'Deleting' : 'Archiving', 'conversation:', conversationId);
      
      const response = await fetch(`${this.baseUrl}/api/conversations/${conversationId}?${params}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete conversation');
      }
      
      const result = await response.json();
      console.log('[ConversationManager] Conversation', permanent ? 'deleted' : 'archived', 'successfully');
      
      return result;
    } catch (error) {
      console.error('[ConversationManager] Error deleting conversation:', error);
      throw error;
    }
  }
  
  /**
   * Get chat history with filtering
   */
  async getChatHistory(request: ConversationHistoryRequest): Promise<{
    messages?: UIMessage[];
    conversations?: any[];
    conversationId?: string;
    metadata: any;
  }> {
    try {
      const params = new URLSearchParams();
      
      // Add required parameter
      params.append('userId', request.userId);
      
      // Add optional parameters
      if (request.conversationId) params.append('conversationId', request.conversationId);
      if (request.limit) params.append('limit', request.limit.toString());
      if (request.offset) params.append('offset', request.offset.toString());
      if (request.phase !== undefined) params.append('phase', request.phase.toString());
      if (request.dateFrom) params.append('dateFrom', request.dateFrom);
      if (request.dateTo) params.append('dateTo', request.dateTo);
      if (request.messageType) params.append('messageType', request.messageType);
      
      console.log('[ConversationManager] Loading chat history:', Object.fromEntries(params));
      
      const response = await fetch(`${this.baseUrl}/api/chat/history?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load chat history');
      }
      
      const result = await response.json();
      console.log('[ConversationManager] Loaded chat history:', result.metadata);
      
      return result;
    } catch (error) {
      console.error('[ConversationManager] Error loading chat history:', error);
      throw error;
    }
  }
  
  /**
   * Search chat history
   */
  async searchChatHistory(request: ConversationSearchRequest): Promise<ConversationSearchResponse> {
    try {
      console.log('[ConversationManager] Searching chat history:', request);
      
      const response = await fetch(`${this.baseUrl}/api/chat/history/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Search failed');
      }
      
      const result = await response.json();
      console.log('[ConversationManager] Search completed:', result.metadata.total, 'results');
      
      return result;
    } catch (error) {
      console.error('[ConversationManager] Error searching chat history:', error);
      throw error;
    }
  }
}

/**
 * DEFAULT CONVERSATION MANAGER INSTANCE
 */
export const conversationManager = new ConversationManager();

/**
 * CONVERSATION UTILITY FUNCTIONS
 */

/**
 * Format conversation for display
 */
export function formatConversationForDisplay(conversation: any): {
  id: string;
  title: string;
  phase: string;
  lastActivity: string;
  messageCount: number;
  progress: number;
} {
  const phaseNames = [
    '', // 0 - not used
    'Topic Definition',
    'Literature Review', 
    'Outline Creation',
    'Draft Writing',
    'Citation Integration',
    'Review & QA',
    'Final Preparation'
  ];
  
  return {
    id: conversation.id,
    title: conversation.title || 'Untitled Conversation',
    phase: `Phase ${conversation.current_phase || 1}: ${phaseNames[conversation.current_phase || 1]}`,
    lastActivity: new Date(conversation.updated_at || conversation.created_at).toLocaleDateString(),
    messageCount: conversation.message_count || 0,
    progress: Math.round(((conversation.current_phase || 1) / 7) * 100)
  };
}

/**
 * Get conversation templates for different academic workflows
 */
export function getConversationTemplates(): {
  id: string;
  name: string;
  description: string;
  initialPhase: number;
  phases: string[];
}[] {
  return [
    {
      id: 'academic_writing',
      name: 'Academic Paper Writing',
      description: '7-phase structured academic paper development',
      initialPhase: 1,
      phases: [
        'Topic Definition & Research Planning',
        'Literature Review & Data Collection',
        'Outline Creation & Structure Planning',
        'Draft Writing & Content Development',
        'Citation Integration & Reference Management',
        'Review & Quality Assurance',
        'Final Formatting & Submission Preparation'
      ]
    },
    {
      id: 'literature_review',
      name: 'Literature Review',
      description: 'Focused literature review and synthesis',
      initialPhase: 2,
      phases: [
        'Research Question Definition',
        'Literature Search & Collection',
        'Source Analysis & Categorization',
        'Synthesis & Writing',
        'Citation & Reference Management',
        'Review & Revision',
        'Final Preparation'
      ]
    },
    {
      id: 'research_proposal',
      name: 'Research Proposal',
      description: 'Comprehensive research proposal development',
      initialPhase: 1,
      phases: [
        'Problem Identification & Scope',
        'Literature Review & Background',
        'Methodology Design',
        'Proposal Writing',
        'Budget & Timeline Planning',
        'Review & Refinement',
        'Final Submission Preparation'
      ]
    },
    {
      id: 'thesis_writing',
      name: 'Thesis Writing',
      description: 'Complete thesis development workflow',
      initialPhase: 1,
      phases: [
        'Topic Selection & Proposal',
        'Literature Review & Research',
        'Methodology & Data Collection',
        'Analysis & Results Writing',
        'Discussion & Conclusions',
        'Review & Revision Cycles',
        'Final Defense Preparation'
      ]
    }
  ];
}

/**
 * Calculate conversation progress based on phase completion
 */
export function calculateConversationProgress(
  currentPhase: number, 
  totalPhases: number = 7,
  completedSteps: number = 0
): {
  percentage: number;
  phase: string;
  status: 'not_started' | 'in_progress' | 'completed';
} {
  const percentage = Math.min(Math.round(((currentPhase - 1 + completedSteps) / totalPhases) * 100), 100);
  
  const status = currentPhase === 1 && completedSteps === 0 ? 'not_started' :
                currentPhase >= totalPhases ? 'completed' : 'in_progress';
  
  return {
    percentage,
    phase: `Phase ${currentPhase} of ${totalPhases}`,
    status
  };
}