/**
 * Simple Chat History Database Functions
 * MVP implementation for basic conversation listing without complex features
 */

import { supabaseAdmin } from './supabase-client';

export interface ConversationItem {
  id: string;
  title: string | null;
  message_count: number;
  updated_at: string;
}

/**
 * Get all conversations from database
 * MVP implementation - no user filtering, no pagination, no optimization
 */
export async function getAllConversations(): Promise<ConversationItem[]> {
  try {
    // Loading all conversations - silent handling for production
    
    const { data: conversations, error } = await supabaseAdmin
      .from('conversations')
      .select('id, title, message_count, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      // Database error - silent handling for production
      return [];
    }

    if (!conversations) {
      // No conversations found - silent handling for production
      return [];
    }

    // Loaded conversations successfully - silent handling for production
    return conversations;

  } catch (error) {
    // Failed to load conversations - silent handling for production
    return [];
  }
}