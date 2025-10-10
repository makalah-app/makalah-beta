/**
 * Feature Flag System for Contextual Guidance Rollout
 *
 * Controls gradual rollout with user-based targeting and emergency kill switch
 *
 * Part of: Task 4.4 - Rollout for Contextual Guidance
 * Reference: workflow_infrastructure/workflow_task/phase_04/task_4-4_rollout.md
 */

import { createClient } from '@supabase/supabase-js';

// ===================================================================
// Configuration
// ===================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[Feature Flag] Missing Supabase credentials');
}

const supabaseAdmin = createClient(
  SUPABASE_URL || '',
  SUPABASE_SERVICE_KEY || '',
  {
    auth: { persistSession: false }
  }
);

// ===================================================================
// Rollout Stages
// ===================================================================

export type RolloutStage =
  | 'disabled'      // 0% - Feature completely off
  | 'shadow'        // 0% - Detection runs but no injection (logging only)
  | 'canary'        // 1% - Internal testing only
  | 'beta'          // 10% - A/B test group
  | 'gradual_25'    // 25% - Gradual rollout
  | 'gradual_50'    // 50% - Half of users
  | 'gradual_75'    // 75% - Majority of users
  | 'enabled';      // 100% - Full rollout

export const ROLLOUT_PERCENTAGES: Record<RolloutStage, number> = {
  disabled: 0,
  shadow: 0,
  canary: 1,
  beta: 10,
  gradual_25: 25,
  gradual_50: 50,
  gradual_75: 75,
  enabled: 100
};

// ===================================================================
// Feature Flag Result Type
// ===================================================================

export interface FeatureFlagResult {
  enabled: boolean;
  stage: RolloutStage;
  reason: string;
}

// ===================================================================
// Database Schema (Migration Required)
// ===================================================================

/*
CREATE TABLE IF NOT EXISTS feature_flags (
  flag_name TEXT PRIMARY KEY,
  rollout_stage TEXT NOT NULL DEFAULT 'disabled',
  enabled_for_users TEXT[] DEFAULT '{}',
  disabled_for_users TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO feature_flags (flag_name, rollout_stage)
VALUES ('contextual_guidance', 'shadow')
ON CONFLICT (flag_name) DO NOTHING;
*/

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
// Feature Flag Check
// ===================================================================

/**
 * Determines if contextual guidance should be enabled for a user
 *
 * @param userId - Optional user UUID. If not provided, uses random assignment.
 * @returns Object with enabled status, current stage, and reason
 *
 * @example
 * ```typescript
 * // In chat route:
 * const userId = session?.user?.id;
 * const { enabled, stage, reason } = await isContextualGuidanceEnabled(userId);
 *
 * if (enabled && currentPhase) {
 *   const detectionResult = await detectConfusionOrStuck(...);
 *   // ... rest of guidance logic
 * }
 * ```
 */
export async function isContextualGuidanceEnabled(
  userId?: string
): Promise<FeatureFlagResult> {
  try {
    // Fetch current rollout stage from database
    const { data: flag, error } = await supabaseAdmin
      .from('feature_flags')
      .select('rollout_stage, enabled_for_users, disabled_for_users')
      .eq('flag_name', 'contextual_guidance')
      .single();

    if (error || !flag) {
      console.error('[Feature Flag] Error fetching flag:', error);
      return { enabled: false, stage: 'disabled', reason: 'database_error' };
    }

    const stage = flag.rollout_stage as RolloutStage;

    // Check explicit user overrides
    if (userId) {
      if (flag.enabled_for_users?.includes(userId)) {
        return { enabled: true, stage, reason: 'user_override_enabled' };
      }
      if (flag.disabled_for_users?.includes(userId)) {
        return { enabled: false, stage, reason: 'user_override_disabled' };
      }
    }

    // Check rollout stage
    const rolloutPercentage = ROLLOUT_PERCENTAGES[stage];

    // Special handling for shadow mode
    if (stage === 'shadow') {
      // Shadow mode: detection runs but no injection
      // Return enabled=false so guidance is not injected
      // But detection can still run for logging
      return { enabled: false, stage, reason: 'shadow_mode' };
    }

    if (rolloutPercentage === 0 || stage === 'disabled') {
      return { enabled: false, stage, reason: 'stage_disabled' };
    }

    if (rolloutPercentage === 100) {
      return { enabled: true, stage, reason: 'full_rollout' };
    }

    // Deterministic user assignment based on percentage
    if (userId) {
      const hash = hashUserId(userId);
      const enabled = (hash % 100) < rolloutPercentage;
      return { enabled, stage, reason: enabled ? 'rollout_percentage' : 'not_in_rollout' };
    }

    // Random assignment for anonymous users (should rarely happen in production)
    const enabled = Math.random() * 100 < rolloutPercentage;
    return { enabled, stage, reason: enabled ? 'random_rollout' : 'not_in_rollout' };

  } catch (error) {
    console.error('[Feature Flag] Unexpected error:', error);
    return { enabled: false, stage: 'disabled', reason: 'unexpected_error' };
  }
}

