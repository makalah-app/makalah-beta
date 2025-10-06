/**
 * Chat Sync API Route - Phase 3 Real-time Data Synchronization
 * 
 * DOCUMENTATION COMPLIANCE:
 * - Implements real-time sync using Supabase subscriptions
 * - Uses AI SDK v5 streaming patterns for live updates
 * - Supports typing indicators and presence tracking
 * - Enables workflow state synchronization
 * 
 * PHASE 3 IMPLEMENTATION:
 * - WebSocket-based real-time communication
 * - Conflict resolution for concurrent operations
 * - Performance optimization for scalability
 */

import { NextRequest, NextResponse } from 'next/server';
import { createUIMessageStreamResponse, createUIMessageStream } from 'ai';
import {
  realtimeManager,
  initializeRealtimeSync,
  sendTyping,
  syncPhaseChange,
  notifyWorkflowEvent,
  realtimePerformance
} from '../../../../src/lib/database/real-time-utils';
import { loadChat, saveChat } from '../../../../src/lib/database/chat-store';
import { supabaseChatClient } from '../../../../src/lib/database/supabase-client';
import type { 
  PresenceState, 
  TypingIndicator, 
  WorkflowSyncEvent, 
  RealtimeNotification 
} from '../../../../src/lib/database/real-time-utils';

// Enable streaming for real-time operations
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SyncRequest {
  action: 'subscribe' | 'unsubscribe' | 'typing' | 'presence' | 'sync_workflow' | 'notify' | 'status' | 'phase_context_updated';
  conversationId: string;
  userId: string;
  username?: string;
  data?: any;
  // P0.2 EXTENSION: Phase context update data
  phaseContextData?: {
    phase: number;
    snapshotId: string;
    tokenCount?: number;
    compressionRatio?: number;
  };
}

interface SyncResponse {
  success: boolean;
  action: string;
  data?: any;
  error?: string;
  timestamp: number;
}

/**
 * POST /api/chat/sync - Handle real-time sync operations
 */
