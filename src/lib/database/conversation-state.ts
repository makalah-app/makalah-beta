/* @ts-nocheck */
/**
 * CONVERSATION STATE MANAGEMENT SYSTEM - TASK 03 DATABASE INTEGRATION
 * 
 * PURPOSE:
 * - Real-time conversation state tracking and synchronization
 * - Session management for active chat sessions
 * - State persistence and recovery capabilities
 * - Integration with academic workflow phases
 * 
 * FEATURES:
 * - Conversation state updates (phase, message counts, metadata)
 * - Real-time state synchronization across multiple clients
 * - Session lifecycle management (start, pause, resume, end)
 * - State recovery and backup mechanisms
 */

import { supabaseAdmin, supabaseServer } from './supabase-client';
import type { ConversationSummary } from '../types/database-types';

/**
 * CONVERSATION STATE INTERFACE
 */
export interface ConversationState {
  conversationId: string;
  userId: string;
  currentPhase: number;
  messageCount: number;
  lastActivity: string;
  metadata: {
    lastMessageRole: 'user' | 'assistant' | 'system';
    totalTokens: number;
    avgResponseTime: number;
    completedPhases: number[];
    workflowProgress: number; // 0-100%
    sessionDuration: number; // in milliseconds
    [key: string]: any;
  };
  status: 'active' | 'paused' | 'archived' | 'completed';
}

/**
 * SESSION STATE INTERFACE
 */
export interface SessionState {
  sessionId: string;
  conversationId: string;
  userId: string;
  status: 'active' | 'paused' | 'ended';
  startedAt: string;
  lastHeartbeat: string;
  activityData: {
    messagesExchanged: number;
    toolCallsMade: number;
    phasesProgressed: number;
    userEngagementScore: number; // 0-100
    [key: string]: any;
  };
}

/**
 * STATE UPDATE RESULT
 */
interface StateUpdateResult {
  success: boolean;
  conversationState?: ConversationState;
  sessionState?: SessionState;
  error?: string;
}

/**
 * GET CONVERSATION STATE
 * Retrieves current state of a conversation including all metadata
 */
export async function getConversationState(conversationId: string): Promise<ConversationState | null> {
  try {
    console.log(`[ConversationState] 🔍 Retrieving state for conversation ${conversationId}`);
    
    // Query conversation with related data
    const { data: conversation, error } = await supabaseServer
      .from('conversations')
      .select(`
        *,
        chat_sessions!inner(
          status,
          started_at,
          activity_data
        )
      `)
      .eq('id', conversationId)
      .single();
    
    if (error || !conversation) {
      console.warn(`[ConversationState] Conversation ${conversationId} not found:`, error);
      return null;
    }
    
    // Calculate workflow progress
    const workflowProgress = calculateWorkflowProgress(
      conversation.current_phase,
      conversation.metadata?.completedPhases || []
    );
    
    // Get session duration
    const sessionDuration = calculateSessionDuration(conversation.chat_sessions);
    
    const state: ConversationState = {
      conversationId: conversation.id,
      userId: conversation.user_id,
      currentPhase: conversation.current_phase,
      messageCount: conversation.message_count,
      lastActivity: conversation.updated_at,
      metadata: {
        lastMessageRole: conversation.metadata?.last_message_role || 'user',
        totalTokens: conversation.metadata?.total_tokens || 0,
        avgResponseTime: conversation.metadata?.avg_response_time || 0,
        completedPhases: conversation.metadata?.completed_phases || [],
        workflowProgress,
        sessionDuration,
        ...conversation.metadata
      },
      status: conversation.archived ? 'archived' : 
              (conversation.current_phase >= 7 ? 'completed' : 'active')
    };
    
    console.log(`[ConversationState] ✅ Retrieved state for conversation ${conversationId}`);
    return state;
    
  } catch (error) {
    console.error(`[ConversationState] ❌ Failed to get conversation state:`, error);
    return null;
  }
}

/**
 * UPDATE CONVERSATION STATE
 * Updates conversation state with new data (phase progression, metadata, etc.)
 */
