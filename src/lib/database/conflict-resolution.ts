/**
 * Conflict Resolution Utilities - Phase 3 Implementation
 * 
 * DOCUMENTATION COMPLIANCE:
 * - Implements conflict resolution for concurrent message editing
 * - Uses version control patterns for message consistency
 * - Provides automatic and manual conflict resolution strategies
 * 
 * PHASE 3 FEATURES:
 * - Concurrent editing detection
 * - Version-based conflict resolution
 * - Automatic merge strategies
 * - User-intervention workflows
 * - Performance-optimized resolution
 */

import { generateId, UIMessage } from 'ai';
import { supabaseChatClient } from './supabase-client';
import type { AcademicUIMessage } from '../../components/chat/ChatContainer';
import type { ConflictResolution } from './real-time-utils';
import { realtimeManager } from './real-time-utils';

export interface MessageVersion {
  id: string;
  messageId: string;
  conversationId: string;
  version: number;
  content: any;
  metadata: any;
  userId: string;
  timestamp: number;
  parentVersion?: number;
  conflictResolved: boolean;
}

export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: DetectedConflict[];
  affectedMessages: string[];
  resolutionRequired: boolean;
}

export interface DetectedConflict {
  messageId: string;
  conflictType: 'concurrent_edit' | 'version_mismatch' | 'state_conflict' | 'content_conflict';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  conflictingVersions: MessageVersion[];
  suggestedResolution: 'auto_merge' | 'last_writer_wins' | 'user_choice' | 'manual_review';
  resolutionData?: any;
}

export interface ConflictResolutionStrategy {
  name: string;
  description: string;
  canAutoResolve: boolean;
  resolve: (conflict: DetectedConflict) => Promise<ConflictResolutionResult>;
}

export interface ConflictResolutionResult {
  success: boolean;
  resolvedVersion: MessageVersion | null;
  strategy: string;
  conflictsRemaining: DetectedConflict[];
  error?: string;
  requiresUserInput?: boolean;
  userChoices?: any[];
}

/**
 * Conflict Detection Engine
 */
