/**
 * Type definitions for chat history API
 * Extended types to handle database compatibility and AI SDK v5 compliance
 *
 * CLEAN VERSION: All workflow references removed
 */

import type { UIMessage } from 'ai';

/**
 * Extended UIMessage for database compatibility
 * Adds properties that exist in database but not in base UIMessage
 */
export interface ExtendedUIMessage extends UIMessage {
  createdAt?: Date | string;
  metadata?: {
    [key: string]: any;
  };
}

/**
 * Database message type from chat_messages table
 */
export interface ChatMessage {
  id: string;
  conversation_id: string;
  message_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  parts?: any[];
  created_at: string;
  sequence_number: number;
  metadata?: any;
}

/**
 * Conversation data type from conversations table
 * Clean version: workflow columns removed (dropped in migration 20251006042353)
 */
export interface ConversationData {
  id: string;
  title?: string;
  message_count?: number;
  updated_at: string;
  user_id: string;
  archived?: boolean;
  metadata?: any;
}

/**
 * Search result type combining message and conversation data
 */
export interface SearchResult extends ChatMessage {
  conversations: ConversationData;
}

/**
 * API response types
 */
export interface ConversationResponse {
  id: string;
  title: string;
  messageCount: number;
  lastActivity: string;
  messages?: ExtendedUIMessage[];
}

export interface HistoryResponse {
  conversations: ConversationResponse[];
  messages?: ExtendedUIMessage[];
  totalCount: number;
  hasMore: boolean;
}

export interface SearchResponse {
  results: Array<{
    conversationId: string;
    conversationTitle: string;
    message: ExtendedUIMessage;
    matchScore?: number;
  }>;
  totalMatches: number;
  query: string;
}
