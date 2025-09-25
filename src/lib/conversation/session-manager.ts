/**
 * CONVERSATION SESSION LIFECYCLE MANAGER - PHASE 2 IMPLEMENTATION
 * 
 * TECHNICAL SPECIFICATIONS:
 * - Conversation session lifecycle management
 * - Academic workflow session state tracking
 * - Phase progression monitoring and validation
 * - 100% AI SDK v5 compliance using ONLY /Users/eriksupit/Desktop/makalah/documentation as primary source
 * 
 * SESSION FEATURES:
 * - Session initialization and management
 * - Phase transition handling
 * - State persistence and recovery
 * - Academic workflow validation
 */

import { UIMessage } from 'ai';
import { conversationManager } from './conversation-manager';
import type { ConversationDetails } from '../types/database-types';

export interface ConversationSession {
  id: string;
  conversationId: string;
  userId: string;
  currentPhase: number;
  phaseStartTime: number;
  sessionStartTime: number;
  lastActivity: number;
  state: ConversationSessionState;
  metadata: SessionMetadata;
  workflowTemplate: string;
  phaseHistory: PhaseHistoryEntry[];
  isActive: boolean;
}

export interface ConversationSessionState {
  phase: number;
  phaseComplete: boolean;
  awaitingApproval: boolean;
  approvalContext?: any;
  messageCount: number;
  lastMessageId?: string;
  workflowProgress: WorkflowProgress;
  contextData: any;
}

export interface SessionMetadata {
  userAgent?: string;
  sessionVersion: string;
  createdAt: number;
  lastUpdateAt: number;
  totalDuration: number;
  phaseChangeCount: number;
  messagesSinceLastSave: number;
  flags: SessionFlags;
}

export interface SessionFlags {
  autoSave: boolean;
  persistSession: boolean;
  trackAnalytics: boolean;
  enableDebug: boolean;
}

export interface WorkflowProgress {
  totalPhases: number;
  completedPhases: number[];
  currentPhaseProgress: number;
  estimatedTimeRemaining?: number;
  qualityScore?: number;
}

export interface PhaseHistoryEntry {
  phase: number;
  startTime: number;
  endTime?: number;
  duration?: number;
  messageCount: number;
  approved: boolean;
  artifactsGenerated: string[];
  qualityMetrics?: any;
}

export interface SessionInitializationOptions {
  userId: string;
  conversationId?: string;
  workflowTemplate?: string;
  initialPhase?: number;
  autoSave?: boolean;
  persistSession?: boolean;
}

export interface PhaseTransitionRequest {
  fromPhase: number;
  toPhase: number;
  approved: boolean;
  approvalData?: any;
  artifactIds?: string[];
}

/**
 * CONVERSATION SESSION MANAGER CLASS
 * 
 * Manages conversation session lifecycle with academic workflow support
 */
export class ConversationSessionManager {
  private sessions: Map<string, ConversationSession> = new Map();
  private sessionTimers: Map<string, NodeJS.Timeout> = new Map();
  private saveInterval: number = 30000; // Auto-save every 30 seconds
  
  constructor() {
    // Initialize session cleanup on startup
    this.initializeSessionCleanup();
  }
  
