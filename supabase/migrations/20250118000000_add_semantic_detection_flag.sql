-- Migration: Add semantic detection feature flag
-- Purpose: Enable gradual rollout of semantic detection
-- Created: 2025-01-18
-- Phase: Semantic Migration Task 3.1

-- ============================================
-- Add config column if not exists
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feature_flags'
    AND column_name = 'config'
  ) THEN
    ALTER TABLE feature_flags ADD COLUMN config JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Added config column to feature_flags';
  ELSE
    RAISE NOTICE 'config column already exists';
  END IF;
END $$;

-- ============================================
-- Insert semantic_detection feature flag
-- ============================================

INSERT INTO feature_flags (flag_name, rollout_stage, enabled_for_users, disabled_for_users, config)
VALUES (
  'semantic_detection',
  'disabled',  -- Start disabled
  ARRAY[]::text[],  -- No specific users enabled
  ARRAY[]::text[],  -- No specific users disabled
  jsonb_build_object(
    'description', 'Semantic phase detection using pgvector embeddings',
    'stages', jsonb_build_array(
      'disabled',      -- Use regex only
      'shadow',        -- Run both, use regex, log comparison
      'canary_1',      -- Use semantic for 1% users
      'beta_10',       -- Use semantic for 10% users
      'gradual_50',    -- Use semantic for 50% users
      'enabled'        -- Use semantic for 100% users
    ),
    'match_threshold', 0.65,
    'confidence_threshold', 0.70,
    'log_comparisons', true
  )
)
ON CONFLICT (flag_name) DO NOTHING;

-- ============================================
-- Verify flag inserted
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM feature_flags
    WHERE flag_name = 'semantic_detection'
  ) THEN
    RAISE NOTICE 'semantic_detection flag created successfully';
  ELSE
    RAISE WARNING 'Failed to create semantic_detection flag';
  END IF;
END $$;
