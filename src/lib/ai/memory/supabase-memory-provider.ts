import type {
  ConversationMessage,
  MemoryProvider,
  MemoryScope,
  WorkingMemory,
} from '@ai-sdk-tools/memory';

import { supabaseAdmin } from '@/lib/database/supabase-client';

interface WorkingMemoryRow {
  id: string;
  scope: string;
  chat_id: string | null;
  user_id: string | null;
  content: string;
  updated_at: string;
}

/**
 * Supabase-backed memory provider that persists working memory summaries per chat/user.
 */
export class SupabaseMemoryProvider implements MemoryProvider {
  private readonly tableName = 'working_memory';

  /**
   * Build deterministic row identifiers so we can use a single primary key column.
   */
  private buildRowKey(scope: MemoryScope, chatId?: string, userId?: string) {
    if (scope === 'chat') {
      if (!chatId) {
        throw new Error('SupabaseMemoryProvider: chatId is required when scope is chat');
      }
      return {
        id: `chat:${chatId}`,
        chat_id: chatId,
        user_id: userId ?? null,
      };
    }

    if (!userId) {
      throw new Error('SupabaseMemoryProvider: userId is required when scope is user');
    }

    return {
      id: `user:${userId}`,
      chat_id: null,
      user_id: userId,
    };
  }

  async getWorkingMemory(params: {
    chatId?: string;
    userId?: string;
    scope: MemoryScope;
  }): Promise<WorkingMemory | null> {
    const { id } = this.buildRowKey(params.scope, params.chatId, params.userId);

    const { data, error } = await supabaseAdmin
      .from<WorkingMemoryRow>(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[SupabaseMemoryProvider] Failed to load working memory', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      content: data.content,
      updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
    };
  }

  async updateWorkingMemory(params: {
    chatId?: string;
    userId?: string;
    scope: MemoryScope;
    content: string;
  }): Promise<void> {
    const rowKey = this.buildRowKey(params.scope, params.chatId, params.userId);

    const payload = {
      id: rowKey.id,
      scope: params.scope,
      chat_id: rowKey.chat_id,
      user_id: rowKey.user_id,
      content: params.content,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from(this.tableName)
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('[SupabaseMemoryProvider] Failed to upsert working memory', error);
    }
  }

  async saveMessage(_message: ConversationMessage): Promise<void> {
    // Chat history is already persisted via chat-store, so we intentionally no-op here.
    return;
  }
}

export const supabaseMemoryProvider = new SupabaseMemoryProvider();
