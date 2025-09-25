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
    console.log('[SimpleHistory] Loading all conversations...');
    
    const { data: conversations, error } = await supabaseAdmin
      .from('conversations')
      .select('id, title, message_count, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[SimpleHistory] Database error:', error);
      return [];
    }

    if (!conversations) {
      console.log('[SimpleHistory] No conversations found');
      return [];
    }

    console.log(`[SimpleHistory] Loaded ${conversations.length} conversations`);
    return conversations;

  } catch (error) {
    console.error('[SimpleHistory] Failed to load conversations:', error);
    return [];
  }
}