/**
 * Prompt Cohort Assignment - Deterministic User-to-Prompt Distribution
 *
 * Implements hash-based cohort assignment for A/B testing system prompts.
 * Same user always gets the same prompt (stable across sessions).
 *
 * @module prompt-cohort
 * @see Task 1.2 - System Prompt A/B Testing Infrastructure
 */

import { createSHA256Hash } from '@/lib/utils/crypto-polyfill';

/**
 * System prompt with cohort distribution metadata
 */
export interface PromptVariant {
  id: string | number;
  content: string;
  cohort_percentage: number;
  version?: number;
  priority_order?: number;
}

/**
 * Cache for user cohort assignments
 * TTL: 5 minutes (300,000ms)
 * Max size: 10,000 users
 */
interface CohortCache {
  userId: string;
  cohortValue: number;
  timestamp: number;
}

const COHORT_CACHE = new Map<string, CohortCache>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 10000;

/**
 * Clear expired cache entries
 * Runs automatically when cache exceeds max size
 */
function cleanExpiredCache(): void {
  const now = Date.now();
  const entriesToDelete: string[] = [];

  for (const [userId, cache] of COHORT_CACHE.entries()) {
    if (now - cache.timestamp > CACHE_TTL) {
      entriesToDelete.push(userId);
    }
  }

  entriesToDelete.forEach(userId => COHORT_CACHE.delete(userId));

  console.log(`[Cohort Cache] Cleaned ${entriesToDelete.length} expired entries. Current size: ${COHORT_CACHE.size}`);
}

/**
 * Assigns a user to a cohort based on deterministic hashing.
 * Same user always gets same cohort (stable across sessions).
 *
 * Uses SHA-256 hash of user ID mapped to 0-99 range for percentage-based distribution.
 *
 * @param userId - User UUID
 * @returns Cohort value (0-99) for percentage-based distribution
 *
 * @example
 * assignUserToCohort('123e4567-e89b-12d3-a456-426614174000') // Always returns same value (e.g., 42)
 * assignUserToCohort('fedcba98-7654-3210-fedc-ba9876543210') // Always returns same value (e.g., 73)
 */
export function assignUserToCohort(userId: string): number {
  // Check cache first
  const cached = COHORT_CACHE.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.cohortValue;
  }

  // Create SHA-256 hash of user ID
  const hash = createSHA256Hash(userId);

  // Convert first 8 hex characters to integer and mod 100
  // This gives uniform distribution across 0-99 range
  const cohortValue = parseInt(hash.substring(0, 8), 16) % 100;

  // Cache the result
  COHORT_CACHE.set(userId, {
    userId,
    cohortValue,
    timestamp: Date.now(),
  });

  // Clean cache if it exceeds max size
  if (COHORT_CACHE.size > MAX_CACHE_SIZE) {
    cleanExpiredCache();

    // If still too large after cleaning expired entries, clear oldest 20%
    if (COHORT_CACHE.size > MAX_CACHE_SIZE) {
      const entriesToDelete = Array.from(COHORT_CACHE.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, Math.floor(MAX_CACHE_SIZE * 0.2))
        .map(([userId]) => userId);

      entriesToDelete.forEach(userId => COHORT_CACHE.delete(userId));
      console.log(`[Cohort Cache] Evicted ${entriesToDelete.length} oldest entries`);
    }
  }

  return cohortValue; // 0-99
}

/**
 * Selects which prompt variant a user should receive based on cohort assignment.
 *
 * Distribution logic:
 * - Prompt A (50%): cohort 0-49
 * - Prompt B (30%): cohort 50-79
 * - Prompt C (20%): cohort 80-99
 *
 * @param userId - User UUID
 * @param activePrompts - Array of active prompts with cohort_percentage
 * @returns Selected prompt content or null if no active prompts
 *
 * @example
 * const prompts = [
 *   { id: 1, content: 'Prompt A', cohort_percentage: 50, priority_order: 1 },
 *   { id: 2, content: 'Prompt B', cohort_percentage: 30, priority_order: 2 },
 *   { id: 3, content: 'Prompt C', cohort_percentage: 20, priority_order: 3 }
 * ];
 * selectPromptForUser('user-123', prompts); // Returns 'Prompt A', 'Prompt B', or 'Prompt C'
 */
