/**
 * UUID GENERATOR UTILITY - DATABASE COMPATIBILITY FIX
 * 
 * PURPOSE:
 * Provides proper UUID v4 generation for PostgreSQL database compatibility
 * Resolves "invalid input syntax for type uuid" error from Task 03 Database Integration
 * 
 * BACKGROUND:
 * - Database schema requires UUID format (e.g., 123e4567-e89b-12d3-a456-426614174000)
 * - AI SDK generateId() produces random strings (e.g., iKtRSLb7gZFtZ6pq) 
 * - PostgreSQL rejects non-UUID format with error code 22P02
 * 
 * SOLUTION:
 * - Use proper UUID v4 for database operations
 * - Maintain AI SDK generateId() for fallback mode compatibility
 * 
 * SAFETY:
 * - Zero impact on Task 01-02 achievements
 * - No changes to route.ts or stream coordination
 * - Maintains fallback mode compatibility
 */

import { v4 as uuidv4 } from 'uuid';
import { generateId } from 'ai';

/**
 * Generate proper UUID v4 for database compatibility
 * 
 * Returns a RFC 4122 compliant UUID that PostgreSQL can accept as UUID type
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * 
 * @returns UUID v4 string compatible with PostgreSQL UUID type
 * 
 * @example
 * const chatId = generateUUID();
 * // Returns: "123e4567-e89b-12d3-a456-426614174000"
 */
export function generateUUID(): string {
  return uuidv4();
}

/**
 * Generate AI SDK compatible ID for fallback mode
 * 
 * Uses AI SDK's native generateId() function to maintain compatibility
 * with existing fallback storage and localStorage implementations
 * 
 * @returns Random string compatible with AI SDK patterns
 * 
 * @example
 * const fallbackId = generateFallbackId();
 * // Returns: "iKtRSLb7gZFtZ6pq"
 */
export function generateFallbackId(): string {
  return generateId();
}

/**
 * Validate if string is proper UUID format
 * 
 * Checks if given string matches RFC 4122 UUID v4 format
 * Required for PostgreSQL UUID column compatibility
 * 
 * @param id String to validate
 * @returns True if valid UUID format, false otherwise
 * 
 * @example
 * isValidUUIDFormat("123e4567-e89b-12d3-a456-426614174000") // true
 * isValidUUIDFormat("iKtRSLb7gZFtZ6pq") // false
 */
export function isValidUUIDFormat(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Convert AI SDK generated ID to UUID if needed
 * 
 * For backward compatibility - converts random strings to UUID format
 * Useful for migrating existing non-UUID chat IDs
 * 
 * @param id Existing ID (UUID or random string)
 * @returns Valid UUID format
 * 
 * @example
 * ensureUUIDFormat("123e4567-e89b-12d3-a456-426614174000") // unchanged
 * ensureUUIDFormat("iKtRSLb7gZFtZ6pq") // converts to new UUID
 */
export function ensureUUIDFormat(id: string): string {
  if (isValidUUIDFormat(id)) {
    return id; // Already valid UUID
  }
  
  // Generate new UUID for non-UUID strings
  return generateUUID();
}

/**
 * Debug utility: Generate test IDs for comparison
 * 
 * Useful for debugging and testing UUID vs AI SDK ID differences
 * 
 * @returns Object with both UUID and AI SDK generated IDs
 */
export function generateTestIds(): { uuid: string; aiSdk: string; timestamp: number } {
  return {
    uuid: generateUUID(),
    aiSdk: generateFallbackId(),
    timestamp: Date.now()
  };
}

// Export type definitions for TypeScript usage
export type UUIDString = string;
export type AISDKString = string;

// Export constants for validation
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const UUID_VERSION = 4;

/**
 * SYSTEM USER UUID - Consistent system user identifier
 * 
 * Fixed UUID for system operations to prevent "system" string errors
 * This UUID represents the system/anonymous user in database operations
 */
export const SYSTEM_USER_UUID = "00000000-0000-4000-8000-000000000000";

/**
 * Get proper UUID for user identification
 * 
 * Handles system user case and ensures all user IDs are proper UUIDs
 * 
 * @param userId User ID (can be UUID, "system", undefined, or null)
 * @returns Valid UUID string for database operations
 */
export function getValidUserUUID(userId?: string | null): string {
  // Handle null/undefined
  if (!userId) {
    return SYSTEM_USER_UUID;
  }
  
  // Handle "system" string
  if (userId === 'system') {
    return SYSTEM_USER_UUID;
  }
  
  // Check if already valid UUID
  if (isValidUUIDFormat(userId)) {
    return userId;
  }
  
  // For invalid formats, return system UUID as fallback
  console.warn(`[UUID] Invalid user ID format: ${userId}, using system UUID`);
  return SYSTEM_USER_UUID;
}

/**
 * USAGE GUIDELINES:
 * 
 * 1. Database Operations (Supabase):
 *    - Use generateUUID() for new chat IDs
 *    - Use isValidUUIDFormat() for validation
 * 
 * 2. Fallback Mode (localStorage):
 *    - Use generateFallbackId() to maintain compatibility
 *    - Keep existing AI SDK patterns
 * 
 * 3. Migration/Compatibility:
 *    - Use ensureUUIDFormat() for existing data
 *    - Validate with isValidUUIDFormat() before database operations
 * 
 * IMPLEMENTATION NOTES:
 * - This utility fixes Task 03 database persistence failure
 * - Maintains backward compatibility with Task 01-02 achievements
 * - No impact on stream coordination or approval systems
 * - Fallback mode continues using AI SDK patterns
 */