/**
 * Database Types for Supabase Integration
 * 
 * INTEGRATION COMPLIANCE:
 * - Maps to existing 24-table enterprise database schema
 * - Supports chat message persistence with UIMessage format
 * - Maintains compatibility with existing workflow and user management
 * 
 * CHAT PERSISTENCE SCHEMA:
 * - conversations: Main chat container table
 * - chat_messages: Individual messages in UIMessage format
 * - chat_sessions: Real-time session management
 */

import { UIMessage } from 'ai';

/**
 * Database schema interface for Supabase TypeScript support
 */
export interface Database {
  public: {
    Tables: {
      // ==================== USER MANAGEMENT ====================
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          password_hash?: string;
          role: 'student' | 'admin' | 'researcher' | 'guest';
          institution?: string;
          email_verified: boolean;
          avatar_url?: string;
          created_at: string;
          updated_at: string;
          last_login?: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          first_name?: string;
          last_name?: string;
          avatar_url?: string;
          bio?: string;
          research_interests: string[];
          preferences: any;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
      };
      
      user_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_token?: string;
          session_data: any;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_sessions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_sessions']['Insert']>;
      };
      
      // ==================== CHAT PERSISTENCE ====================
      conversations: {
        Row: {
          id: string;
          user_id: string;
          title?: string;
          description?: string;
          message_count: number;
          metadata: any;
          created_at: string;
          updated_at: string;
          archived: boolean;
          archived_at?: string;
        };
        Insert: Omit<Database['public']['Tables']['conversations']['Row'], 'id' | 'created_at' | 'updated_at' | 'message_count'>;
        Update: Partial<Omit<Database['public']['Tables']['conversations']['Row'], 'id' | 'created_at' | 'message_count'>>;
      };
      
      chat_messages: {
        Row: {
          id: string;
          conversation_id: string;
          message_id: string; // AI SDK message ID
          role: 'user' | 'assistant' | 'system';
          content: any; // UIMessage content structure
          parts: any; // UIMessage parts array
          metadata: any; // Academic metadata (tokens, model, userId, etc.)
          sequence_number: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['chat_messages']['Row'], 'id' | 'created_at' | 'updated_at' | 'sequence_number'>;
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>;
      };
      
      chat_sessions: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          status: 'active' | 'paused' | 'ended';
          started_at: string;
          ended_at?: string;
          activity_data: any;
        };
        Insert: Omit<Database['public']['Tables']['chat_sessions']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['chat_sessions']['Insert']>;
      };
      // ==================== ADMIN CONFIGURATION ====================
      model_configs: {
        Row: {
          id: string;
          provider: 'openai' | 'openrouter';
          model_name: string;
          parameters?: any; // JSONB field for dynamic parameters like topP
          temperature: number;
          max_tokens: number;
          frequency_penalty: number;
          presence_penalty: number;
          is_active: boolean;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['model_configs']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['model_configs']['Insert']>;
      };

      admin_settings: {
        Row: {
          id: string;
          setting_key: string;
          setting_value: string;
          setting_type: 'string' | 'number' | 'boolean' | 'json';
          description?: string;
          is_encrypted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['admin_settings']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['admin_settings']['Insert']>;
      };

      system_prompts: {
        Row: {
          id: string;
          content: string;
          description?: string;
          priority_order: number;
          is_active: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['system_prompts']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['system_prompts']['Insert']>;
      };

      fallback_system_prompts: {
        Row: {
          id: string;
          content: string;
          is_active: boolean;
          version: string;
          description: string | null;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['fallback_system_prompts']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['fallback_system_prompts']['Insert']>;
      };

      // ==================== AI INTERACTION TRACKING ====================
      ai_interactions: {
        Row: {
          id: string;
          conversation_id?: string;
          user_id: string;
          provider: string;
          model: string;
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
          cost?: number;
          response_time: number;
          interaction_data: any;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ai_interactions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['ai_interactions']['Insert']>;
      };
      
      tool_usage_logs: {
        Row: {
          id: string;
          conversation_id?: string;
          user_id: string;
          tool_name: string;
          input_data: any;
          output_data: any;
          execution_time: number;
          status: 'success' | 'error' | 'timeout';
          error_message?: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tool_usage_logs']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['tool_usage_logs']['Insert']>;
      };
      
      research_queries: {
        Row: {
          id: string;
          conversation_id?: string;
          user_id: string;
          query: string;
          search_provider: string;
          results: any;
          result_count: number;
          metadata: any;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['research_queries']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['research_queries']['Insert']>;
      };
    };
    
    Views: {
      // Add views if needed
    };
    
    Functions: {
      // Database functions
      get_user_conversations: {
        Args: { user_id_param: string };
        Returns: Database['public']['Tables']['conversations']['Row'][];
      };
      
      get_conversation_messages: {
        Args: { 
          conversation_id_param: string;
          limit_param?: number;
          offset_param?: number;
        };
        Returns: Database['public']['Tables']['chat_messages']['Row'][];
      };
    };

    Enums: {
      user_role: 'user' | 'admin' | 'researcher';
      approval_status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
    };
  };
}

/**
 * Extended UIMessage type with academic metadata
 * Matches AcademicUIMessage from ChatContainer
 */
export interface DatabaseUIMessage extends UIMessage {
  metadata?: {
    timestamp?: number;
    model?: string;
    tokens?: number;
    conversationId?: string;
  };
}

/**
 * Conversation management types
 */
export interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  lastActivity: string;
  archived?: boolean;
}

export interface ConversationDetails {
  conversation: Database['public']['Tables']['conversations']['Row'];
  messages: DatabaseUIMessage[];
}

/**
 * Chat session management types
 */
export interface ActiveChatSession {
  id: string;
  conversationId: string;
  userId: string;
  status: 'active' | 'paused';
  startedAt: string;
  activityData: {
    lastMessageAt?: string;
    messagesCount: number;
  };
}

/**
 * Performance monitoring types
 */
export interface ChatPerformanceMetrics {
  saveTime: number;
  loadTime: number;
  messageCount: number;
  conversationId: string;
  timestamp: number;
}

/**
 * Real-time subscription types
 */
export interface RealtimeChatEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  table: 'chat_messages' | 'conversations';
  new?: any;
  old?: any;
}

/**
 * Error types for database operations
 */
export interface DatabaseError {
  code: string;
  message: string;
  details?: string;
  hint?: string;
}

/**
 * API response types
 */
export interface DatabaseResponse<T> {
  success: boolean;
  data?: T;
  error?: DatabaseError;
  performance?: {
    queryTime: number;
    recordCount: number;
  };
}

// Export utility types
export type ConversationRow = Database['public']['Tables']['conversations']['Row'];
export type ChatMessageRow = Database['public']['Tables']['chat_messages']['Row'];
export type UserRow = Database['public']['Tables']['users']['Row'];
export type ModelConfigRow = Database['public']['Tables']['model_configs']['Row'];
export type AdminSettingRow = Database['public']['Tables']['admin_settings']['Row'];
export type SystemPromptRow = Database['public']['Tables']['system_prompts']['Row'];
export type FallbackSystemPromptRow = Database['public']['Tables']['fallback_system_prompts']['Row'];