export class ConflictDetectionEngine {
  /**
   * Detect conflicts in message updates
   */
  async detectConflicts(
    conversationId: string,
    messageUpdates: AcademicUIMessage[]
  ): Promise<ConflictDetectionResult> {
    console.log(`[ConflictDetection] Scanning ${messageUpdates.length} messages for conflicts`);

    const conflicts: DetectedConflict[] = [];
    const affectedMessages: string[] = [];

    // Get current message versions from database
    const { data: currentVersions, error } = await supabaseChatClient
      .from('message_versions')
      .select('*')
      .eq('conversation_id', conversationId)
      .in('message_id', messageUpdates.map(m => m.id));

    if (error) {
      console.error('[ConflictDetection] Database error:', error);
      return {
        hasConflicts: false,
        conflicts: [],
        affectedMessages: [],
        resolutionRequired: false
      };
    }

    // Check each message for conflicts
    for (const message of messageUpdates) {
      const messageVersions = currentVersions?.filter(v => v.message_id === message.id) || [];
      
      if (messageVersions.length === 0) {
        // No existing versions, no conflict
        continue;
      }

      const latestVersion = messageVersions.sort((a, b) => b.version - a.version)[0];
      const messageTimestamp = message.createdAt ? new Date(message.createdAt).getTime() : Date.now();

      // Check for concurrent editing
      const concurrentEdits = messageVersions.filter(v => 
        Math.abs(v.timestamp - messageTimestamp) < 10000 // Within 10 seconds
      );

      if (concurrentEdits.length > 1) {
        conflicts.push({
          messageId: message.id,
          conflictType: 'concurrent_edit',
          severity: 'medium',
          description: `${concurrentEdits.length} users edited this message simultaneously`,
          conflictingVersions: concurrentEdits.map(v => ({
            ...v,
            content: v.content,
            metadata: v.metadata || {}
          })),
          suggestedResolution: 'last_writer_wins'
        });
        
        if (!affectedMessages.includes(message.id)) {
          affectedMessages.push(message.id);
        }
      }

      // Check for version mismatches
      const expectedVersion = (message.metadata as any)?.version || 0;
      if (expectedVersion > 0 && expectedVersion < latestVersion.version) {
        conflicts.push({
          messageId: message.id,
          conflictType: 'version_mismatch',
          severity: 'high',
          description: `Message version ${expectedVersion} conflicts with latest version ${latestVersion.version}`,
          conflictingVersions: [latestVersion],
          suggestedResolution: 'user_choice'
        });
        
        if (!affectedMessages.includes(message.id)) {
          affectedMessages.push(message.id);
        }
      }

      // Check for content conflicts
      if (this.hasContentConflict(message, latestVersion)) {
        conflicts.push({
          messageId: message.id,
          conflictType: 'content_conflict',
          severity: 'high',
          description: 'Content has diverged significantly from latest version',
          conflictingVersions: [latestVersion],
          suggestedResolution: 'manual_review'
        });
        
        if (!affectedMessages.includes(message.id)) {
          affectedMessages.push(message.id);
        }
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      affectedMessages,
      resolutionRequired: conflicts.some(c => c.suggestedResolution === 'user_choice' || c.suggestedResolution === 'manual_review')
    };
  }

  /**
   * Check if message content conflicts with existing version
   */
  private hasContentConflict(message: AcademicUIMessage, latestVersion: MessageVersion): boolean {
    const currentContent = JSON.stringify(message.content);
    const latestContent = JSON.stringify(latestVersion.content);
    
    // Simple content comparison - could be enhanced with diff algorithms
    if (currentContent === latestContent) {
      return false;
    }

    // Check content similarity (placeholder for more sophisticated comparison)
    const similarity = this.calculateContentSimilarity(currentContent, latestContent);
    return similarity < 0.7; // Less than 70% similar indicates conflict
  }

  /**
   * Calculate content similarity (simple implementation)
   */
  private calculateContentSimilarity(content1: string, content2: string): number {
    if (content1 === content2) return 1.0;
    if (content1.length === 0 || content2.length === 0) return 0.0;

    // Simple Levenshtein distance-based similarity
    const maxLength = Math.max(content1.length, content2.length);
    const distance = this.levenshteinDistance(content1, content2);
    return (maxLength - distance) / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

/**
 * Conflict Resolution Strategies
 */
export class ConflictResolutionStrategies {
  /**
   * Last Writer Wins strategy
   */
  static lastWriterWins: ConflictResolutionStrategy = {
    name: 'last_writer_wins',
    description: 'Accept the most recent version, discarding older changes',
    canAutoResolve: true,
    
    async resolve(conflict: DetectedConflict): Promise<ConflictResolutionResult> {
      console.log(`[ConflictResolution] Resolving ${conflict.messageId} with last-writer-wins`);
      
      // Find the latest version
      const latestVersion = conflict.conflictingVersions
        .sort((a, b) => b.timestamp - a.timestamp)[0];

      if (!latestVersion) {
        return {
          success: false,
          resolvedVersion: null,
          strategy: 'last_writer_wins',
          conflictsRemaining: [conflict],
          error: 'No valid version found'
        };
      }

      return {
        success: true,
        resolvedVersion: latestVersion,
        strategy: 'last_writer_wins',
        conflictsRemaining: []
      };
    }
  };

  /**
   * Auto Merge strategy
   */
  static autoMerge: ConflictResolutionStrategy = {
    name: 'auto_merge',
    description: 'Automatically merge non-conflicting changes',
    canAutoResolve: true,
    
    async resolve(conflict: DetectedConflict): Promise<ConflictResolutionResult> {
      console.log(`[ConflictResolution] Resolving ${conflict.messageId} with auto-merge`);
      
      if (conflict.conflictingVersions.length < 2) {
        return {
          success: false,
          resolvedVersion: null,
          strategy: 'auto_merge',
          conflictsRemaining: [conflict],
          error: 'Need at least 2 versions to merge'
        };
      }

      // Sort versions by timestamp
      const sortedVersions = conflict.conflictingVersions
        .sort((a, b) => a.timestamp - b.timestamp);

      // Simple merge: combine content and metadata
      const mergedVersion: MessageVersion = {
        id: generateId(),
        messageId: conflict.messageId,
        conversationId: sortedVersions[0].conversationId,
        version: Math.max(...sortedVersions.map(v => v.version)) + 1,
        content: this.mergeContent(sortedVersions.map(v => v.content)),
        metadata: this.mergeMetadata(sortedVersions.map(v => v.metadata)),
        userId: 'system_merge',
        timestamp: Date.now(),
        conflictResolved: true
      };

      return {
        success: true,
        resolvedVersion: mergedVersion,
        strategy: 'auto_merge',
        conflictsRemaining: []
      };
    }
  };

  /**
   * User Choice strategy
   */
  static userChoice: ConflictResolutionStrategy = {
    name: 'user_choice',
    description: 'Present options to user for manual selection',
    canAutoResolve: false,
    
    async resolve(conflict: DetectedConflict): Promise<ConflictResolutionResult> {
      console.log(`[ConflictResolution] Resolving ${conflict.messageId} with user-choice`);
      
      return {
        success: false,
        resolvedVersion: null,
        strategy: 'user_choice',
        conflictsRemaining: [conflict],
        requiresUserInput: true,
        userChoices: conflict.conflictingVersions.map((version, index) => ({
          id: version.id,
          label: `Version ${version.version} (${new Date(version.timestamp).toLocaleString()})`,
          preview: JSON.stringify(version.content).substring(0, 100) + '...',
          version
        }))
      };
    }
  };

  // Helper methods for merging

  private static mergeContent(contents: any[]): any {
    if (contents.length === 0) return null;
    if (contents.length === 1) return contents[0];

    // For string content, use latest
    if (typeof contents[0] === 'string') {
      return contents[contents.length - 1];
    }

    // For object content, merge properties
    if (typeof contents[0] === 'object' && contents[0] !== null) {
      return contents.reduce((merged, content) => ({
        ...merged,
        ...content
      }), {});
    }

    // Fallback to latest
    return contents[contents.length - 1];
  }

  private static mergeMetadata(metadatas: any[]): any {
    if (metadatas.length === 0) return {};
    if (metadatas.length === 1) return metadatas[0] || {};

    // Merge all metadata objects
    return metadatas.reduce((merged, metadata) => ({
      ...merged,
      ...metadata,
      // Keep arrays of unique values
      tags: [...new Set([
        ...(merged.tags || []),
        ...(metadata?.tags || [])
      ])],
      // Update version info
      lastModified: Math.max(
        merged.lastModified || 0,
        metadata?.lastModified || 0
      )
    }), {});
  }
}

/**
 * Main Conflict Resolution Manager
 */
export class ConflictResolutionManager {
  private detectionEngine: ConflictDetectionEngine;
  private strategies: Map<string, ConflictResolutionStrategy>;

  constructor() {
    this.detectionEngine = new ConflictDetectionEngine();
    this.strategies = new Map();
    
    // Register default strategies
    this.strategies.set('last_writer_wins', ConflictResolutionStrategies.lastWriterWins);
    this.strategies.set('auto_merge', ConflictResolutionStrategies.autoMerge);
    this.strategies.set('user_choice', ConflictResolutionStrategies.userChoice);
  }

  /**
   * Resolve conflicts in message updates
   */
  async resolveConflicts(
    conversationId: string,
    messageUpdates: AcademicUIMessage[]
  ): Promise<{
    success: boolean;
    resolvedMessages: AcademicUIMessage[];
    unresolvedConflicts: DetectedConflict[];
    requiresUserInput: boolean;
    userChoices?: any[];
    error?: string;
  }> {
    try {
      console.log(`[ConflictResolution] Starting resolution for ${messageUpdates.length} messages`);

      // Detect conflicts
      const detection = await this.detectionEngine.detectConflicts(conversationId, messageUpdates);
      
      if (!detection.hasConflicts) {
        return {
          success: true,
          resolvedMessages: messageUpdates,
          unresolvedConflicts: [],
          requiresUserInput: false
        };
      }

      console.log(`[ConflictResolution] Found ${detection.conflicts.length} conflicts`);

      const resolvedMessages = [...messageUpdates];
      const unresolvedConflicts: DetectedConflict[] = [];
      const userChoices: any[] = [];
      let requiresUserInput = false;

      // Resolve each conflict
      for (const conflict of detection.conflicts) {
        const strategy = this.strategies.get(conflict.suggestedResolution);
        
        if (!strategy) {
          console.warn(`[ConflictResolution] Unknown strategy: ${conflict.suggestedResolution}`);
          unresolvedConflicts.push(conflict);
          continue;
        }

        const result = await strategy.resolve(conflict);

        if (result.success && result.resolvedVersion) {
          // Update the message with resolved version
          const messageIndex = resolvedMessages.findIndex(m => m.id === conflict.messageId);
          if (messageIndex !== -1) {
            resolvedMessages[messageIndex] = {
              ...resolvedMessages[messageIndex],
              content: result.resolvedVersion.content,
              metadata: {
                ...resolvedMessages[messageIndex].metadata,
                ...result.resolvedVersion.metadata,
                version: result.resolvedVersion.version,
                conflictResolved: true
              }
            };
          }

          // Store resolved version in database
          await this.storeResolvedVersion(result.resolvedVersion);

          // Notify about resolution
          await realtimeManager.sendNotification(conversationId, {
            type: 'system_event',
            title: 'Conflict Resolved',
            message: `Message conflict resolved using ${strategy.name} strategy`,
            priority: 'low',
            data: {
              messageId: conflict.messageId,
              strategy: strategy.name,
              conflictType: conflict.conflictType
            }
          });

        } else if (result.requiresUserInput && result.userChoices) {
          requiresUserInput = true;
          userChoices.push(...result.userChoices);
          unresolvedConflicts.push(conflict);
          
        } else {
          unresolvedConflicts.push(...result.conflictsRemaining);
        }
      }

      return {
        success: unresolvedConflicts.length === 0,
        resolvedMessages,
        unresolvedConflicts,
        requiresUserInput,
        userChoices: userChoices.length > 0 ? userChoices : undefined
      };

    } catch (error) {
      console.error('[ConflictResolution] Resolution failed:', error);
      
      return {
        success: false,
        resolvedMessages: messageUpdates,
        unresolvedConflicts: [],
        requiresUserInput: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Store resolved version in database
   */
  private async storeResolvedVersion(version: MessageVersion): Promise<void> {
    try {
      const { error } = await supabaseChatClient
        .from('message_versions')
        .insert({
          id: version.id,
          message_id: version.messageId,
          conversation_id: version.conversationId,
          version: version.version,
          content: version.content,
          metadata: version.metadata,
          user_id: version.userId,
          timestamp: version.timestamp,
          parent_version: version.parentVersion,
          conflict_resolved: version.conflictResolved
        });

      if (error) {
        console.error('[ConflictResolution] Failed to store resolved version:', error);
      }
    } catch (error) {
      console.error('[ConflictResolution] Database error storing version:', error);
    }
  }

  /**
   * Handle user choice for conflict resolution
   */
  async handleUserChoice(
    conversationId: string,
    messageId: string,
    chosenVersionId: string
  ): Promise<{
    success: boolean;
    resolvedMessage?: AcademicUIMessage;
    error?: string;
  }> {
    try {
      // Get the chosen version
      const { data: version, error } = await supabaseChatClient
        .from('message_versions')
        .select('*')
        .eq('id', chosenVersionId)
        .single();

      if (error || !version) {
        return {
          success: false,
          error: 'Chosen version not found'
        };
      }

      // Create resolved message
      const resolvedMessage: AcademicUIMessage = {
        id: messageId,
        role: 'assistant', // Default role
        content: version.content,
        createdAt: new Date(version.timestamp),
        metadata: {
          ...version.metadata,
          version: version.version + 1,
          conflictResolved: true,
          resolvedBy: 'user_choice',
          resolvedAt: Date.now()
        }
      };

      // Store the resolution
      await this.storeResolvedVersion({
        ...version,
        id: generateId(),
        version: version.version + 1,
        timestamp: Date.now(),
        conflictResolved: true
      });

      // Send notification
      await realtimeManager.sendNotification(conversationId, {
        type: 'system_event',
        title: 'Conflict Resolved by User',
        message: `Message conflict resolved by user selection`,
        priority: 'low',
        data: {
          messageId,
          chosenVersion: version.version
        }
      });

      return {
        success: true,
        resolvedMessage
      };

    } catch (error) {
      console.error('[ConflictResolution] User choice handling failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const conflictResolver = new ConflictResolutionManager();

// Convenience functions
export const detectConflicts = (conversationId: string, messages: AcademicUIMessage[]) =>
  new ConflictDetectionEngine().detectConflicts(conversationId, messages);

export const resolveConflicts = (conversationId: string, messages: AcademicUIMessage[]) =>
  conflictResolver.resolveConflicts(conversationId, messages);

export const handleUserConflictChoice = (conversationId: string, messageId: string, versionId: string) =>
  conflictResolver.handleUserChoice(conversationId, messageId, versionId);

export default conflictResolver;