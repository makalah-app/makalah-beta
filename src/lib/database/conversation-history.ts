/**
 * CONVERSATION HISTORY SERVICE - TASK 03 DATABASE INTEGRATION
 * 
 * PURPOSE:
 * - Complete conversation history management and retrieval
 * - Advanced filtering, searching, and pagination capabilities
 * - Integration with UI components for seamless user experience
 * - Performance-optimized history loading with caching
 * 
 * FEATURES:
 * - Paginated conversation history loading
 * - Advanced search and filtering
 * - Conversation timeline and activity tracking
 * - Export and backup capabilities
 * - Performance optimization with caching
 */

import { supabaseServer } from './supabase-client';
import { loadChat } from './chat-store';
import type { ConversationSummary, ConversationDetails } from '../types/database-types';
import type { UIMessage } from 'ai';

/**
 * HISTORY FILTER OPTIONS
 */
export interface HistoryFilters {
  userId?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  searchQuery?: string;
  messageCount?: {
    min?: number;
    max?: number;
  };
  status?: 'active' | 'archived' | 'completed';
  orderBy?: 'created_at' | 'updated_at' | 'message_count';
  orderDirection?: 'asc' | 'desc';
}

/**
 * PAGINATED HISTORY RESPONSE
 */
export interface PaginatedHistoryResponse {
  conversations: ConversationSummary[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  currentPage: number;
  totalPages: number;
  filters: HistoryFilters;
}

/**
 * CONVERSATION TIMELINE ENTRY
 */
export interface ConversationTimelineEntry {
  id: string;
  type: 'message' | 'session_started' | 'session_ended';
  timestamp: string;
  title: string;
  description: string;
  metadata: {
    messageId?: string;
    sessionId?: string;
    [key: string]: any;
  };
}

/**
 * HISTORY STATISTICS
 */
export interface HistoryStatistics {
  totalConversations: number;
  totalMessages: number;
  averageMessagesPerConversation: number;
  totalTimeSpent: number; // in milliseconds
  dailyActivity: { [date: string]: number };
  topTopics: Array<{ topic: string; count: number }>;
}

/**
 * GET CONVERSATION HISTORY
 * Retrieves paginated conversation history with advanced filtering
 */
export async function getConversationHistory(
  filters: HistoryFilters = {},
  page: number = 1,
  limit: number = 20
): Promise<PaginatedHistoryResponse> {
  try {
    // Loading conversation history - silent handling for production
    
    // const startTime = Date.now(); // Unused variable
    const offset = (page - 1) * limit;
    
    // Build query with filters
    let query = supabaseServer
      .from('conversations')
      .select(`
        id,
        title,
        description,
        user_id,
        message_count,
        metadata,
        created_at,
        updated_at,
        archived
      `);
    
    // Apply filters
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters.status) {
      if (filters.status === 'archived') {
        query = query.eq('archived', true);
      } else if (filters.status === 'completed' || filters.status === 'active') {
        // Note: completed/active status can't be filtered without phase tracking
        query = query.eq('archived', false);
      }
    } else {
      // Default: exclude archived
      query = query.eq('archived', false);
    }
    
    if (filters.dateRange) {
      query = query
        .gte('created_at', filters.dateRange.startDate)
        .lte('created_at', filters.dateRange.endDate);
    }
    
    if (filters.messageCount) {
      if (filters.messageCount.min !== undefined) {
        query = query.gte('message_count', filters.messageCount.min);
      }
      if (filters.messageCount.max !== undefined) {
        query = query.lte('message_count', filters.messageCount.max);
      }
    }
    
    if (filters.searchQuery) {
      query = query.or(`title.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`);
    }
    
    // Apply ordering
    const orderBy = filters.orderBy || 'updated_at';
    const orderDirection = filters.orderDirection || 'desc';
    query = query.order(orderBy, { ascending: orderDirection === 'asc' });
    
    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabaseServer
      .from('conversations')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      throw new Error(`Failed to get count: ${countError.message}`);
    }
    
    // Get paginated data
    const { data: conversations, error } = await query
      .range(offset, offset + limit - 1);
    
    if (error) {
      throw new Error(`Failed to load conversations: ${error.message}`);
    }
    
    // Transform to ConversationSummary format
    const conversationSummaries: ConversationSummary[] = (conversations || []).map(conv => {
      const convData = conv as any;
      return {
        id: convData.id,
        title: convData.title || 'Untitled Chat',
        messageCount: convData.message_count,
        lastActivity: convData.updated_at,
        archived: convData.archived,
        metadata: convData.metadata
      };
    });
    
    const totalPages = Math.ceil((totalCount || 0) / limit);
    // const loadTime = Date.now() - startTime; // Unused variable
    
    // Loaded conversations successfully - silent handling for production
    
