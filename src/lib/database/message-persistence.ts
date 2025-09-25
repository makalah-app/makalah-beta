/**
 * MESSAGE PERSISTENCE SERVICE - TASK 03 DATABASE INTEGRATION
 * 
 * CRITICAL IMPLEMENTATION REQUIREMENTS:
 * - Fire-and-forget async pattern to prevent interference with chat stream
 * - NEVER block or affect existing Task 01-02 functionality
 * - Only persist AFTER primarySuccess = true confirmation
 * - Comprehensive error isolation and recovery
 * 
 * INTEGRATION PROTECTION:
 * - Respects existing stream coordination (primaryExecuted, primarySuccess, writerUsed)
 * - Database operations run asynchronously after stream completion
 * - No impact on approval gates or HITL system functionality
 */

import { UIMessage } from 'ai';
import { saveChat, createChat } from './chat-store';
import { getValidUserUUID } from '../utils/uuid-generator';

// Enhanced academic metadata type - avoid JSX import issues
interface AcademicMetadata {
  phase?: number;
  timestamp?: number;
  model?: string;
  tokens?: number;
  artifacts?: string[];
  userId?: string;
  sequenceNumber?: number;
  persistedAt?: string;
}

// Standard UIMessage with enhanced academic metadata
type AcademicUIMessage = UIMessage<AcademicMetadata>;

/**
 * PERSISTENCE CONFIGURATION
 */
interface PersistenceConfig {
  enabled: boolean;
  maxRetries: number;
  retryDelay: number;
  timeoutMs: number;
}

const PERSISTENCE_CONFIG: PersistenceConfig = {
  enabled: true,
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  timeoutMs: 10000, // 10 seconds timeout
};

/**
 * PERSISTENCE METADATA
 */
interface PersistenceMetadata {
  conversationId?: string;
  userId?: string;
  phase?: number;
  sessionId?: string;
  streamCoordinationData: {
    primaryExecuted: boolean;
    primarySuccess: boolean;
    writerUsed: boolean;
  };
}

/**
 * PERSISTENCE RESULT
 */
interface PersistenceResult {
  success: boolean;
  conversationId?: string;
  messagesStored?: number;
  error?: string;
  timing: {
    startTime: number;
    endTime: number;
    duration: number;
  };
}

/**
 * FIRE-AND-FORGET MESSAGE PERSISTENCE
 * 
 * This function runs asynchronously WITHOUT blocking the main chat API flow.
 * It only executes AFTER primarySuccess = true to ensure stream completion.
 */
export async function persistMessagesAsync(
  messages: AcademicUIMessage[],
  metadata: PersistenceMetadata
): Promise<void> {
  const startTime = Date.now();
  
  try {
    console.log(`[MessagePersistence] 🔄 Starting persistence for ${messages.length} messages`);
    
    // CRITICAL SAFETY CHECK: Only proceed if stream completed successfully
    if (!metadata.streamCoordinationData.primarySuccess) {
      console.log(`[MessagePersistence] ⚠️ Skipping persistence - stream not successfully completed`);
      return;
    }
    
    // TIMEOUT PROTECTION: Don't run persistence indefinitely
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Persistence timeout')), PERSISTENCE_CONFIG.timeoutMs);
    });
    
    const persistencePromise = performMessagePersistence(messages, metadata);
    
    // Race between persistence and timeout
    const result = await Promise.race([persistencePromise, timeoutPromise]);
    
    console.log(`[MessagePersistence] ✅ Persistence completed:`, {
      conversationId: result.conversationId,
      messagesStored: result.messagesStored,
      duration: result.timing.duration
    });
    
  } catch (error) {
    // Re-throw error for proper handling by caller
    console.error(`[MessagePersistence] ❌ Persistence failed:`, {
      error: error instanceof Error ? error.message : String(error),
      messageCount: messages.length,
      metadata: {
        conversationId: metadata.conversationId,
        userId: metadata.userId,
        phase: metadata.phase
      },
      timing: {
        duration: Date.now() - startTime
      }
    });
    
    // Try fallback persistence if main persistence fails
    try {
      await attemptFallbackPersistence(messages, metadata);
    } catch (fallbackError) {
      // Log fallback error but still throw original error
      console.error(`[MessagePersistence] ❌ Fallback persistence also failed:`, fallbackError);
    }
    
    throw error; // Allow caller to handle appropriately
  }
}

/**
 * CORE PERSISTENCE IMPLEMENTATION
 */