export async function POST(req: NextRequest) {
  try {
    const {
      action,
      conversationId,
      userId,
      username,
      data
    }: SyncRequest = await req.json();

    // Processing sync action - silent handling for production

    const timestamp = Date.now();
    let response: SyncResponse = {
      success: false,
      action,
      timestamp
    };

    switch (action) {
      case 'subscribe':
        response = await handleSubscribe(conversationId, userId, username || 'Unknown User');
        break;

      case 'unsubscribe':
        response = await handleUnsubscribe(conversationId);
        break;

      case 'typing':
        response = await handleTyping(conversationId, userId, username || 'Unknown User', data?.isTyping || false);
        break;

      case 'presence':
        response = await handlePresenceUpdate(conversationId, userId, data);
        break;

      case 'sync_workflow':
        response = await handleWorkflowSync(conversationId, userId, data);
        break;

      case 'notify':
        response = await handleNotification(conversationId, userId, data);
        break;

      case 'phase_context_updated':
        response = await handlePhaseContextUpdated(conversationId, userId, data?.phaseContextData);
        break;

      case 'status':
        response = await handleStatusCheck(conversationId);
        break;

      default:
        response = {
          success: false,
          action,
          error: `Unknown action: ${action}`,
          timestamp
        };
    }

    return NextResponse.json(response);

  } catch (error) {
    // API error occurred - silent handling for production
    
    return NextResponse.json({
      success: false,
      action: 'error',
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * GET /api/chat/sync?stream=true - Server-Sent Events for real-time updates
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stream = searchParams.get('stream');
  const conversationId = searchParams.get('conversationId');
  const userId = searchParams.get('userId');
  const username = searchParams.get('username');

  if (stream !== 'true' || !conversationId || !userId) {
    return NextResponse.json({
      error: 'Invalid parameters. Required: stream=true, conversationId, userId'
    }, { status: 400 });
  }

  // Starting SSE stream - silent handling for production

  // Create real-time stream using AI SDK patterns
  const realtimeStream = createUIMessageStream({
    execute: async ({ writer }) => {
      let subscriptionActive = true;

      // Set up real-time subscription with comprehensive callbacks
      const subscriptionResult = await initializeRealtimeSync(
        conversationId,
        userId,
        username || 'Unknown User',
        {
          onNewMessage: (message) => {
            if (!subscriptionActive) return;
            
            writer.write({
              type: 'data-message',
              data: {
                type: 'new_message',
                message,
                timestamp: Date.now()
              }
            });
          },

          onMessageUpdate: (message) => {
            if (!subscriptionActive) return;
            
            writer.write({
              type: 'data-message',
              data: {
                type: 'message_updated',
                message,
                timestamp: Date.now()
              }
            });
          },

          onMessageDelete: (messageId) => {
            if (!subscriptionActive) return;
            
            writer.write({
              type: 'data-message',
              data: {
                type: 'message_deleted',
                messageId,
                timestamp: Date.now()
              }
            });
          },

          onTyping: (indicator: TypingIndicator) => {
            if (!subscriptionActive) return;
            
            writer.write({
              type: 'data-typing',
              data: indicator,
              transient: true // Don't persist typing indicators
            });
          },

          onPresenceChange: (state: PresenceState) => {
            if (!subscriptionActive) return;
            
            writer.write({
              type: 'data-presence',
              data: {
                type: 'presence_change',
                presence: state,
                timestamp: Date.now()
              },
              transient: true // Don't persist presence data
            });
          },

          onWorkflowSync: (event: WorkflowSyncEvent) => {
            if (!subscriptionActive) return;

            // P0.2 ENHANCEMENT: Enhanced workflow sync dengan phase context awareness
            const eventData = {
              type: 'workflow_sync',
              event,
              timestamp: Date.now()
            };

            // Check if this is a phase completion event
            if (event.phase && event.status === 'completed') {
              // Phase completion detected - silent handling for production
              eventData.type = 'phase_completed';
            }

            writer.write({
              type: 'data-workflow',
              data: eventData
            });
          },

          onNotification: (notification: RealtimeNotification) => {
            if (!subscriptionActive) return;

            // P0.2 ENHANCEMENT: Special handling for phase_context_updated events
            if (notification.data?.type === 'phase_context_updated') {
              // Phase context updated - silent handling for production

              writer.write({
                type: 'data-phase-context',
                data: {
                  type: 'phase_context_updated',
                  phase: notification.data.phase,
                  snapshotId: notification.data.snapshotId,
                  message: `Phase ${notification.data.phase} context snapshot created`,
                  timestamp: Date.now()
                },
                transient: false // Keep for UI updates
              });
            } else {
              writer.write({
                type: 'data-notification',
                data: {
                  type: 'notification',
                  notification,
                  timestamp: Date.now()
                },
                transient: notification.type === 'system_event' // System events are transient
              });
            }
          }
        }
      );

      if (!subscriptionResult.success) {
        writer.write({
          type: 'data-error',
          data: {
            type: 'subscription_failed',
            error: subscriptionResult.error,
            timestamp: Date.now()
          },
          transient: true
        });
        return;
      }

      // Send initial connection confirmation
      writer.write({
        type: 'data-sync',
        data: {
          type: 'connected',
          conversationId,
          userId,
          timestamp: Date.now()
        },
        transient: true
      });

      // Set up heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        if (!subscriptionActive) {
          clearInterval(heartbeatInterval);
          return;
        }
        
        writer.write({
          type: 'data-heartbeat',
          data: {
            type: 'heartbeat',
            timestamp: Date.now(),
            performance: realtimePerformance.getMetrics()
          },
          transient: true
        });
      }, 30000); // Every 30 seconds

      // Clean up when stream closes
      req.signal.addEventListener('abort', async () => {
        // Client disconnected - silent handling for production
        subscriptionActive = false;
        clearInterval(heartbeatInterval);
        
        try {
          await realtimeManager.unsubscribeFromConversation(conversationId);
        } catch (error) {
          // Cleanup error occurred - silent handling for production
        }
      });

      // Keep the stream alive
      // Real-time stream established - silent handling for production
    }
  });

  return createUIMessageStreamResponse({ stream: realtimeStream });
}

// Helper functions for handling different sync operations

async function handleSubscribe(
  conversationId: string,
  userId: string,
  username: string
): Promise<SyncResponse> {
  try {
    const result = await initializeRealtimeSync(conversationId, userId, username, {
      // Basic callbacks for non-streaming subscription
      onNewMessage: (message) => {
        // New message received - silent handling for production
      },
      onWorkflowSync: (event) => {
        // Workflow sync event - silent handling for production
      },
      onNotification: (notification) => {
        // Notification received - silent handling for production
      }
    });

    return {
      success: result.success,
      action: 'subscribe',
      data: {
        conversationId,
        userId,
        subscribed: result.success,
        activeSubscriptions: realtimeManager.getActiveSubscriptions()
      },
      error: result.error,
      timestamp: Date.now()
    };
  } catch (error) {
    return {
      success: false,
      action: 'subscribe',
      error: error instanceof Error ? error.message : 'Subscription failed',
      timestamp: Date.now()
    };
  }
}