  /**
   * Initialize a new conversation session
   */
  async initializeSession(options: SessionInitializationOptions): Promise<ConversationSession> {
    try {
      console.log('[SessionManager] Initializing session:', options);
      
      // Generate session ID
      const sessionId = this.generateSessionId();
      
      // Determine conversation ID
      let conversationId = options.conversationId;
      if (!conversationId) {
        // Create new conversation
        const createResponse = await conversationManager.createConversation({
          userId: options.userId,
          workflowTemplate: options.workflowTemplate || 'academic_writing',
          phase: options.initialPhase || 1
        });
        conversationId = createResponse.conversation.id;
      }
      
      // Create session object
      const session: ConversationSession = {
        id: sessionId,
        conversationId,
        userId: options.userId,
        currentPhase: options.initialPhase || 1,
        phaseStartTime: Date.now(),
        sessionStartTime: Date.now(),
        lastActivity: Date.now(),
        state: {
          phase: options.initialPhase || 1,
          phaseComplete: false,
          awaitingApproval: false,
          messageCount: 0,
          workflowProgress: {
            totalPhases: 7,
            completedPhases: [],
            currentPhaseProgress: 0
          },
          contextData: {}
        },
        metadata: {
          sessionVersion: '2.0',
          createdAt: Date.now(),
          lastUpdateAt: Date.now(),
          totalDuration: 0,
          phaseChangeCount: 0,
          messagesSinceLastSave: 0,
          flags: {
            autoSave: options.autoSave !== false,
            persistSession: options.persistSession !== false,
            trackAnalytics: true,
            enableDebug: process.env.NODE_ENV === 'development'
          }
        },
        workflowTemplate: options.workflowTemplate || 'academic_writing',
        phaseHistory: [{
          phase: options.initialPhase || 1,
          startTime: Date.now(),
          messageCount: 0,
          approved: false,
          artifactsGenerated: []
        }],
        isActive: true
      };
      
      // Store session
      this.sessions.set(sessionId, session);
      
      // Set up auto-save if enabled
      if (session.metadata.flags.autoSave) {
        this.setupAutoSave(sessionId);
      }
      
      console.log('[SessionManager] Session initialized:', sessionId, 'for conversation:', conversationId);
      
      return session;
      
    } catch (error) {
      console.error('[SessionManager] Error initializing session:', error);
      throw error;
    }
  }
  
  /**
   * Get active session
   */
  getSession(sessionId: string): ConversationSession | null {
    return this.sessions.get(sessionId) || null;
  }
  
  /**
   * Update session activity
   */
  updateSessionActivity(sessionId: string, messageId?: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.lastActivity = Date.now();
    session.metadata.lastUpdateAt = Date.now();
    session.metadata.totalDuration = Date.now() - session.sessionStartTime;
    
    if (messageId && messageId !== session.state.lastMessageId) {
      session.state.messageCount++;
      session.state.lastMessageId = messageId;
      session.metadata.messagesSinceLastSave++;
      
      // Update current phase history
      const currentPhaseHistory = session.phaseHistory[session.phaseHistory.length - 1];
      if (currentPhaseHistory && !currentPhaseHistory.endTime) {
        currentPhaseHistory.messageCount = session.state.messageCount;
      }
    }
    
    console.log(`[SessionManager] Session ${sessionId} activity updated`);
  }
  
