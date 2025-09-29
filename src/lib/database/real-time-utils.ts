// @ts-nocheck
/**
 * Real-time Synchronization Utilities - Phase 3 Implementation
 * 
 * DOCUMENTATION COMPLIANCE:
 * - Implements Supabase real-time subscriptions for live chat updates
 * - Uses streaming data patterns from AI SDK v5 documentation
 * - Supports typing indicators and presence tracking
 * - Enables real-time workflow state synchronization
 * 
 * PHASE 3 DELIVERABLES:
 * - WebSocket integration for live updates
 * - Presence tracking system for multi-user awareness
 * - Conflict resolution for concurrent message editing
 * - Real-time notification system for workflow events
 * - Collaborative features foundation
 */

import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabaseClient, supabaseChatClient, CHAT_CONFIG } from './supabase-client';
import { UIMessage, generateId } from 'ai';
import type { AcademicMetadata } from '../../components/chat/ChatContainer';
import { Database } from '../types/database-types';

// Type definitions for real-time operations
export type AcademicUIMessage = UIMessage<AcademicMetadata>;
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
export type Conversation = Database['public']['Tables']['conversations']['Row'];

export interface PresenceState {
  user_id: string;
  username?: string;
  typing: boolean;
  lastSeen: number;
  activeConversation?: string;
  currentPhase?: number;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  username?: string;
  isTyping: boolean;
  timestamp: number;
}

export interface WorkflowSyncEvent {
  conversationId: string;
  phase: number;
  status: 'in_progress' | 'completed' | 'approved' | 'rejected';
  userId: string;
  timestamp: number;
  data?: any;
}

export interface ConflictResolution {
  messageId: string;
  conversationId: string;
  conflictType: 'concurrent_edit' | 'version_mismatch' | 'state_conflict';
  originalVersion: number;
  conflictingVersions: Array<{
    version: number;
    userId: string;
    timestamp: number;
    changes: any;
  }>;
  resolution: 'accept_latest' | 'merge' | 'user_choice_required';
  resolvedData?: any;
}

export interface RealtimeNotification {
  id: string;
  type: 'phase_completion' | 'approval_needed' | 'artifact_generated' | 'workflow_updated' | 'system_event';
  title: string;
  message: string;
  conversationId?: string;
  userId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: number;
  data?: any;
  dismissed: boolean;
}

// Real-time subscription management
class RealtimeSubscriptionManager {
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  private presenceStates: Map<string, PresenceState> = new Map();
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Subscribe to conversation messages for live updates
   */
  async subscribeToConversation(
    conversationId: string,
    callbacks: {
      onNewMessage?: (message: ChatMessage) => void;
      onMessageUpdate?: (message: ChatMessage) => void;
      onMessageDelete?: (messageId: string) => void;
      onTyping?: (indicator: TypingIndicator) => void;
      onPresenceChange?: (state: PresenceState) => void;
      onWorkflowSync?: (event: WorkflowSyncEvent) => void;
      onNotification?: (notification: RealtimeNotification) => void;
    }
  ): Promise<{
    success: boolean;
    channel?: RealtimeChannel;
    error?: string;
  }> {
    try {
      const channelName = `${CHAT_CONFIG.REALTIME.CHANNEL_PREFIX}:${conversationId}`;
      
      // Check if already subscribed
      if (this.subscriptions.has(channelName)) {
        // Already subscribed to channel - silent handling for production
        return {
          success: true,
          channel: this.subscriptions.get(channelName)
        };
      }

      const channel = supabaseChatClient.channel(channelName, {
        config: {
          presence: {
            key: conversationId
          }
        }
      });

      // Subscribe to database changes for messages
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload: RealtimePostgresChangesPayload<ChatMessage>) => {
            // New message received - silent handling for production
            callbacks.onNewMessage?.(payload.new);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload: RealtimePostgresChangesPayload<ChatMessage>) => {
            // Message updated - silent handling for production
            callbacks.onMessageUpdate?.(payload.new);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'chat_messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload: RealtimePostgresChangesPayload<ChatMessage>) => {
            // Message deleted - silent handling for production
            if (payload.old?.message_id) {
              callbacks.onMessageDelete?.(payload.old.message_id);
            }
          }
        );