// ===================================================================
// Shadow Mode Check (For Detection without Injection)
// ===================================================================

/**
 * Check if we're in shadow mode
 * In shadow mode, detection should run but guidance should NOT be injected
 */
export async function isShadowMode(): Promise<boolean> {
  try {
    const { data: flag } = await supabaseAdmin
      .from('feature_flags')
      .select('rollout_stage')
      .eq('flag_name', 'contextual_guidance')
      .single();

    return flag?.rollout_stage === 'shadow';
  } catch (error) {
    return false;
  }
}

// ===================================================================
// Admin Functions
// ===================================================================

/**
 * Set rollout stage (admin only)
 *
 * @param stage - Target rollout stage
 */
export async function setRolloutStage(stage: RolloutStage): Promise<void> {
  const { error } = await supabaseAdmin
    .from('feature_flags')
    .update({ rollout_stage: stage, updated_at: new Date().toISOString() })
    .eq('flag_name', 'contextual_guidance');

  if (error) {
    throw new Error(`Failed to update rollout stage: ${error.message}`);
  }

  console.log(`[Feature Flag] Rollout stage updated to: ${stage} (${ROLLOUT_PERCENTAGES[stage]}%)`);
}

/**
 * Add user override (admin only)
 *
 * @param userId - User UUID to add override for
 * @param enabled - true to enable guidance for user, false to disable
 */
export async function addUserOverride(userId: string, enabled: boolean): Promise<void> {
  const column = enabled ? 'enabled_for_users' : 'disabled_for_users';

  const { error } = await supabaseAdmin.rpc('add_user_to_flag', {
    flag_name: 'contextual_guidance',
    user_id: userId,
    column_name: column
  });

  if (error) {
    throw new Error(`Failed to add user override: ${error.message}`);
  }

  console.log(`[Feature Flag] User ${userId} ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Get current rollout configuration (for admin dashboard)
 */
export async function getCurrentRolloutConfig(): Promise<{
  stage: RolloutStage;
  percentage: number;
  enabledUsers: string[];
  disabledUsers: string[];
  updatedAt: string;
} | null> {
  try {
    const { data: flag, error } = await supabaseAdmin
      .from('feature_flags')
      .select('*')
      .eq('flag_name', 'contextual_guidance')
      .single();

    if (error || !flag) {
      return null;
    }

    const stage = flag.rollout_stage as RolloutStage;

    return {
      stage,
      percentage: ROLLOUT_PERCENTAGES[stage],
      enabledUsers: flag.enabled_for_users || [],
      disabledUsers: flag.disabled_for_users || [],
      updatedAt: flag.updated_at
    };
  } catch (error) {
    console.error('[Feature Flag] Error fetching config:', error);
    return null;
  }
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
export function testHashDistribution(
  targetPercentage: number,
  sampleSize: number = 1000
): {
  sampleSize: number;
  targetPercentage: number;
  treatmentCount: number;
  actualPercentage: number;
  variance: number;
} {
  let treatmentCount = 0;

  for (let i = 0; i < sampleSize; i++) {
    // Generate random UUID-like string
    const randomUserId = `${Math.random()}-${Math.random()}-${Math.random()}`;
    const hash = hashUserId(randomUserId);
    if (hash < targetPercentage) {
      treatmentCount++;
    }
  }

  const actualPercentage = (treatmentCount / sampleSize) * 100;
  const variance = Math.abs(actualPercentage - targetPercentage);

  return {
    sampleSize,
    targetPercentage,
    treatmentCount,
    actualPercentage,
    variance
  };
}

// ===================================================================
// Export for Testing
// ===================================================================

export const __testing__ = {
  hashUserId,
  ROLLOUT_PERCENTAGES
};
