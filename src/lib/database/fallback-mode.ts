/**
 * Database Fallback Mode Implementation
 * 
 * PURPOSE:
 * Provides robust fallback behavior when Supabase database is unavailable
 * Maintains chat functionality using local storage and memory caching
 * 
 * COMPLIANCE:
 * - Follows AI SDK v5 patterns for persistence fallback
 * - Maintains UIMessage format compatibility
 * - Preserves conversation functionality during outages
 * 
 * INTEGRATION:
 * - Used by chat-store.ts for transparent fallback
 * - Supports conversation continuity during database issues
 * - Provides performance monitoring and health checks
 */

import { UIMessage } from 'ai';
import { generateUUID, getValidUserUUID } from '../utils/uuid-generator';
import { normalizePhase } from '../ai/workflow-engine';
import type { WorkflowPhase } from '../types/academic-message';

// Fallback storage interface
interface FallbackConversation {
  id: string;
  userId: string;
  title: string;
  messages: UIMessage[];
  currentPhase: WorkflowPhase;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
}

// In-memory storage for current session
const sessionStorage = new Map<string, FallbackConversation>();

// Local storage keys
const STORAGE_KEYS = {
  CONVERSATIONS: 'makalah_chat_conversations',
  HEALTH_STATUS: 'makalah_db_health',
  FALLBACK_MODE: 'makalah_fallback_active',
} as const;

/**
 * Database health status tracking
 */
interface DatabaseHealth {
  connected: boolean;
  lastChecked: number;
  consecutiveFailures: number;
  lastError?: string;
  fallbackActive: boolean;
}

let healthStatus: DatabaseHealth = {
  connected: true,
  lastChecked: Date.now(),
  consecutiveFailures: 0,
  fallbackActive: false,
};

/**
 * Check if database is available
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  try {
    // Try to import and test database connection
    const { checkSupabaseHealth } = await import('./supabase-client');
    const healthCheck = await checkSupabaseHealth();
    
    if (healthCheck.connected) {
      healthStatus = {
        connected: true,
        lastChecked: Date.now(),
        consecutiveFailures: 0,
        fallbackActive: false,
      };
    } else {
      healthStatus = {
        connected: false,
        lastChecked: Date.now(),
        consecutiveFailures: healthStatus.consecutiveFailures + 1,
        lastError: healthCheck.error,
        fallbackActive: healthStatus.consecutiveFailures >= 2, // Activate after 2 failures
      };
    }
  } catch (error) {
    healthStatus = {
      connected: false,
      lastChecked: Date.now(),
      consecutiveFailures: healthStatus.consecutiveFailures + 1,
      lastError: error instanceof Error ? error.message : 'Unknown error',
      fallbackActive: healthStatus.consecutiveFailures >= 2,
    };
  }
  
  // Persist health status to localStorage
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.HEALTH_STATUS, JSON.stringify(healthStatus));
    localStorage.setItem(STORAGE_KEYS.FALLBACK_MODE, String(healthStatus.fallbackActive));
  }
  
  return healthStatus;
}

/**
 * Get current database health status
 */
export function getDatabaseHealth(): DatabaseHealth {
  // Check if we have cached status from localStorage
  if (typeof localStorage !== 'undefined') {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.HEALTH_STATUS);
      if (cached) {
        const parsedHealth = JSON.parse(cached) as DatabaseHealth;
        // If status is older than 5 minutes, consider it stale
        if (Date.now() - parsedHealth.lastChecked < 5 * 60 * 1000) {
          healthStatus = parsedHealth;
        }
      }
    } catch (error) {
    }
  }
  
  return healthStatus;
}

/**
 * Check if fallback mode is active
 */
export function isFallbackModeActive(): boolean {
  const health = getDatabaseHealth();
  return health.fallbackActive || !health.connected;
}

/**
 * Fallback saveChat implementation using localStorage
 */
export async function saveChatFallback({
  chatId,
  messages,
}: {
  chatId: string;
  messages: UIMessage[];
}): Promise<void> {
  const startTime = Date.now();
  
  try {
    
    // Update session storage
    const conversation: FallbackConversation = {
      id: chatId,
      userId: getValidUserUUID(null), // Use system UUID for fallback mode
      title: generateTitleFromMessages(messages) || 'Chat Conversation',
      messages,
      currentPhase: extractPhaseFromMessages(messages),
      createdAt: sessionStorage.get(chatId)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        messageCount: messages.length,
        lastActivity: Date.now(),
        fallbackMode: true,
      },
    };
    
    sessionStorage.set(chatId, conversation);
    
    // Persist to localStorage if available
    if (typeof localStorage !== 'undefined') {
      try {
        const existingData = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
        const conversations = existingData ? JSON.parse(existingData) : {};
        conversations[chatId] = conversation;
        
        localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
      } catch (error) {
        // Continue with session storage only
      }
    }
    
    const saveTime = Date.now() - startTime;
    
  } catch (error) {
    const saveTime = Date.now() - startTime;
    throw error;
  }
}

/**
 * Fallback loadChat implementation using localStorage
 */
export async function loadChatFallback(chatId: string): Promise<UIMessage[]> {
  const startTime = Date.now();
  
  try {
    
    // First check session storage
    const sessionConversation = sessionStorage.get(chatId);
    if (sessionConversation) {
      const loadTime = Date.now() - startTime;
      return sessionConversation.messages;
    }
    
    // Then check localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        const existingData = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
        if (existingData) {
          const conversations = JSON.parse(existingData);
          const conversation = conversations[chatId];
          
          if (conversation && conversation.messages) {
            // Update session storage
            sessionStorage.set(chatId, conversation);
            
            const loadTime = Date.now() - startTime;
            return conversation.messages;
          }
        }
      } catch (error) {
      }
    }
    
    // No messages found
    const loadTime = Date.now() - startTime;
    return [];
    
  } catch (error) {
    const loadTime = Date.now() - startTime;
    throw error;
  }
}