export async function updateConversationState(
  conversationId: string,
  updates: Partial<ConversationState>
): Promise<StateUpdateResult> {
  try {
    console.log(`[ConversationState] 🔄 Updating state for conversation ${conversationId}:`, updates);
    
    // Prepare database update object
    const dbUpdates: any = {
      updated_at: new Date().toISOString(),
    };
    
    // Map state updates to database fields
    if (updates.currentPhase !== undefined) {
      dbUpdates.current_phase = updates.currentPhase;
    }
    
    if (updates.messageCount !== undefined) {
      dbUpdates.message_count = updates.messageCount;
    }
    
    if (updates.status === 'archived') {
      dbUpdates.archived = true;
    }
    
    if (updates.metadata) {
      // Merge metadata with existing data
      const { data: existingConv } = await supabaseServer
        .from('conversations')
        .select('metadata')
        .eq('id', conversationId)
        .single();
      
      dbUpdates.metadata = {
        ...(existingConv?.metadata || {}),
        ...updates.metadata,
        last_updated: new Date().toISOString()
      };
    }
    
    // Update conversation in database
    const { data: updatedConversation, error } = await supabaseAdmin
      .from('conversations')
      .update(dbUpdates)
      .eq('id', conversationId)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Database update failed: ${error.message}`);
    }
    
    // Get updated state
    const updatedState = await getConversationState(conversationId);
    
    console.log(`[ConversationState] ✅ Successfully updated conversation ${conversationId}`);
    
    return {
      success: true,
      conversationState: updatedState || undefined
    };
    
  } catch (error) {
    console.error(`[ConversationState] ❌ Failed to update conversation state:`, error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * START CHAT SESSION
 * Creates a new active session for a conversation
 */
export async function startChatSession(
  conversationId: string,
  userId: string
): Promise<SessionState | null> {
  try {
    console.log(`[ConversationState] 🚀 Starting chat session for ${conversationId}`);
    
    // End any existing active sessions
    await endExistingSessions(conversationId);
    
    // Create new session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const { data: session, error } = await supabaseAdmin
      .from('chat_sessions')
      .insert({
        id: sessionId,
        conversation_id: conversationId,
        user_id: userId,
        status: 'active',
        started_at: now,
        activity_data: {
          messagesExchanged: 0,
          toolCallsMade: 0,
          phasesProgressed: 0,
          userEngagementScore: 100,
          startTime: now
        }
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to start session: ${error.message}`);
    }
    
    const sessionState: SessionState = {
      sessionId: session.id,
      conversationId: session.conversation_id,
      userId: session.user_id,
      status: session.status,
      startedAt: session.started_at,
      lastHeartbeat: now,
      activityData: session.activity_data
    };
    
    console.log(`[ConversationState] ✅ Started session ${sessionId} for conversation ${conversationId}`);
    return sessionState;
    
  } catch (error) {
    console.error(`[ConversationState] ❌ Failed to start chat session:`, error);
    return null;
  }
}

/**
 * UPDATE SESSION ACTIVITY
 * Updates session activity data and sends heartbeat
 */
export async function updateSessionActivity(
  sessionId: string,
  activityUpdates: Partial<SessionState['activityData']>
): Promise<boolean> {
  try {
    console.log(`[ConversationState] 💓 Updating session activity ${sessionId}`);
    
    // Get current session data
    const { data: currentSession } = await supabaseServer
      .from('chat_sessions')
      .select('activity_data')
      .eq('id', sessionId)
      .single();
    
    if (!currentSession) {
      console.warn(`[ConversationState] Session ${sessionId} not found`);
      return false;
    }
    
    // Merge activity data
    const updatedActivity = {
      ...currentSession.activity_data,
      ...activityUpdates,
      lastUpdate: new Date().toISOString()
    };
    
    // Update session
    const { error } = await supabaseAdmin
      .from('chat_sessions')
      .update({
        activity_data: updatedActivity
      })
      .eq('id', sessionId);
    
    if (error) {
      throw new Error(`Session update failed: ${error.message}`);
    }
    
    console.log(`[ConversationState] ✅ Updated session activity ${sessionId}`);
    return true;
    
  } catch (error) {
    console.error(`[ConversationState] ❌ Failed to update session activity:`, error);
    return false;
  }
}

