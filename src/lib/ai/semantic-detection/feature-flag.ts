/**
 * Feature flag utilities for semantic detection
 *
 * Supports gradual rollout stages:
 * - disabled: Use regex only
 * - shadow: Run both, use regex, log comparison
 * - canary_1: Use semantic for 1% users
 * - beta_10: Use semantic for 10% users
 * - gradual_50: Use semantic for 50% users
 * - enabled: Use semantic for 100% users
 *
 * @module semantic-detection/feature-flag
 * @since Beta 0.3
 */

import { createClient } from '@supabase/supabase-js';

// Create admin client lazily to allow for testing
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return supabaseAdmin;
}

// ============================================
// Type Definitions
// ============================================

/**
 * Rollout stages for semantic detection
 */
export type RolloutStage =
  | 'disabled'      // Use regex only (baseline)
  | 'shadow'        // Run both, use regex, log comparison (A/B testing)
  | 'canary_1'      // Use semantic for 1% users (initial rollout)
  | 'beta_10'       // Use semantic for 10% users
  | 'gradual_50'    // Use semantic for 50% users
  | 'enabled';      // Use semantic for 100% users (full rollout)

/**
 * Semantic detection configuration from feature flag
 */
export interface SemanticDetectionConfig {
  rollout_stage: RolloutStage;
  match_threshold: number;
  confidence_threshold: number;
  log_comparisons: boolean;
}

/**
 * Result of semantic detection check
 */
export interface SemanticDetectionStatus {
  enabled: boolean;
  stage: RolloutStage;
  useSemanticResult: boolean;  // True = use semantic, False = use regex
  config: SemanticDetectionConfig;
}

// ============================================
// Cache for Feature Flag (30 second TTL)
// ============================================

let configCache: {
  config: SemanticDetectionConfig | null;
  timestamp: number;
} = {
  config: null,
  timestamp: 0
};

const CACHE_TTL = 30_000; // 30 seconds

// ============================================
// Core Feature Flag Functions
// ============================================

/**
 * Get semantic detection configuration from database
 *
 * Returns cached config if less than 30 seconds old.
 *
 * @returns Semantic detection config or null if flag not found
 *
 * @example
 * const config = await getSemanticDetectionConfig();
 * if (config && config.rollout_stage !== 'disabled') {
 *   // Use hybrid detection
 * }
 */
export async function getSemanticDetectionConfig(): Promise<SemanticDetectionConfig | null> {
  // Check cache
  const now = Date.now();
  if (configCache.config && (now - configCache.timestamp) < CACHE_TTL) {
    return configCache.config;
  }

  // Fetch from database
  const { data, error} = await getSupabaseAdmin()
    .from('feature_flags')
    .select('rollout_stage, config')
    .eq('flag_name', 'semantic_detection')
    .maybeSingle();

  if (error || !data) {
    console.error('[Feature Flag] Failed to fetch semantic_detection:', error?.message);
    return null;
  }

  // Parse config from database
  const config: SemanticDetectionConfig = {
    rollout_stage: data.rollout_stage as RolloutStage || 'disabled',
    match_threshold: data.config?.match_threshold || 0.65,
    confidence_threshold: data.config?.confidence_threshold || 0.70,
    log_comparisons: data.config?.log_comparisons ?? true
  };

  // Update cache
  configCache = {
    config,
    timestamp: now
  };

  return config;
}

/**
 * Check if semantic detection is enabled for current request
 *
 * Determines whether to use semantic result based on rollout stage.
 *
 * @param userId - User ID for cohort assignment (optional)
 * @returns Status object with enabled flag and config
 *
 * @example
 * const status = await isSemanticDetectionEnabled(userId);
 * if (status.enabled) {
 *   const { result, comparison } = await hybridDetection(
 *     modelResponse,
 *     currentState,
 *     status.useSemanticResult  // True for semantic, false for regex
 *   );
 * }
 */
export async function isSemanticDetectionEnabled(
  userId?: string
): Promise<SemanticDetectionStatus> {
  const config = await getSemanticDetectionConfig();

  if (!config) {
    // Fallback: disabled if flag not found
    return {
      enabled: false,
      stage: 'disabled',
      useSemanticResult: false,
      config: {
        rollout_stage: 'disabled',
        match_threshold: 0.65,
        confidence_threshold: 0.70,
        log_comparisons: false
      }
    };
  }

  const stage = config.rollout_stage;

  // ========================================
  // Determine if semantic result should be used
  // ========================================

  let useSemanticResult = false;

  switch (stage) {
    case 'disabled':
      // Use regex only
      useSemanticResult = false;
      break;

    case 'shadow':
      // Run both, but use regex (shadow mode for comparison)
      useSemanticResult = false;
      break;

    case 'canary_1':
      // Use semantic for 1% users
      useSemanticResult = isInCohort(userId, 1);
      break;

    case 'beta_10':
      // Use semantic for 10% users
      useSemanticResult = isInCohort(userId, 10);
      break;

    case 'gradual_50':
      // Use semantic for 50% users
      useSemanticResult = isInCohort(userId, 50);
      break;

    case 'enabled':
      // Use semantic for 100% users
      useSemanticResult = true;
      break;
  }

  return {
    enabled: stage !== 'disabled',
    stage,
    useSemanticResult,
    config
  };
}

/**
 * Deterministic cohort assignment based on user ID
 *
 * Uses hash of userId to assign users to cohorts consistently.
 * Same userId always gets same cohort assignment.
 *
 * @param userId - User ID (optional, defaults to random assignment)
 * @param percentage - Target percentage (1, 10, 50, 100)
 * @returns True if user is in cohort
 *
 * @example
 * // User "abc123" will always be in same cohort
 * isInCohort("abc123", 10);  // 10% chance, consistent across requests
 */
function isInCohort(userId: string | undefined, percentage: number): boolean {
  if (!userId) {
    // Random assignment if no userId (for anonymous users)
    return Math.random() * 100 < percentage;
  }

  // Deterministic hash-based assignment
  const hash = simpleHash(userId);
  return (hash % 100) < percentage;
}

/**
 * Simple hash function for cohort assignment
 *
 * @param str - String to hash (userId)
 * @returns Integer hash value
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Clear feature flag cache
 *
 * Call this after updating feature flag in database to force refresh.
 *
 * @example
 * // After admin updates rollout stage
 * await updateSemanticDetectionStage('beta_10');
 * clearSemanticDetectionCache();
 */
export function clearSemanticDetectionCache(): void {
  configCache = {
    config: null,
    timestamp: 0
  };
  console.log('[Feature Flag] Cache cleared for semantic_detection');
}