  /**
   * Handle phase transition
   */
  async transitionPhase(sessionId: string, transitionRequest: PhaseTransitionRequest): Promise<boolean> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }
      
      console.log(`[SessionManager] Phase transition requested for session ${sessionId}:`, transitionRequest);
      
      // Validate phase transition
      if (transitionRequest.fromPhase !== session.currentPhase) {
        throw new Error(`Phase mismatch: expected ${session.currentPhase}, got ${transitionRequest.fromPhase}`);
      }
      
      if (transitionRequest.toPhase !== transitionRequest.fromPhase + 1) {
        throw new Error('Only sequential phase transitions are allowed');
      }
      
      if (!transitionRequest.approved) {
        console.log(`[SessionManager] Phase ${transitionRequest.fromPhase} transition not approved`);
        session.state.awaitingApproval = true;
        session.state.approvalContext = transitionRequest.approvalData;
        return false;
      }
      
      // Complete current phase
      const currentPhaseHistory = session.phaseHistory[session.phaseHistory.length - 1];
      if (currentPhaseHistory && !currentPhaseHistory.endTime) {
        currentPhaseHistory.endTime = Date.now();
        currentPhaseHistory.duration = currentPhaseHistory.endTime - currentPhaseHistory.startTime;
        currentPhaseHistory.approved = true;
        currentPhaseHistory.artifactsGenerated = transitionRequest.artifactIds || [];
      }
      
      // Update session state
      session.currentPhase = transitionRequest.toPhase;
      session.state.phase = transitionRequest.toPhase;
      session.state.phaseComplete = false;
      session.state.awaitingApproval = false;
      session.state.approvalContext = undefined;
      session.phaseStartTime = Date.now();
      session.metadata.phaseChangeCount++;
      
      // Add completed phase to progress
      session.state.workflowProgress.completedPhases.push(transitionRequest.fromPhase);
      session.state.workflowProgress.currentPhaseProgress = 0;
      
      // Start new phase history
      session.phaseHistory.push({
        phase: transitionRequest.toPhase,
        startTime: Date.now(),
        messageCount: 0,
        approved: false,
        artifactsGenerated: []
      });
      
      // Update conversation in database
      try {
        await conversationManager.updateConversation(session.conversationId, {
          currentPhase: transitionRequest.toPhase,
          metadata: {
            ...session.metadata,
            phaseTransitionedAt: Date.now(),
            phaseHistory: session.phaseHistory
          }
        });
      } catch (error) {
        console.warn('[SessionManager] Failed to update conversation phase:', error);
        // Don't fail the transition for database errors
      }
      
      console.log(`[SessionManager] Phase transition successful: ${transitionRequest.fromPhase} → ${transitionRequest.toPhase}`);
      
      return true;
      
    } catch (error) {
      console.error('[SessionManager] Error during phase transition:', error);
      throw error;
    }
  }
  
  /**
   * Mark phase as complete and awaiting approval
   */
  markPhaseComplete(sessionId: string, completionData?: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.state.phaseComplete = true;
    session.state.awaitingApproval = true;
    session.state.approvalContext = completionData;
    session.state.workflowProgress.currentPhaseProgress = 100;
    
    console.log(`[SessionManager] Phase ${session.currentPhase} marked complete for session ${sessionId}`);
  }
  
  /**
   * Save session state
   */
  async saveSession(sessionId: string): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) return;
      
      // Update session metadata
      session.metadata.lastUpdateAt = Date.now();
      session.metadata.totalDuration = Date.now() - session.sessionStartTime;
      session.metadata.messagesSinceLastSave = 0;
      
      // In a real implementation, this would save to database
      // For now, we just update the conversation metadata
      await conversationManager.updateConversation(session.conversationId, {
        metadata: {
          sessionState: session.state,
          sessionMetadata: session.metadata,
          phaseHistory: session.phaseHistory,
          lastSavedAt: Date.now()
        }
      });
      
      console.log(`[SessionManager] Session ${sessionId} saved`);
      
    } catch (error) {
      console.error('[SessionManager] Error saving session:', error);
    }
  }
  
  /**
   * Restore session from conversation data
   */
  async restoreSession(conversationId: string, userId: string): Promise<ConversationSession | null> {
    try {
      console.log('[SessionManager] Restoring session for conversation:', conversationId);
      
      // Load conversation details
      const conversationResponse = await conversationManager.getConversation(conversationId);
      const conversation = conversationResponse.conversation;
      
      if (!conversation || conversation.user_id !== userId) {
        throw new Error('Conversation not found or access denied');
      }
      
      // Extract session data from conversation metadata
      const sessionState = conversation.metadata?.sessionState;
      const sessionMetadata = conversation.metadata?.sessionMetadata;
      const phaseHistory = conversation.metadata?.phaseHistory || [];
      
      // Generate new session ID
      const sessionId = this.generateSessionId();
      
      // Create restored session
      const session: ConversationSession = {
        id: sessionId,
        conversationId,
        userId,
        currentPhase: conversation.current_phase || 1,
        phaseStartTime: Date.now(),
        sessionStartTime: Date.now(),
        lastActivity: Date.now(),
        state: sessionState || {
          phase: conversation.current_phase || 1,
          phaseComplete: false,
          awaitingApproval: false,
          messageCount: conversation.message_count || 0,
          workflowProgress: {
            totalPhases: 7,
            completedPhases: [],
            currentPhaseProgress: 0
          },
          contextData: {}
        },
        metadata: sessionMetadata || {
          sessionVersion: '2.0',
          createdAt: Date.now(),
          lastUpdateAt: Date.now(),
          totalDuration: 0,
          phaseChangeCount: 0,
          messagesSinceLastSave: 0,
          flags: {
            autoSave: true,
            persistSession: true,
            trackAnalytics: true,
            enableDebug: false
          }
        },
        workflowTemplate: conversation.metadata?.workflowTemplate || 'academic_writing',
        phaseHistory: phaseHistory.length > 0 ? phaseHistory : [{
          phase: conversation.current_phase || 1,
          startTime: Date.now(),
          messageCount: conversation.message_count || 0,
          approved: false,
          artifactsGenerated: []
        }],
        isActive: true
      };
      
      // Store restored session
      this.sessions.set(sessionId, session);
      
      // Set up auto-save if enabled
      if (session.metadata.flags.autoSave) {
        this.setupAutoSave(sessionId);
      }
      
      console.log('[SessionManager] Session restored:', sessionId);
      
      return session;
      
    } catch (error) {
      console.error('[SessionManager] Error restoring session:', error);
      return null;
    }
  }
  
  /**
   * End session
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) return;
      
      session.isActive = false;
      
      // Save final state
      await this.saveSession(sessionId);
      
      // Clear auto-save timer
      const timer = this.sessionTimers.get(sessionId);
      if (timer) {
        clearInterval(timer);
        this.sessionTimers.delete(sessionId);
      }
      
      // Remove from active sessions
      this.sessions.delete(sessionId);
      
      console.log(`[SessionManager] Session ${sessionId} ended`);
      
    } catch (error) {
      console.error('[SessionManager] Error ending session:', error);
    }
  }
  
  /**
   * Get session statistics
   */
  getSessionStatistics(sessionId: string): {
    duration: number;
    messageCount: number;
    currentPhase: number;
    completedPhases: number;
    averagePhaseTime: number;
    progress: number;
  } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    const completedPhases = session.state.workflowProgress.completedPhases.length;
    const totalPhaseTime = session.phaseHistory
      .filter(p => p.duration)
      .reduce((sum, p) => sum + (p.duration || 0), 0);
    
    return {
      duration: session.metadata.totalDuration,
      messageCount: session.state.messageCount,
      currentPhase: session.currentPhase,
      completedPhases,
      averagePhaseTime: completedPhases > 0 ? totalPhaseTime / completedPhases : 0,
      progress: Math.round((completedPhases / 7) * 100)
    };
  }
  
  // Private methods
  
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private setupAutoSave(sessionId: string): void {
    const timer = setInterval(() => {
      this.saveSession(sessionId).catch(error => {
        console.error(`[SessionManager] Auto-save failed for session ${sessionId}:`, error);
      });
    }, this.saveInterval);
    
    this.sessionTimers.set(sessionId, timer);
  }
  
  private initializeSessionCleanup(): void {
    // Clean up inactive sessions every 5 minutes
    setInterval(() => {
      const now = Date.now();
      const inactivityThreshold = 30 * 60 * 1000; // 30 minutes
      
      for (const [sessionId, session] of this.sessions.entries()) {
        if (now - session.lastActivity > inactivityThreshold) {
          console.log(`[SessionManager] Cleaning up inactive session: ${sessionId}`);
          this.endSession(sessionId);
        }
      }
    }, 5 * 60 * 1000);
  }
}

/**
 * DEFAULT SESSION MANAGER INSTANCE
 */
export const sessionManager = new ConversationSessionManager();