async function performMessagePersistence(
  messages: AcademicUIMessage[],
  metadata: PersistenceMetadata
): Promise<PersistenceResult> {
  const startTime = Date.now();
  
  try {
    console.log(`[MessagePersistence] 📝 Persisting ${messages.length} messages to database`);
    
    // Step 1: Ensure conversation exists or create new one
    let conversationId = metadata.conversationId;
    
    if (!conversationId) {
      // Generate conversation ID for new chat
      conversationId = await createChat(
        getValidUserUUID(metadata.userId),
        extractConversationTitle(messages)
      );
      
      console.log(`[MessagePersistence] 🆕 Created new conversation: ${conversationId}`);
    }
    
    // Step 2: Enhance messages with persistence metadata
    const messagesForPersistence = messages.map((message, index) => ({
      ...message,
      metadata: {
        ...message.metadata,
        conversationId,
        userId: getValidUserUUID(metadata.userId),
        phase: metadata.phase || 1,
        sessionId: metadata.sessionId,
        persistedAt: new Date().toISOString(),
        sequenceNumber: index,
        // Preserve stream coordination data for audit
        streamCoordination: metadata.streamCoordinationData
      }
    }));
    
    // Step 3: Save messages using existing chat-store
    await saveChat({
      chatId: conversationId,
      messages: messagesForPersistence
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`[MessagePersistence] ✅ Successfully persisted ${messages.length} messages in ${duration}ms`);
    
    return {
      success: true,
      conversationId,
      messagesStored: messages.length,
      timing: {
        startTime,
        endTime,
        duration
      }
    };
    
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error(`[MessagePersistence] ❌ Persistence failed after ${duration}ms:`, error);
    
    throw new Error(
      `Message persistence failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * FALLBACK PERSISTENCE - Simple local storage backup
 */
async function attemptFallbackPersistence(
  messages: AcademicUIMessage[],
  metadata: PersistenceMetadata
): Promise<void> {
  try {
    console.log(`[MessagePersistence] 🔄 Attempting fallback persistence`);
    
    // Create fallback data structure
    const fallbackData = {
      timestamp: Date.now(),
      conversationId: metadata.conversationId || `fallback_${Date.now()}`,
      userId: getValidUserUUID(metadata.userId),
      phase: metadata.phase || 1,
      messageCount: messages.length,
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        parts: msg.parts,
        createdAt: msg.metadata?.timestamp || new Date().toISOString(),
        metadata: msg.metadata
      })),
      streamCoordination: metadata.streamCoordinationData
    };
    
    // Store in local memory cache as last resort
    if (typeof globalThis !== 'undefined') {
      if (!globalThis.messagePersistenceFallback) {
        globalThis.messagePersistenceFallback = [];
      }
      
      globalThis.messagePersistenceFallback.push(fallbackData);
      
      // Keep only last 100 fallback entries to prevent memory leak
      if (globalThis.messagePersistenceFallback.length > 100) {
        globalThis.messagePersistenceFallback = globalThis.messagePersistenceFallback.slice(-100);
      }
      
      console.log(`[MessagePersistence] ✅ Fallback persistence successful (memory cache)`);
    }
    
  } catch (fallbackError) {
    console.error(`[MessagePersistence] ❌ Even fallback persistence failed:`, fallbackError);
    // At this point, we've tried everything - just log and move on
  }
}

/**
 * CONVERSATION TITLE EXTRACTION
 */
function extractConversationTitle(messages: AcademicUIMessage[]): string {
  // Find first user message with substantial content
  for (const message of messages) {
    if (message.role === 'user' && message.parts) {
      // Extract text from parts array
      const textParts = message.parts.filter(part => part.type === 'text');
      const text = textParts.map(part => part.text).join(' ').trim();

      if (text.length > 10) {
        // Clean and truncate title
        const cleanTitle = text
          .replace(/[^\w\s-]/g, ' ') // Remove special chars except hyphens
          .replace(/\s+/g, ' ')      // Normalize whitespace
          .trim();

        return cleanTitle.length > 50
          ? cleanTitle.substring(0, 47) + '...'
          : cleanTitle;
      }
    }
  }

  return 'Academic Writing Session';
}

/**
 * PERSISTENCE HEALTH CHECK
 */
export function isPersistenceEnabled(): boolean {
  return PERSISTENCE_CONFIG.enabled;
}

/**
 * PERSISTENCE CONFIGURATION UPDATE
 */
export function updatePersistenceConfig(updates: Partial<PersistenceConfig>): void {
  Object.assign(PERSISTENCE_CONFIG, updates);
  console.log(`[MessagePersistence] 🔧 Configuration updated:`, PERSISTENCE_CONFIG);
}

/**
 * FALLBACK DATA RECOVERY (for debugging/recovery purposes)
 */
export function getFallbackData(): any[] {
  if (typeof globalThis !== 'undefined' && globalThis.messagePersistenceFallback) {
    return globalThis.messagePersistenceFallback;
  }
  return [];
}

/**
 * CLEAR FALLBACK DATA (maintenance function)
 */
export function clearFallbackData(): void {
  if (typeof globalThis !== 'undefined') {
    globalThis.messagePersistenceFallback = [];
    console.log(`[MessagePersistence] 🧹 Fallback data cleared`);
  }
}

/**
 * ARTIFACT DATA INTEGRATION - UPDATE MESSAGE WITH ARTIFACT PARTS
 * 
 * This function adds artifact data to an existing message's parts array
 * and updates the database record. Used to integrate streaming artifact data
 * into persisted messages for proper UI display after page refresh.
 */
// Track ongoing artifact operations to prevent duplicates
const artifactOperationsInProgress = new Set<string>();

export async function updateMessageWithArtifact(
  conversationId: string,
  messageId: string,
  artifactData: {
    type: 'artifact';
    id: string;
    title: string;
    content: string;
    metadata: any;
  }
): Promise<void> {
  // Create operation key for deduplication
  const operationKey = `${conversationId}:${messageId}:${artifactData.id}`;

  // Check if operation is already in progress
  if (artifactOperationsInProgress.has(operationKey)) {
    console.log(`[MessagePersistence] 🔄 Artifact operation already in progress for ${messageId}, skipping duplicate`);
    return;
  }

  // Mark operation as in progress
  artifactOperationsInProgress.add(operationKey);

  // Fire-and-forget pattern to avoid blocking main flow
  setImmediate(async () => {
    try {
      console.log(`[MessagePersistence] 🔄 Adding artifact data to message ${messageId}`);

      // Import chat-store functions
      const { loadChat, saveChat } = await import('./chat-store');

      // Load current messages
      const messages = await loadChat(conversationId);
      console.log(`[MessagePersistence] 🔍 Loaded ${messages.length} messages from conversation ${conversationId}`);

      // Find the target message
      const targetMessageIndex = messages.findIndex(msg => msg.id === messageId);
      console.log(`[MessagePersistence] 🔍 Looking for message ${messageId}, found at index: ${targetMessageIndex}`);

      if (targetMessageIndex === -1) {
        console.warn(`[MessagePersistence] ⚠️ Message ${messageId} not found in conversation ${conversationId}`);
        console.warn(`[MessagePersistence] Available message IDs:`, messages.map(m => m.id));
        return;
      }

      // Check if artifact already exists in message to prevent duplicates
      const existingParts = messages[targetMessageIndex].parts || [];
      const artifactExists = existingParts.some((part: any) =>
        part.type === 'data-artifact' &&
        part.data?.id === artifactData.id
      );

      if (artifactExists) {
        console.log(`[MessagePersistence] ⚠️ Artifact ${artifactData.id} already exists in message ${messageId}, skipping`);
        return;
      }

      // Create artifact part
      const artifactPart = {
        type: 'data-artifact' as const,
        data: artifactData
      };

      // Update message with artifact part
      const updatedMessage = {
        ...messages[targetMessageIndex],
        parts: [
          ...existingParts,
          artifactPart
        ]
      };

      // Replace message in array
      const updatedMessages = [...messages];
      updatedMessages[targetMessageIndex] = updatedMessage;

      // Save updated messages back to database
      console.log(`[MessagePersistence] 💾 Saving updated messages to database...`);
      await saveChat({
        chatId: conversationId,
        messages: updatedMessages
      });

      console.log(`[MessagePersistence] ✅ Successfully added artifact to message ${messageId}`);

    } catch (error) {
      // Error isolation - don't affect main flow
      console.error(`[MessagePersistence] ❌ Failed to add artifact to message:`, {
        conversationId,
        messageId,
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      // Always remove operation from in-progress set
      artifactOperationsInProgress.delete(operationKey);
    }
  });
}

// Type augmentation for global fallback storage
declare global {
  var messagePersistenceFallback: any[] | undefined;
}