/**
 * Create new chat ID in fallback mode
 */
export async function createChatFallback(userId?: string, title?: string): Promise<string> {
  const chatId = generateUUID(); // Use UUID for database compatibility
  
  
  // Create empty conversation entry
  const conversation: FallbackConversation = {
    id: chatId,
    userId: getValidUserUUID(userId),
    title: title || 'New Chat (Offline)',
    messages: [],
    currentPhase: 'exploring',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {
      messageCount: 0,
      fallbackMode: true,
      createdVia: 'fallback',
    },
  };
  
  sessionStorage.set(chatId, conversation);
  
  return chatId;
}

/**
 * Get conversation summaries in fallback mode
 */
export async function getUserConversationsFallback(_userId: string): Promise<{
  id: string;
  title: string;
  messageCount: number;
  lastActivity: string;
  currentPhase: WorkflowPhase;
}[]> {
  const conversations: any[] = [];
  
  try {
    // Get from session storage
    for (const conversation of Array.from(sessionStorage.values())) {
      conversations.push({
        id: conversation.id,
        title: conversation.title,
        messageCount: conversation.messages.length,
        lastActivity: conversation.updatedAt,
        currentPhase: normalizePhase(conversation.currentPhase),
      });
    }
    
    // Get from localStorage if available
    if (typeof localStorage !== 'undefined') {
      try {
        const existingData = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
        if (existingData) {
          const stored = JSON.parse(existingData);
          
          for (const [id, conversation] of Object.entries(stored)) {
            // Don't duplicate session storage entries
            if (!sessionStorage.has(id)) {
              conversations.push({
                id: (conversation as any).id,
                title: (conversation as any).title,
                messageCount: (conversation as any).messages?.length || 0,
                lastActivity: (conversation as any).updatedAt,
                currentPhase: normalizePhase((conversation as any).currentPhase),
              });
            }
          }
        }
      } catch (error) {
      }
    }
    
    // Sort by last activity
    conversations.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
    
    return conversations;
    
  } catch (error) {
    return [];
  }
}

/**
 * Sync fallback data to database when connection is restored
 */
export async function syncFallbackToDatabase(): Promise<{
  success: boolean;
  syncedCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let syncedCount = 0;
  
  try {
    // Check if database is available
    const health = await checkDatabaseHealth();
    if (!health.connected) {
      throw new Error('Database still unavailable for sync');
    }
    
    
    // Import database functions
    const { saveChat } = await import('./chat-store');
    
    // Sync session storage
    for (const [chatId, conversation] of Array.from(sessionStorage.entries())) {
      try {
        await saveChat({
          chatId,
          messages: conversation.messages,
        });
        
        syncedCount++;
      } catch (error) {
        const errorMsg = `Failed to sync ${chatId}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
      }
    }
    
    // Sync localStorage data
    if (typeof localStorage !== 'undefined') {
      try {
        const existingData = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
        if (existingData) {
          const conversations = JSON.parse(existingData);
          
          for (const [chatId, conversation] of Object.entries(conversations)) {
            // Skip if already synced from session storage
            if (sessionStorage.has(chatId)) {
              continue;
            }
            
            try {
              await saveChat({
                chatId,
                messages: (conversation as any).messages || [],
              });
              
              syncedCount++;
            } catch (error) {
              const errorMsg = `Failed to sync localStorage ${chatId}: ${error instanceof Error ? error.message : String(error)}`;
              errors.push(errorMsg);
                  }
          }
        }
      } catch (error) {
        errors.push(`Failed to read localStorage: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    
    return {
      success: errors.length === 0,
      syncedCount,
      errors,
    };
    
  } catch (error) {
    const errorMsg = `Sync failed: ${error instanceof Error ? error.message : String(error)}`;
    errors.push(errorMsg);
    
    return {
      success: false,
      syncedCount,
      errors,
    };
  }
}

/**
 * Clear fallback data (after successful sync)
 */
export function clearFallbackData(): void {
  // Clear session storage
  sessionStorage.clear();
  
  // Clear localStorage
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.CONVERSATIONS);
    localStorage.removeItem(STORAGE_KEYS.FALLBACK_MODE);
  }
  
}

// Helper functions

function generateTitleFromMessages(messages: UIMessage[]): string | null {
  for (const message of messages) {
    if (message.role === 'user') {
      // AI SDK v5: Extract text from parts array
      const textPart = message.parts?.find((p: any) => p.type === 'text') as any;
      const content = textPart?.text || '';

      if (content.length > 10) {
        return content.length > 50 ? content.substring(0, 47) + '...' : content;
      }
    }
  }

  return null;
}

function extractPhaseFromMessages(messages: UIMessage[]): WorkflowPhase {
  for (let i = messages.length - 1; i >= 0; i--) {
    const metadata = messages[i].metadata as any;
    if (metadata && typeof metadata === 'object' && 'phase' in metadata) {
      return normalizePhase(metadata.phase);
    }
  }
  return 'exploring';
}

/**
 * Performance monitoring for fallback operations
 */
export async function measureFallbackPerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<{ result: T; performance: { time: number; operation: string; mode: 'fallback' } }> {
  const startTime = Date.now();
  
  try {
    const result = await fn();
    const time = Date.now() - startTime;
    
    
    return {
      result,
      performance: { time, operation, mode: 'fallback' }
    };
  } catch (error) {
    const time = Date.now() - startTime;
    throw error;
  }
}