      // Subscribe to conversation state changes for workflow sync
      channel
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversations',
            filter: `id=eq.${conversationId}`
          },
          (payload: RealtimePostgresChangesPayload<Conversation>) => {
            const conversation = payload.new;
            const workflowEvent: WorkflowSyncEvent = {
              conversationId,
              phase: conversation.current_phase || 1,
              status: conversation.metadata?.status || 'in_progress',
              userId: conversation.user_id,
              timestamp: Date.now(),
              data: conversation.metadata
            };
            
            // Workflow state updated - silent handling for production
            callbacks.onWorkflowSync?.(workflowEvent);
          }
        );

      // Handle presence tracking
      channel
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
          // Presence sync - silent handling for production
          
          // Process presence state changes
          Object.keys(presenceState).forEach(userId => {
            const userPresence = presenceState[userId]?.[0] as PresenceState;
            if (userPresence) {
              this.presenceStates.set(userId, userPresence);
              callbacks.onPresenceChange?.(userPresence);
            }
          });
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          // User joined - silent handling for production
          newPresences.forEach((presence: PresenceState) => {
            this.presenceStates.set(presence.user_id, presence);
            callbacks.onPresenceChange?.(presence);
          });
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          // User left - silent handling for production
          leftPresences.forEach((presence: PresenceState) => {
            this.presenceStates.delete(presence.user_id);
            callbacks.onPresenceChange?.(presence);
          });
        });

      // Handle broadcast events for typing indicators and notifications
      channel
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          const typingIndicator: TypingIndicator = payload;
          // Typing indicator - silent handling for production
          callbacks.onTyping?.(typingIndicator);
        })
        .on('broadcast', { event: 'notification' }, ({ payload }) => {
          const notification: RealtimeNotification = payload;
          // Real-time notification - silent handling for production
          callbacks.onNotification?.(notification);
        });

      // Subscribe to the channel
      const subscriptionResponse = await channel.subscribe();
      
      if (subscriptionResponse === 'SUBSCRIBED') {
        this.subscriptions.set(channelName, channel);
        // Successfully subscribed to channel - silent handling for production
        
        return {
          success: true,
          channel
        };
      } else {
        throw new Error(`Subscription failed with status: ${subscriptionResponse}`);
      }

    } catch (error) {
      // Subscription failed - silent handling for production
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send typing indicator to other users
   */
  async sendTypingIndicator(
    conversationId: string,
    userId: string,
    username: string,
    isTyping: boolean
  ): Promise<void> {
    const channelName = `${CHAT_CONFIG.REALTIME.CHANNEL_PREFIX}:${conversationId}`;
    const channel = this.subscriptions.get(channelName);

    if (!channel) {
      // Channel not found for typing indicator - silent handling for production
      return;
    }

    const typingIndicator: TypingIndicator = {
      conversationId,
      userId,
      username,
      isTyping,
      timestamp: Date.now()
    };

    // Clear existing timeout
    const timeoutKey = `${conversationId}:${userId}`;
    if (this.typingTimeouts.has(timeoutKey)) {
      clearTimeout(this.typingTimeouts.get(timeoutKey)!);
    }

    // Send typing indicator
    await channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: typingIndicator
    });

    // Auto-stop typing after 3 seconds if no new typing event
    if (isTyping) {
      const timeout = setTimeout(() => {
        this.sendTypingIndicator(conversationId, userId, username, false);
      }, 3000);
      
      this.typingTimeouts.set(timeoutKey, timeout);
    }

    // Typing indicator sent - silent handling for production
  }

  /**
   * Update user presence state
   */
  async updatePresence(
    conversationId: string,
    userId: string,
    updates: Partial<PresenceState>
  ): Promise<void> {
    const channelName = `${CHAT_CONFIG.REALTIME.CHANNEL_PREFIX}:${conversationId}`;
    const channel = this.subscriptions.get(channelName);

    if (!channel) {
      // Channel not found for presence update - silent handling for production
      return;
    }

    const currentPresence = this.presenceStates.get(userId) || {
      user_id: userId,
      typing: false,
      lastSeen: Date.now()
    };

    const newPresence: PresenceState = {
      ...currentPresence,
      ...updates,
      lastSeen: Date.now()
    };

    // Track presence using Supabase presence
    await channel.track(newPresence);
    this.presenceStates.set(userId, newPresence);

    // Presence updated - silent handling for production
  }

  /**
   * Send real-time notification
   */
  async sendNotification(
    conversationId: string,
    notification: Omit<RealtimeNotification, 'id' | 'timestamp' | 'dismissed'>
  ): Promise<void> {
    const channelName = `${CHAT_CONFIG.REALTIME.CHANNEL_PREFIX}:${conversationId}`;
    const channel = this.subscriptions.get(channelName);

    if (!channel) {
      // Channel not found for notification - silent handling for production
      return;
    }

    const fullNotification: RealtimeNotification = {
      ...notification,
      id: generateId(),
      timestamp: Date.now(),
      dismissed: false
    };

    await channel.send({
      type: 'broadcast',
      event: 'notification',
      payload: fullNotification
    });

    // Notification sent - silent handling for production
  }

  /**
   * Synchronize workflow state changes
   */
  async syncWorkflowState(
    conversationId: string,
    phase: number,
    status: WorkflowSyncEvent['status'],
    userId: string,
    data?: any
  ): Promise<void> {
    try {
      // Update database first
      const { error } = await supabaseChatClient
        .from('conversations')
        .update({
          current_phase: phase,
          metadata: {
            ...data,
            status,
            last_updated_by: userId,
            last_updated_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) {
        throw error;
      }

      // Workflow state synchronized - silent handling for production

      // Send notification if phase completed
      if (status === 'completed') {
        await this.sendNotification(conversationId, {
          type: 'phase_completion',
          title: `Phase ${phase} Completed`,
          message: `Phase ${phase} has been completed and is ready for review.`,
          conversationId,
          userId,
          priority: 'medium'
        });
      }

    } catch (error) {
      // Workflow sync failed - silent handling for production
    }
  }

  /**
   * Handle conflict resolution for concurrent editing
   */
  async resolveMessageConflict(
    messageId: string,
    conversationId: string,
    conflictData: Omit<ConflictResolution, 'messageId' | 'conversationId'>
  ): Promise<ConflictResolution> {
    // Resolving message conflict - silent handling for production

    const resolution: ConflictResolution = {
      messageId,
      conversationId,
      ...conflictData
    };

    // Implement resolution strategy based on conflict type
    switch (conflictData.conflictType) {
      case 'concurrent_edit':
        // Use last-writer-wins strategy for now
        resolution.resolution = 'accept_latest';
        resolution.resolvedData = conflictData.conflictingVersions
          .sort((a, b) => b.timestamp - a.timestamp)[0]?.changes;
        break;

      case 'version_mismatch':
        // Merge non-conflicting changes
        resolution.resolution = 'merge';
        resolution.resolvedData = this.mergeVersions(conflictData.conflictingVersions);
        break;

      case 'state_conflict':
        // Require user intervention
        resolution.resolution = 'user_choice_required';
        break;

      default:
        resolution.resolution = 'accept_latest';
    }

    // Send notification about conflict resolution
    await this.sendNotification(conversationId, {
      type: 'system_event',
      title: 'Conflict Resolved',
      message: `Message conflict resolved using ${resolution.resolution} strategy.`,
      conversationId,
      priority: 'low',
      data: { resolution }
    });

    return resolution;
  }

  /**
   * Unsubscribe from a conversation
   */
  async unsubscribeFromConversation(conversationId: string): Promise<void> {
    const channelName = `${CHAT_CONFIG.REALTIME.CHANNEL_PREFIX}:${conversationId}`;
    const channel = this.subscriptions.get(channelName);

    if (channel) {
      await channel.unsubscribe();
      this.subscriptions.delete(channelName);
      
      // Clear typing timeouts for this conversation
      Array.from(this.typingTimeouts.keys())
        .filter(key => key.startsWith(conversationId))
        .forEach(key => {
          clearTimeout(this.typingTimeouts.get(key)!);
          this.typingTimeouts.delete(key);
        });

      // Unsubscribed from channel - silent handling for production
    }
  }

  /**
   * Unsubscribe from all conversations
   */
  async unsubscribeAll(): Promise<void> {
    for (const [channelName, channel] of this.subscriptions) {
      await channel.unsubscribe();
      // Unsubscribed from channel - silent handling for production
    }
    
    this.subscriptions.clear();
    
    // Clear all typing timeouts
    this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
    this.typingTimeouts.clear();
    
    // Unsubscribed from all channels - silent handling for production
  }

  /**
   * Get current presence states
   */
  getPresenceStates(): Map<string, PresenceState> {
    return new Map(this.presenceStates);
  }

  /**
   * Get active subscriptions
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  // Private helper methods

  private mergeVersions(versions: ConflictResolution['conflictingVersions']): any {
    // Simple merge strategy - this could be enhanced with more sophisticated merging
    if (versions.length === 0) return {};
    
    if (versions.length === 1) return versions[0].changes;
    
    // Merge all changes, with later timestamps taking precedence
    return versions
      .sort((a, b) => a.timestamp - b.timestamp)
      .reduce((merged, version) => ({
        ...merged,
        ...version.changes
      }), {});
  }
}

// Export singleton instance
export const realtimeManager = new RealtimeSubscriptionManager();

// Utility functions for real-time operations

/**
 * Initialize real-time sync for a conversation
 */
export async function initializeRealtimeSync(
  conversationId: string,
  userId: string,
  username: string,
  callbacks: Parameters<typeof realtimeManager.subscribeToConversation>[1]
): Promise<{
  success: boolean;
  channel?: RealtimeChannel;
  error?: string;
}> {
  // Initializing real-time sync for conversation - silent handling for production

  // Subscribe to conversation
  const subscriptionResult = await realtimeManager.subscribeToConversation(
    conversationId,
    callbacks
  );

  if (subscriptionResult.success) {
    // Set initial presence
    await realtimeManager.updatePresence(conversationId, userId, {
      user_id: userId,
      username,
      typing: false,
      activeConversation: conversationId,
      lastSeen: Date.now()
    });
  }

  return subscriptionResult;
}

/**
 * Clean up real-time sync for a conversation
 */
export async function cleanupRealtimeSync(conversationId: string): Promise<void> {
  await realtimeManager.unsubscribeFromConversation(conversationId);
}

/**
 * Send typing indicator convenience function
 */
export async function sendTyping(
  conversationId: string,
  userId: string,
  username: string,
  isTyping: boolean = true
): Promise<void> {
  await realtimeManager.sendTypingIndicator(conversationId, userId, username, isTyping);
}

/**
 * Sync workflow phase change
 */
export async function syncPhaseChange(
  conversationId: string,
  newPhase: number,
  userId: string,
  status: WorkflowSyncEvent['status'] = 'in_progress'
): Promise<void> {
  await realtimeManager.syncWorkflowState(conversationId, newPhase, status, userId);
}

/**
 * Send workflow event notification
 */
export async function notifyWorkflowEvent(
  conversationId: string,
  type: RealtimeNotification['type'],
  title: string,
  message: string,
  userId?: string,
  priority: RealtimeNotification['priority'] = 'medium',
  data?: any
): Promise<void> {
  await realtimeManager.sendNotification(conversationId, {
    type,
    title,
    message,
    conversationId,
    userId,
    priority,
    data
  });
}

// Performance monitoring for real-time operations
export const realtimePerformance = {
  subscriptionCount: () => realtimeManager.getActiveSubscriptions().length,
  presenceCount: () => realtimeManager.getPresenceStates().size,
  
  getMetrics: () => ({
    activeSubscriptions: realtimeManager.getActiveSubscriptions(),
    presenceStates: Array.from(realtimeManager.getPresenceStates().values()),
    timestamp: Date.now()
  }),

  async measureLatency(conversationId: string): Promise<number> {
    const startTime = Date.now();
    
    try {
      await realtimeManager.sendNotification(conversationId, {
        type: 'system_event',
        title: 'Latency Test',
        message: 'Testing real-time latency',
        priority: 'low',
        data: { test: true, startTime }
      });
      
      return Date.now() - startTime;
    } catch (error) {
      // Latency test failed - silent handling for production
      return -1;
    }
  }
};

export default realtimeManager;
