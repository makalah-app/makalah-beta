/**
 * Unit tests for semantic detection feature flag
 *
 * Tests feature flag configuration, cohort assignment, and cache behavior
 *
 * @module tests/semantic-feature-flag
 * @since Beta 0.3
 */

import {
  isSemanticDetectionEnabled,
  getSemanticDetectionConfig,
  clearSemanticDetectionCache,
  type RolloutStage
} from '../semantic-detection/feature-flag';

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}));

/**
 * Helper function to create mock Supabase client
 */
function createMockClient(data: any, error: any = null) {
  const { createClient } = require('@supabase/supabase-js');

  const mockClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data, error })
  };

  createClient.mockReturnValue(mockClient);
  return mockClient;
}

describe('Semantic Detection Feature Flag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearSemanticDetectionCache();
  });

  describe('getSemanticDetectionConfig', () => {
    it('should return null when flag not found', async () => {
      createMockClient(null);

      const config = await getSemanticDetectionConfig();
      expect(config).toBeNull();
    });

    it('should parse config from database correctly', async () => {
      createMockClient({
        rollout_stage: 'shadow',
        config: {
          match_threshold: 0.65,
          confidence_threshold: 0.70,
          log_comparisons: true
        }
      });

      const config = await getSemanticDetectionConfig();
      expect(config).toEqual({
        rollout_stage: 'shadow',
        match_threshold: 0.65,
        confidence_threshold: 0.70,
        log_comparisons: true
      });
    });

    it('should use defaults for missing config values', async () => {
      createMockClient({
        rollout_stage: 'enabled',
        config: {}
      });

      const config = await getSemanticDetectionConfig();
      expect(config).toEqual({
        rollout_stage: 'enabled',
        match_threshold: 0.65,  // default
        confidence_threshold: 0.70,  // default
        log_comparisons: true  // default
      });
    });
  });

  describe('isSemanticDetectionEnabled', () => {
    it('should return disabled status when flag not found', async () => {
      createMockClient(null);

      const status = await isSemanticDetectionEnabled();

      expect(status.enabled).toBe(false);
      expect(status.stage).toBe('disabled');
      expect(status.useSemanticResult).toBe(false);
    });

    it('should use regex in shadow mode', async () => {
      createMockClient({
        rollout_stage: 'shadow',
        config: {
          match_threshold: 0.65,
          confidence_threshold: 0.70,
          log_comparisons: true
        }
      });

      const status = await isSemanticDetectionEnabled();

      expect(status.enabled).toBe(true);
      expect(status.stage).toBe('shadow');
      expect(status.useSemanticResult).toBe(false);  // Shadow = use regex
    });

    it('should use semantic when fully enabled', async () => {
      createMockClient({
        rollout_stage: 'enabled',
        config: {
          match_threshold: 0.65,
          confidence_threshold: 0.70,
          log_comparisons: false
        }
      });

      const status = await isSemanticDetectionEnabled();

      expect(status.enabled).toBe(true);
      expect(status.stage).toBe('enabled');
      expect(status.useSemanticResult).toBe(true);  // Full rollout
    });

    it('should assign users to cohorts deterministically', async () => {
      createMockClient({
        rollout_stage: 'canary_1',
        config: {
          match_threshold: 0.65,
          confidence_threshold: 0.70,
          log_comparisons: true
        }
      });

      // Same userId should get same result
      const userId = 'test-user-123';
      const status1 = await isSemanticDetectionEnabled(userId);
      clearSemanticDetectionCache();

      createMockClient({
        rollout_stage: 'canary_1',
        config: {
          match_threshold: 0.65,
          confidence_threshold: 0.70,
          log_comparisons: true
        }
      });

      const status2 = await isSemanticDetectionEnabled(userId);

      expect(status1.useSemanticResult).toBe(status2.useSemanticResult);
    });

    it('should handle disabled stage correctly', async () => {
      createMockClient({
        rollout_stage: 'disabled',
        config: {
          match_threshold: 0.65,
          confidence_threshold: 0.70,
          log_comparisons: false
        }
      });

      const status = await isSemanticDetectionEnabled('any-user-id');

      expect(status.enabled).toBe(false);
      expect(status.stage).toBe('disabled');
      expect(status.useSemanticResult).toBe(false);
    });
  });

  describe('Cache behavior', () => {
    it('should cache config for 30 seconds', async () => {
      const mockClient = createMockClient({
        rollout_stage: 'shadow',
        config: {
          match_threshold: 0.65,
          confidence_threshold: 0.70,
          log_comparisons: true
        }
      });

      // First call
      await getSemanticDetectionConfig();
      expect(mockClient.maybeSingle).toHaveBeenCalledTimes(1);

      // Second call within TTL - should use cache
      await getSemanticDetectionConfig();
      expect(mockClient.maybeSingle).toHaveBeenCalledTimes(1);  // No new call
    });

    it('should clear cache on demand', async () => {
      const mockClient1 = createMockClient({
        rollout_stage: 'enabled',
        config: {
          match_threshold: 0.65,
          confidence_threshold: 0.70,
          log_comparisons: false
        }
      });

      // First call
      await getSemanticDetectionConfig();
      expect(mockClient1.maybeSingle).toHaveBeenCalledTimes(1);

      // Clear cache
      clearSemanticDetectionCache();

      const mockClient2 = createMockClient({
        rollout_stage: 'enabled',
        config: {
          match_threshold: 0.65,
          confidence_threshold: 0.70,
          log_comparisons: false
        }
      });

      // Second call after clear - should fetch again
      await getSemanticDetectionConfig();
      expect(mockClient2.maybeSingle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Rollout stages', () => {
    const stages: Array<{ stage: RolloutStage; enabled: boolean; useSemanticForAll: boolean | null }> = [
      { stage: 'disabled', enabled: false, useSemanticForAll: false },
      { stage: 'shadow', enabled: true, useSemanticForAll: false },
      { stage: 'canary_1', enabled: true, useSemanticForAll: null },  // Cohort-based
      { stage: 'beta_10', enabled: true, useSemanticForAll: null },   // Cohort-based
      { stage: 'gradual_50', enabled: true, useSemanticForAll: null }, // Cohort-based
      { stage: 'enabled', enabled: true, useSemanticForAll: true }
    ];

    stages.forEach(({ stage, enabled, useSemanticForAll }) => {
      it(`should handle ${stage} stage correctly`, async () => {
        createMockClient({
          rollout_stage: stage,
          config: {
            match_threshold: 0.65,
            confidence_threshold: 0.70,
            log_comparisons: true
          }
        });

        const status = await isSemanticDetectionEnabled('test-user');

        expect(status.stage).toBe(stage);
        expect(status.enabled).toBe(enabled);

        // Verify semantic result usage
        if (useSemanticForAll !== null) {
          expect(status.useSemanticResult).toBe(useSemanticForAll);
        }
        // canary_1, beta_10, gradual_50 depend on cohort - we don't test exact value
      });
    });
  });
});