async function handleUnsubscribe(conversationId: string): Promise<SyncResponse> {
  try {
    await realtimeManager.unsubscribeFromConversation(conversationId);

    return {
      success: true,
      action: 'unsubscribe',
      data: {
        conversationId,
        activeSubscriptions: realtimeManager.getActiveSubscriptions()
      },
      timestamp: Date.now()
    };
  } catch (error) {
    return {
      success: false,
      action: 'unsubscribe',
      error: error instanceof Error ? error.message : 'Unsubscribe failed',
      timestamp: Date.now()
    };
  }
}

async function handleTyping(
  conversationId: string,
  userId: string,
  username: string,
  isTyping: boolean
): Promise<SyncResponse> {
  try {
    await sendTyping(conversationId, userId, username, isTyping);

    return {
      success: true,
      action: 'typing',
      data: {
        conversationId,
        userId,
        isTyping,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    };
  } catch (error) {
    return {
      success: false,
      action: 'typing',
      error: error instanceof Error ? error.message : 'Typing indicator failed',
      timestamp: Date.now()
    };
  }
}

async function handlePresenceUpdate(
  conversationId: string,
  userId: string,
  presenceData: Partial<PresenceState>
): Promise<SyncResponse> {
  try {
    await realtimeManager.updatePresence(conversationId, userId, presenceData);

    return {
      success: true,
      action: 'presence',
      data: {
        conversationId,
        userId,
        presence: presenceData,
        allPresence: Array.from(realtimeManager.getPresenceStates().values())
      },
      timestamp: Date.now()
    };
  } catch (error) {
    return {
      success: false,
      action: 'presence',
      error: error instanceof Error ? error.message : 'Presence update failed',
      timestamp: Date.now()
    };
  }
}

async function handleWorkflowSync(
  conversationId: string,
  userId: string,
  workflowData: {
    phase: number;
    status: WorkflowSyncEvent['status'];
    data?: any;
  }
): Promise<SyncResponse> {
  try {
    await syncPhaseChange(
      conversationId,
      workflowData.phase,
      userId,
      workflowData.status
    );

    return {
      success: true,
      action: 'sync_workflow',
      data: {
        conversationId,
        userId,
        phase: workflowData.phase,
        status: workflowData.status,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    };
  } catch (error) {
    return {
      success: false,
      action: 'sync_workflow',
      error: error instanceof Error ? error.message : 'Workflow sync failed',
      timestamp: Date.now()
    };
  }
}

async function handleNotification(
  conversationId: string,
  userId: string,
  notificationData: {
    type: RealtimeNotification['type'];
    title: string;
    message: string;
    priority?: RealtimeNotification['priority'];
    data?: any;
  }
): Promise<SyncResponse> {
  try {
    await notifyWorkflowEvent(
      conversationId,
      notificationData.type,
      notificationData.title,
      notificationData.message,
      userId,
      notificationData.priority,
      notificationData.data
    );

    return {
      success: true,
      action: 'notify',
      data: {
        conversationId,
        userId,
        notification: notificationData,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    };
  } catch (error) {
    return {
      success: false,
      action: 'notify',
      error: error instanceof Error ? error.message : 'Notification failed',
      timestamp: Date.now()
    };
  }
}

async function handleStatusCheck(conversationId: string): Promise<SyncResponse> {
  try {
    // Get current sync status and performance metrics
    const metrics = realtimePerformance.getMetrics();
    const latency = await realtimePerformance.measureLatency(conversationId);

    // Check database connectivity
    const { error: dbError } = await supabaseChatClient
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .limit(1)
      .single();

    return {
      success: true,
      action: 'status',
      data: {
        conversationId,
        database_connected: !dbError,
        database_error: dbError?.message,
        realtime_latency: latency,
        performance: metrics,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    };
  } catch (error) {
    return {
      success: false,
      action: 'status',
      error: error instanceof Error ? error.message : 'Status check failed',
      timestamp: Date.now()
    };
  }
}

/**
 * P0.2 ENDPOINT: POST phase context update manually
 */
export async function PATCH(req: NextRequest) {
  try {
    const { conversationId, phase, snapshotId, tokenCount, compressionRatio } = await req.json();

    if (!conversationId || !phase || !snapshotId) {
      return NextResponse.json({
        success: false,
        error: 'conversationId, phase, and snapshotId are required'
      }, { status: 400 });
    }

    // Manual phase context update - silent handling for production

    const response = await handlePhaseContextUpdated(
      conversationId,
      'system',
      { phase, snapshotId, tokenCount, compressionRatio }
    );

    return NextResponse.json(response);

  } catch (error) {
    // Manual phase context update error - silent handling for production

    return NextResponse.json({
      success: false,
      action: 'manual_phase_context_update',
      error: error instanceof Error ? error.message : 'Manual phase context update failed',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * PUT /api/chat/sync - Sync conversation data manually
 */
export async function PUT(req: NextRequest) {
  try {
    const { conversationId, messages, forceSync } = await req.json();

    if (!conversationId) {
      return NextResponse.json({
        success: false,
        error: 'conversationId is required'
      }, { status: 400 });
    }

    }...`);

    // Load current messages from database
    const currentMessages = await loadChat(conversationId);

    // Compare and identify conflicts if messages provided
    let conflicts = [];
    if (messages && Array.isArray(messages)) {
      conflicts = await detectConflicts(conversationId, currentMessages, messages);
    }

    // Force sync if requested or no conflicts
    if (forceSync || conflicts.length === 0) {
      if (messages) {
        
        await saveChat({ chatId: conversationId, messages });
        
      }

      return NextResponse.json({
        success: true,
        action: 'manual_sync',
        data: {
          conversationId,
          messageCount: messages?.length || currentMessages.length,
          conflicts: conflicts.length,
          synced: true
        },
        timestamp: Date.now()
      });
    }

    // Return conflicts for resolution
    return NextResponse.json({
      success: false,
      action: 'manual_sync',
      data: {
        conversationId,
        conflicts,
        requiresResolution: true
      },
      error: 'Conflicts detected - resolution required',
      timestamp: Date.now()
    }, { status: 409 });

  } catch (error) {
    // Manual sync error occurred - silent handling for production
    
    return NextResponse.json({
      success: false,
      action: 'manual_sync',
      error: error instanceof Error ? error.message : 'Manual sync failed',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

// Helper function to detect conflicts between message versions
async function detectConflicts(conversationId: string, currentMessages: any[], newMessages: any[]): Promise<any[]> {
  const conflicts = [];

  // Simple conflict detection - compare message IDs and updated timestamps
  for (const newMessage of newMessages) {
    const currentMessage = currentMessages.find(m => m.id === newMessage.id);
    
    if (currentMessage) {
      // Check if message was updated after the new message's timestamp
      const currentTime = new Date(currentMessage.created_at).getTime();
      const newTime = new Date(newMessage.createdAt || newMessage.created_at).getTime();
      
      if (currentTime > newTime) {
        conflicts.push({
          messageId: newMessage.id,
          type: 'version_conflict',
          currentVersion: currentMessage,
          newVersion: newMessage,
          timestamp: Date.now()
        });
      }
    }
  }

  // Conflicts detected - silent handling for production
  return conflicts;
}

/**
 * P0.2 HANDLER: Handle phase context updated events
 */
async function handlePhaseContextUpdated(
  conversationId: string,
  userId: string,
  phaseData: {
    phase: number;
    snapshotId: string;
    tokenCount?: number;
    compressionRatio?: number;
  }
): Promise<SyncResponse> {
  try {
    // Processing phase context update - silent handling for production

    // Emit notification untuk all subscribers
    await notifyWorkflowEvent(
      conversationId,
      'system_event',
      'Phase Context Updated',
      `Phase ${phaseData.phase} context snapshot created successfully`,
      userId,
      'medium',
      {
        type: 'phase_context_updated',
        phase: phaseData.phase,
        snapshotId: phaseData.snapshotId,
        tokenCount: phaseData.tokenCount,
        compressionRatio: phaseData.compressionRatio,
        timestamp: new Date().toISOString(),
        source: 'sync-api'
      }
    );

    return {
      success: true,
      action: 'phase_context_updated',
      data: {
        conversationId,
        userId,
        phase: phaseData.phase,
        snapshotId: phaseData.snapshotId,
        notified: true,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    };

  } catch (error) {
    // Phase context update failed - silent handling for production

    return {
      success: false,
      action: 'phase_context_updated',
      error: error instanceof Error ? error.message : 'Phase context update failed',
      timestamp: Date.now()
    };
  }
}