export function selectPromptForUser(
  userId: string,
  activePrompts: PromptVariant[]
): string | null {
  // Edge case: No active prompts
  if (!activePrompts || activePrompts.length === 0) {
    console.warn('[Cohort Assignment] No active prompts available');
    return null;
  }

  // Edge case: Single prompt (backward compatible)
  if (activePrompts.length === 1) {
    console.log(`[Cohort Assignment] Single prompt mode: ${activePrompts[0].id}`);
    return activePrompts[0].content;
  }

  // Sort prompts by priority_order for consistent distribution
  const sortedPrompts = [...activePrompts].sort((a, b) => {
    const priorityA = a.priority_order ?? 0;
    const priorityB = b.priority_order ?? 0;
    return priorityA - priorityB;
  });

  // Calculate total cohort percentage
  const totalPercentage = sortedPrompts.reduce((sum, p) => sum + p.cohort_percentage, 0);

  // Edge case: Percentages don't sum to 100%
  if (totalPercentage !== 100) {
    console.warn(`[Cohort Assignment] Invalid cohort distribution: ${totalPercentage}% (expected 100%)`);

    // Fallback: Use first prompt (highest priority)
    return sortedPrompts[0]?.content || null;
  }

  // Get user's cohort value (0-99)
  const userCohort = assignUserToCohort(userId);

  // Find which prompt this user should get
  let cumulativePercentage = 0;
  for (const prompt of sortedPrompts) {
    cumulativePercentage += prompt.cohort_percentage;

    if (userCohort < cumulativePercentage) {
      console.log(`[Cohort Assignment] User ${userId.substring(0, 8)} assigned to prompt ${prompt.id} (cohort: ${userCohort}, range: ${cumulativePercentage - prompt.cohort_percentage}-${cumulativePercentage - 1})`);
      return prompt.content;
    }
  }

  // Fallback: Should never reach here if percentages = 100%
  console.error('[Cohort Assignment] Failed to assign cohort. Using first prompt as fallback.');
  return sortedPrompts[0]?.content || null;
}

/**
 * Get statistics about current cohort cache
 * Used for monitoring and debugging
 */
export function getCohortCacheStats(): {
  size: number;
  maxSize: number;
  ttlMs: number;
} {
  return {
    size: COHORT_CACHE.size,
    maxSize: MAX_CACHE_SIZE,
    ttlMs: CACHE_TTL,
  };
}

/**
 * Clear all cohort cache entries
 * Used for testing and manual cache invalidation
 */
export function clearCohortCache(): void {
  COHORT_CACHE.clear();
  console.log('[Cohort Cache] Cleared all entries');
}

/**
 * Calculate expected distribution of users across prompts
 * Used for testing and validation
 *
 * @param prompts - Array of prompts with cohort percentages
 * @param sampleSize - Number of sample users to test
 * @returns Distribution map: prompt ID -> count
 */
export function testCohortDistribution(
  prompts: PromptVariant[],
  sampleSize: number = 1000
): Record<string | number, number> {
  const distribution: Record<string | number, number> = {};

  // Initialize counters
  prompts.forEach(p => {
    distribution[p.id] = 0;
  });

  // Generate sample users and count assignments
  for (let i = 0; i < sampleSize; i++) {
    const sampleUserId = `sample-user-${i}`;
    const selectedPrompt = selectPromptForUser(sampleUserId, prompts);

    // Find which prompt was selected
    const matchedPrompt = prompts.find(p => p.content === selectedPrompt);
    if (matchedPrompt) {
      distribution[matchedPrompt.id]++;
    }
  }

  return distribution;
}
