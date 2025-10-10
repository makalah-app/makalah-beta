/**
 * A/B Testing for Contextual Guidance
 *
 * Deterministically assigns users to treatment (with guidance) or control (without guidance) groups.
 * Uses hash-based assignment for consistency across sessions.
 *
 * Part of: Task 4.3 - Testing & Tuning for Contextual Guidance
 * Reference: workflow_infrastructure/workflow_task/phase_04/task_4-3_testing_and_tuning.md
 */

// ===================================================================
// A/B Test Configuration
// ===================================================================

export interface ABTestConfig {
  enabled: boolean;
  treatmentPercentage: number; // 0-100 (percentage of users who get guidance)
  name: string;
  startDate?: string; // ISO timestamp when A/B test started
}

/**
 * Default A/B test configuration
 *
 * For Task 4.3 (Testing & Tuning):
 * - 10% treatment group (with contextual guidance)
 * - 90% control group (without guidance)
 *
 * For Task 4.4 (Rollout):
 * - This will be replaced by feature flag system with stages:
 *   - shadow (0%), canary (1%), beta (10%), gradual (25/50/75%), enabled (100%)
 */
const AB_TEST_CONFIG: ABTestConfig = {
  enabled: true,
  treatmentPercentage: 10, // 10% get guidance
  name: 'contextual-guidance-v1',
  startDate: '2025-10-10T00:00:00Z'
};

// ===================================================================
// Hash Function for User Assignment
// ===================================================================

/**
 * Simple hash function for userId
 * Returns a number between 0 and 99 (inclusive)
 *
 * Same userId always produces same hash (deterministic)
 */
function hashUserId(userId: string): number {
  let hash = 0;

  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Return value 0-99
  return Math.abs(hash) % 100;
}

// ===================================================================
// User Assignment Function
// ===================================================================

/**
 * Determines if contextual guidance should be enabled for a user
 *
 * @param userId - Optional user UUID. If not provided, uses random assignment.
 * @returns true if user is in treatment group (should receive guidance)
 *
 * @example
 * ```typescript
 * // In chat route:
 * const userId = session?.user?.id;
 * const guidanceEnabled = shouldEnableGuidance(userId);
 *
 * if (guidanceEnabled && currentPhase) {
 *   const detectionResult = await detectConfusionOrStuck(...);
 *   // ... rest of guidance logic
 * }
 * ```
 */
export function shouldEnableGuidance(userId?: string): boolean {
  // If A/B test is disabled, nobody gets guidance
  if (!AB_TEST_CONFIG.enabled) {
    return false;
  }

  // If treatment percentage is 100%, everyone gets guidance (full rollout)
  if (AB_TEST_CONFIG.treatmentPercentage >= 100) {
    return true;
  }

  // If treatment percentage is 0%, nobody gets guidance (disabled)
  if (AB_TEST_CONFIG.treatmentPercentage <= 0) {
    return false;
  }

  // Deterministic assignment based on userId
  if (userId) {
    const hash = hashUserId(userId);
    return hash < AB_TEST_CONFIG.treatmentPercentage;
  }

  // Random assignment for anonymous users (should rarely happen in production)
  return Math.random() * 100 < AB_TEST_CONFIG.treatmentPercentage;
}

// ===================================================================
// Configuration Getters/Setters (For Testing and Admin Dashboard)
// ===================================================================

/**
 * Get current A/B test configuration
 */
export function getABTestConfig(): Readonly<ABTestConfig> {
  return { ...AB_TEST_CONFIG };
}

/**
 * Update A/B test configuration
 *
 * IMPORTANT: This should only be called from admin dashboard or deployment scripts.
 * Do NOT call this from chat route or client code.
 *
 * @param config - Partial config to update
 */
export function updateABTestConfig(config: Partial<ABTestConfig>): void {
  Object.assign(AB_TEST_CONFIG, config);

  console.log('[A/B Test] Configuration updated:', AB_TEST_CONFIG);
}

/**
 * Disable A/B test (sets enabled = false)
 * Emergency killswitch for rollback
 */
export function disableABTest(): void {
  AB_TEST_CONFIG.enabled = false;
  console.log('[A/B Test] A/B test disabled');
}

/**
 * Enable A/B test (sets enabled = true)
 */
export function enableABTest(): void {
  AB_TEST_CONFIG.enabled = true;
  console.log('[A/B Test] A/B test enabled');
}

// ===================================================================
// User Group Assignment Check (For Analytics)
// ===================================================================

/**
 * Get user's assigned group without affecting behavior
 * Useful for analytics and logging
 *
 * @param userId - User UUID
 * @returns 'treatment' | 'control' | 'none' (if A/B test disabled)
 */
export function getUserGroup(userId?: string): 'treatment' | 'control' | 'none' {
  if (!AB_TEST_CONFIG.enabled) {
    return 'none';
  }

  if (!userId) {
    return 'control'; // Default for anonymous users
  }

  return shouldEnableGuidance(userId) ? 'treatment' : 'control';
}

// ===================================================================
// Testing Utilities
// ===================================================================

/**
 * Test hash distribution (for validation)
 * Returns how many userIds out of N would be in treatment group
 *
 * @param sampleSize - Number of random UUIDs to test
 * @returns Object with distribution statistics
 */
export function testHashDistribution(sampleSize: number = 1000): {
  sampleSize: number;
  treatmentCount: number;
  controlCount: number;
  treatmentPercentage: number;
  expectedPercentage: number;
  variance: number;
} {
  let treatmentCount = 0;

  for (let i = 0; i < sampleSize; i++) {
    // Generate random UUID-like string
    const randomUserId = `${Math.random()}-${Math.random()}-${Math.random()}`;
    if (shouldEnableGuidance(randomUserId)) {
      treatmentCount++;
    }
  }

  const controlCount = sampleSize - treatmentCount;
  const treatmentPercentage = (treatmentCount / sampleSize) * 100;
  const expectedPercentage = AB_TEST_CONFIG.treatmentPercentage;
  const variance = Math.abs(treatmentPercentage - expectedPercentage);

  return {
    sampleSize,
    treatmentCount,
    controlCount,
    treatmentPercentage,
    expectedPercentage,
    variance
  };
}

// ===================================================================
// Export for Testing
// ===================================================================

export const __testing__ = {
  hashUserId,
  AB_TEST_CONFIG // For test access (read-only in production)
};