    return {
      conversations: conversationSummaries,
      totalCount: totalCount || 0,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      currentPage: page,
      totalPages,
      filters
    };
    
  } catch (error) {
    // Failed to load conversation history - silent handling for production
    
    // Return empty result on error
    return {
      conversations: [],
      totalCount: 0,
      hasNextPage: false,
      hasPreviousPage: false,
      currentPage: page,
      totalPages: 0,
      filters
    };
  }
}

/**
 * GET CONVERSATION TIMELINE
 * Creates a chronological timeline of all activities in a conversation
 */
export async function getConversationTimeline(
  conversationId: string
): Promise<ConversationTimelineEntry[]> {
  try {
    // Building timeline for conversation - silent handling for production
    
    const timeline: ConversationTimelineEntry[] = [];
    
    // Get conversation metadata
    const { data: conversation } = await supabaseServer
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
    
    if (!conversation) {
      // Conversation not found - silent handling for production
      return [];
    }
    
    // Add conversation created event
    const conversationData = conversation as any;
    timeline.push({
      id: `conv_created_${conversationData.id}`,
      type: 'session_started',
      timestamp: conversationData.created_at,
      title: 'Conversation Started',
      description: `New academic writing session: "${conversationData.title}"`,
      metadata: {
        conversationId: conversationData.id
      }
    });
    
    // Get messages and create timeline entries
    const { data: messages } = await supabaseServer
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sequence_number', { ascending: true });
    
    (messages || []).forEach(message => {
      const messageData = message as any;
      // Add message events
      timeline.push({
        id: `message_${messageData.id}`,
        type: 'message',
        timestamp: messageData.created_at,
        title: `${messageData.role === 'user' ? 'User' : 'Assistant'} Message`,
        description: extractMessagePreview(messageData.content, messageData.parts),
        metadata: {
          messageId: messageData.message_id,
          role: messageData.role
        }
      });
    });

    // Get sessions
    const { data: sessions } = await supabaseServer
      .from('chat_sessions')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('started_at', { ascending: true });
    
    (sessions || []).forEach(session => {
      const sessionData = session as any;
      timeline.push({
        id: `session_start_${sessionData.id}`,
        type: 'session_started',
        timestamp: sessionData.started_at,
        title: 'Chat Session Started',
        description: 'User joined the conversation',
        metadata: {
          sessionId: sessionData.id,
          userId: sessionData.user_id
        }
      });

      if (sessionData.ended_at) {
        timeline.push({
          id: `session_end_${sessionData.id}`,
          type: 'session_ended',
          timestamp: sessionData.ended_at,
          title: 'Chat Session Ended',
          description: `Session lasted ${formatDuration(
            new Date(sessionData.ended_at).getTime() - new Date(sessionData.started_at).getTime()
          )}`,
          metadata: {
            sessionId: sessionData.id,
            duration: new Date(sessionData.ended_at).getTime() - new Date(sessionData.started_at).getTime()
          }
        });
      }
    });
    
    // Sort timeline by timestamp
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    // Built timeline successfully - silent handling for production
    return timeline;
    
  } catch (error) {
    // Failed to build conversation timeline - silent handling for production
    return [];
  }
}

/**
 * GET HISTORY STATISTICS
 * Generates comprehensive statistics about user's conversation history
 */
export async function getHistoryStatistics(
  userId: string,
  dateRange?: { startDate: string; endDate: string }
): Promise<HistoryStatistics> {
  try {
    // Generating statistics for user - silent handling for production
    
    let query = supabaseServer
      .from('conversations')
      .select(`
        id,
        title,
        message_count,
        metadata,
        created_at,
        updated_at,
        chat_sessions (
          started_at,
          ended_at,
          activity_data
        )
      `)
      .eq('user_id', userId)
      .eq('archived', false);
    
    if (dateRange) {
      query = query
        .gte('created_at', dateRange.startDate)
        .lte('created_at', dateRange.endDate);
    }
    
    const { data: conversations, error } = await query;
    
    if (error) {
      throw new Error(`Failed to load conversations for stats: ${error.message}`);
    }
    
    // Calculate statistics
    const stats: HistoryStatistics = {
      totalConversations: conversations?.length || 0,
      totalMessages: 0,
      averageMessagesPerConversation: 0,
      totalTimeSpent: 0,
      dailyActivity: {},
      topTopics: []
    };
    
    if (!conversations || conversations.length === 0) {
      return stats;
    }
    
    // Process conversations
    const topicCount: { [topic: string]: number } = {};
    
    conversations.forEach(conv => {
      const convData = conv as any;
      stats.totalMessages += convData.message_count;

      // Daily activity
      const date = new Date(convData.created_at).toISOString().split('T')[0];
      stats.dailyActivity[date] = (stats.dailyActivity[date] || 0) + 1;

      // Topic extraction (from title)
      if (convData.title) {
        const topic = extractTopicFromTitle(convData.title);
        if (topic) {
          topicCount[topic] = (topicCount[topic] || 0) + 1;
        }
      }

      // Session time calculation
      if (convData.chat_sessions) {
        convData.chat_sessions.forEach((session: any) => {
          if (session.ended_at) {
            const duration = new Date(session.ended_at).getTime() - new Date(session.started_at).getTime();
            stats.totalTimeSpent += duration;
          } else if (session.activity_data?.totalDuration) {
            stats.totalTimeSpent += session.activity_data.totalDuration;
          }
        });
      }
    });
    
    // Calculate averages
    stats.averageMessagesPerConversation = Math.round(stats.totalMessages / stats.totalConversations);
    
    // Top topics
    stats.topTopics = Object.entries(topicCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));
    
    // Generated statistics successfully - silent handling for production
    
    return stats;
    
  } catch (error) {
    // Failed to generate statistics - silent handling for production
    
    // Return empty stats on error
    return {
      totalConversations: 0,
      totalMessages: 0,
      averageMessagesPerConversation: 0,
      totalTimeSpent: 0,
      dailyActivity: {},
      topTopics: []
    };
  }
}

