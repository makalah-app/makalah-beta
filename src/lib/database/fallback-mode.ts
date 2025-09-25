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

// Fallback storage interface
interface FallbackConversation {
  id: string;
  userId: string;
  title: string;
  messages: UIMessage[];
  currentPhase: number;
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
      console.warn('[Fallback] Failed to parse cached health status:', error);
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
    console.log(`[Fallback] Saving ${messages.length} messages for chat ${chatId} to localStorage`);
    
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
        console.warn('[Fallback] Failed to persist to localStorage:', error);
        // Continue with session storage only
      }
    }
    
    const saveTime = Date.now() - startTime;
    console.log(`[Fallback] Successfully saved ${messages.length} messages in ${saveTime}ms (fallback mode)`);
    
  } catch (error) {
    const saveTime = Date.now() - startTime;
    console.error(`[Fallback] Failed to save chat ${chatId} after ${saveTime}ms:`, error);
    throw error;
  }
}

/**
 * Fallback loadChat implementation using localStorage
 */
export async function loadChatFallback(chatId: string): Promise<UIMessage[]> {
  const startTime = Date.now();
  
  try {
    console.log(`[Fallback] Loading messages for chat ${chatId} from fallback storage`);
    
    // First check session storage
    const sessionConversation = sessionStorage.get(chatId);
    if (sessionConversation) {
      const loadTime = Date.now() - startTime;
      console.log(`[Fallback] Successfully loaded ${sessionConversation.messages.length} messages from session in ${loadTime}ms`);
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
            console.log(`[Fallback] Successfully loaded ${conversation.messages.length} messages from localStorage in ${loadTime}ms`);
            return conversation.messages;
          }
        }
      } catch (error) {
        console.warn('[Fallback] Failed to load from localStorage:', error);
      }
    }
    
    // No messages found
    const loadTime = Date.now() - startTime;
    console.log(`[Fallback] No messages found for chat ${chatId} after ${loadTime}ms`);
    return [];
    
  } catch (error) {
    const loadTime = Date.now() - startTime;
    console.error(`[Fallback] Failed to load chat ${chatId} after ${loadTime}ms:`, error);
    throw error;
  }
}

/**
 * Create new chat ID in fallback mode
 */
export async function createChatFallback(userId?: string, title?: string): Promise<string> {
  const chatId = generateUUID(); // Use UUID for database compatibility
  
  console.log(`[Fallback] Created new chat ${chatId} in fallback mode`);
  
  // Create empty conversation entry
  const conversation: FallbackConversation = {
    id: chatId,
    userId: getValidUserUUID(userId),
    title: title || 'New Chat (Offline)',
    messages: [],
    currentPhase: 1,
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
  currentPhase: number;
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
        currentPhase: conversation.currentPhase,
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
                currentPhase: (conversation as any).currentPhase || 1,
              });
            }
          }
        }
      } catch (error) {
        console.warn('[Fallback] Failed to load conversations from localStorage:', error);
      }
    }
    
    // Sort by last activity
    conversations.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
    
    console.log(`[Fallback] Found ${conversations.length} conversations in fallback mode`);
    return conversations;
    
  } catch (error) {
    console.error('[Fallback] Failed to get user conversations:', error);
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
    
    console.log('[Fallback] Starting sync of fallback data to database');
    
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
        console.log(`[Fallback] Synced conversation ${chatId} (${conversation.messages.length} messages)`);
      } catch (error) {
        const errorMsg = `Failed to sync ${chatId}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        console.error('[Fallback]', errorMsg);
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
              console.log(`[Fallback] Synced localStorage conversation ${chatId}`);
            } catch (error) {
              const errorMsg = `Failed to sync localStorage ${chatId}: ${error instanceof Error ? error.message : String(error)}`;
              errors.push(errorMsg);
              console.error('[Fallback]', errorMsg);
            }
          }
        }
      } catch (error) {
        errors.push(`Failed to read localStorage: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    console.log(`[Fallback] Sync completed: ${syncedCount} conversations synced, ${errors.length} errors`);
    
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
  
  console.log('[Fallback] Cleared all fallback data');
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

function extractPhaseFromMessages(messages: UIMessage[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    const metadata = messages[i].metadata as any;
    if (metadata && typeof metadata === 'object' &&
        'phase' in metadata && typeof metadata.phase === 'number') {
      return metadata.phase;
    }
  }
  return 1;
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
    
    console.log(`[Fallback Performance] ${operation} completed in ${time}ms (fallback mode)`);
    
    return {
      result,
      performance: { time, operation, mode: 'fallback' }
    };
  } catch (error) {
    const time = Date.now() - startTime;
    console.error(`[Fallback Performance] ${operation} failed after ${time}ms:`, error);
    throw error;
  }
}