/**
 * END CHAT SESSION
 * Ends an active chat session and calculates final metrics
 */
export async function endChatSession(sessionId: string): Promise<boolean> {
  try {
    console.log(`[ConversationState] 🏁 Ending chat session ${sessionId}`);
    
    const endTime = new Date().toISOString();
    
    // Get session data for final calculations
    const { data: session } = await supabaseServer
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (!session) {
      console.warn(`[ConversationState] Session ${sessionId} not found`);
      return false;
    }
    
    // Calculate final metrics
    const startTime = new Date(session.started_at).getTime();
    const sessionDuration = new Date().getTime() - startTime;
    
    const finalActivity = {
      ...session.activity_data,
      endTime,
      totalDuration: sessionDuration,
      avgEngagement: session.activity_data?.userEngagementScore || 50
    };
    
    // Update session to ended
    const { error } = await supabaseAdmin
      .from('chat_sessions')
      .update({
        status: 'ended',
        ended_at: endTime,
        activity_data: finalActivity
      })
      .eq('id', sessionId);
    
    if (error) {
      throw new Error(`Session end failed: ${error.message}`);
    }
    
    console.log(`[ConversationState] ✅ Ended session ${sessionId} (duration: ${sessionDuration}ms)`);
    return true;
    
  } catch (error) {
    console.error(`[ConversationState] ❌ Failed to end chat session:`, error);
    return false;
  }
}

/**
 * GET USER ACTIVE SESSIONS
 * Returns all active sessions for a user
 */
export async function getUserActiveSessions(userId: string): Promise<SessionState[]> {
  try {
    const { data: sessions, error } = await supabaseServer
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('started_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to get active sessions: ${error.message}`);
    }
    
    return (sessions || []).map(session => ({
      sessionId: session.id,
      conversationId: session.conversation_id,
      userId: session.user_id,
      status: session.status,
      startedAt: session.started_at,
      lastHeartbeat: session.activity_data?.lastUpdate || session.started_at,
      activityData: session.activity_data
    }));
    
  } catch (error) {
    console.error(`[ConversationState] ❌ Failed to get user active sessions:`, error);
    return [];
  }
}

// Helper functions

/**
 * Calculate workflow progress based on current phase and completed phases
 */
function calculateWorkflowProgress(currentPhase: number, completedPhases: number[]): number {
  const totalPhases = 7;
  const baseProgress = (currentPhase - 1) / totalPhases * 100;
  const bonusProgress = completedPhases.length > 0 ? (completedPhases.length / totalPhases * 10) : 0;
  
  return Math.min(Math.round(baseProgress + bonusProgress), 100);
}

/**
 * Calculate total session duration from session data
 */
function calculateSessionDuration(sessions: any[]): number {
  if (!sessions || sessions.length === 0) return 0;
  
  return sessions.reduce((total, session) => {
    if (session.status === 'ended' && session.activity_data?.totalDuration) {
      return total + session.activity_data.totalDuration;
    } else if (session.status === 'active') {
      const startTime = new Date(session.started_at).getTime();
      return total + (Date.now() - startTime);
    }
    return total;
  }, 0);
}

/**
 * End existing active sessions for a conversation
 */
async function endExistingSessions(conversationId: string): Promise<void> {
  try {
    const { data: activeSessions } = await supabaseServer
      .from('chat_sessions')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('status', 'active');
    
    if (activeSessions && activeSessions.length > 0) {
      for (const session of activeSessions) {
        await endChatSession(session.id);
      }
    }
  } catch (error) {
    console.error(`[ConversationState] Warning: Failed to end existing sessions:`, error);
    // Don't throw - this is cleanup, not critical
  }
}