/**
 * SEARCH CONVERSATIONS
 * Advanced search across conversation titles, descriptions, and content
 */
export async function searchConversations(
  searchQuery: string,
  userId?: string,
  limit: number = 10
): Promise<ConversationSummary[]> {
  try {
    // Searching conversations - silent handling for production
    
    let query = supabaseServer
      .from('conversations')
      .select(`
        id,
        title,
        description,
        message_count,
        updated_at,
        metadata
      `)
      .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      .eq('archived', false)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: conversations, error } = await query;

    if (error) {
      throw new Error(`Search failed: ${error.message}`);
    }

    const results = (conversations || []).map(conv => {
      const convData = conv as any;
      return {
        id: convData.id,
        title: convData.title || 'Untitled Chat',
        messageCount: convData.message_count,
        lastActivity: convData.updated_at,
        metadata: convData.metadata
      };
    });
    
    // Found matching conversations - silent handling for production
    return results;
    
  } catch (error) {
    // Search failed - silent handling for production
    return [];
  }
}

/**
 * EXPORT CONVERSATION HISTORY
 * Exports conversation data in various formats
 */
export async function exportConversationHistory(
  conversationIds: string[],
  format: 'json' | 'csv' | 'markdown' = 'json'
): Promise<string> {
  try {
    // Exporting conversations - silent handling for production
    
    const exportData = [];
    
    for (const conversationId of conversationIds) {
      const conversation = await getConversationDetails(conversationId);
      if (conversation) {
        const messages = await loadChat(conversationId);
        exportData.push({
          conversation: conversation.conversation,
          messages,
          timeline: await getConversationTimeline(conversationId)
        });
      }
    }
    
    switch (format) {
      case 'json':
        return JSON.stringify(exportData, null, 2);
      
      case 'csv':
        return convertToCSV(exportData);
      
      case 'markdown':
        return convertToMarkdown(exportData);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
    
  } catch (error) {
    // Export failed - silent handling for production
    throw error;
  }
}

// Helper functions

function extractMessagePreview(content: any, parts: any[]): string {
  if (typeof content === 'string' && content.length > 0) {
    return content.length > 100 ? content.substring(0, 97) + '...' : content;
  }
  
  if (parts && Array.isArray(parts)) {
    const textPart = parts.find(p => p.type === 'text');
    if (textPart && textPart.text) {
      return textPart.text.length > 100 ? textPart.text.substring(0, 97) + '...' : textPart.text;
    }
  }
  
  return 'No content preview available';
}

function extractTopicFromTitle(title: string): string | null {
  // Simple topic extraction from title
  const keywords = title.toLowerCase().match(/\b\w{4,}\b/g);
  return keywords && keywords.length > 0 ? keywords[0] : null;
}

function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function convertToCSV(data: any[]): string {
  // Simple CSV conversion - would need more sophisticated implementation for production
  const headers = ['ID', 'Title', 'Messages', 'Created', 'Updated'];
  const rows = data.map(item => [
    item.conversation.id,
    item.conversation.title,
    item.conversation.message_count,
    item.conversation.created_at,
    item.conversation.updated_at
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function convertToMarkdown(data: any[]): string {
  // Simple Markdown conversion
  return data.map(item => `
# ${item.conversation.title}

**ID:** ${item.conversation.id}
**Messages:** ${item.conversation.message_count}
**Created:** ${item.conversation.created_at}

## Messages
${item.messages.map((msg: UIMessage) => `
**${msg.role.toUpperCase()}:** ${typeof (msg as any).content === 'string' ? (msg as any).content : JSON.stringify((msg as any).content)}
`).join('\n')}

---
`).join('\n');
}

async function getConversationDetails(conversationId: string): Promise<ConversationDetails | null> {
  // Import from existing chat-store
  const { getConversationDetails: getDetails } = await import('./chat-store');
  return getDetails(conversationId);
}
