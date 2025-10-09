/**
 * Unit Tests for Workflow Artifact Formatter (Task 2.1)
 *
 * Tests formatWorkflowArtifact() function with various edge cases:
 * - Empty artifacts
 * - Partial artifacts (missing fields)
 * - Long text truncation
 * - Token budget compliance
 */

import { describe, it, expect } from '@jest/globals';
import {
  formatWorkflowArtifact,
  estimateArtifactTokens,
  isWithinTokenBudget
} from '../workflow-artifact-formatter';
import type { WorkflowMetadata } from '../../types/academic-message';

describe('formatWorkflowArtifact', () => {
  it('should format complete workflow metadata', () => {
    const metadata: WorkflowMetadata = {
      phase: 'foundation_ready',
      progress: 0.35,
      artifacts: {
        topicSummary: 'Gender bias in AI diagnostic algorithms',
        references: [
          { author: 'Smith', year: 2023, title: 'AI Bias in Healthcare' },
          { author: 'Johnson', year: 2022, title: 'Diagnostic Accuracy' },
          { author: 'Lee', year: 2024, title: 'Gender Disparities' }
        ],
        keywords: ['AI bias', 'healthcare', 'diagnostic accuracy', 'gender disparities'],
        outline: '## Introduction\n## Literature Review\n## Methodology\n## Results\n## Discussion'
      },
      timestamp: '2025-10-09T14:30:00Z'
    };

    const result = formatWorkflowArtifact(metadata);

    expect(result).toContain('[Workflow State]');
    expect(result).toContain('Phase: Foundation Ready (35%)');
    expect(result).toContain('Topic: Gender bias in AI diagnostic algorithms');
    expect(result).toContain('Refs: 3 papers');
    expect(result).toContain('Keywords: AI bias, healthcare, diagnostic accuracy');
    expect(result).toContain('Outline: 5 sections');
    expect(result).toContain('Last Updated:');
  });

  it('should handle empty artifacts gracefully', () => {
    const metadata: WorkflowMetadata = {
      phase: 'exploring',
      progress: 0.05,
      artifacts: {},
      timestamp: '2025-10-09T14:30:00Z'
    };

    const result = formatWorkflowArtifact(metadata);

    expect(result).toContain('[Workflow State]');
    expect(result).toContain('Phase: Exploring (5%)');
    expect(result).toContain('Last Updated:');
    expect(result).not.toContain('Topic:');
    expect(result).not.toContain('Refs:');
    expect(result).not.toContain('Keywords:');
  });

  it('should truncate long topic summary to 50 characters', () => {
    const longTopic = 'A' + 'very long topic summary that exceeds the 50 character limit and should be truncated with ellipsis'.repeat(2);

    const metadata: WorkflowMetadata = {
      phase: 'topic_locked',
      progress: 0.15,
      artifacts: {
        topicSummary: longTopic
      },
      timestamp: '2025-10-09T14:30:00Z'
    };

    const result = formatWorkflowArtifact(metadata);
    const topicLine = result.split('\n').find(line => line.startsWith('Topic:'));

    expect(topicLine).toBeDefined();
    expect(topicLine!.length).toBeLessThanOrEqual(60); // "Topic: " (7) + 50 + "..." (3)
    expect(topicLine).toContain('...');
  });

  it('should limit keywords to maximum 3 for token budget', () => {
    const metadata: WorkflowMetadata = {
      phase: 'researching',
      progress: 0.25,
      artifacts: {
        keywords: ['kw1', 'kw2', 'kw3', 'kw4', 'kw5', 'kw6', 'kw7', 'kw8']
      },
      timestamp: '2025-10-09T14:30:00Z'
    };

    const result = formatWorkflowArtifact(metadata);
    const keywordsLine = result.split('\n').find(line => line.startsWith('Keywords:'));

    expect(keywordsLine).toBeDefined();
    expect(keywordsLine).toContain('kw1, kw2, kw3');
    expect(keywordsLine).not.toContain('kw4');
  });

  it('should count outline sections correctly', () => {
    const metadata: WorkflowMetadata = {
      phase: 'outlining',
      progress: 0.45,
      artifacts: {
        outline: '## Introduction\nSome text\n## Literature Review\n## Methodology'
      },
      timestamp: '2025-10-09T14:30:00Z'
    };

    const result = formatWorkflowArtifact(metadata);

    expect(result).toContain('Outline: 3 sections');
  });

  it('should handle missing artifacts field', () => {
    const metadata: WorkflowMetadata = {
      phase: 'exploring',
      progress: 0.05,
      timestamp: '2025-10-09T14:30:00Z'
      // No artifacts field
    };

    const result = formatWorkflowArtifact(metadata);

    expect(result).toContain('[Workflow State]');
    expect(result).toContain('Phase: Exploring (5%)');
    expect(result).toContain('Last Updated:');
  });

  it('should handle missing timestamp with current date', () => {
    const metadata: WorkflowMetadata = {
      phase: 'drafting',
      progress: 0.65,
      artifacts: {}
      // No timestamp
    };

    const result = formatWorkflowArtifact(metadata);

    expect(result).toContain('Last Updated:');
  });

  it('should format timestamp in Indonesian locale', () => {
    const metadata: WorkflowMetadata = {
      phase: 'polishing',
      progress: 0.95,
      artifacts: {},
      timestamp: '2025-10-09T14:30:00Z'
    };

    const result = formatWorkflowArtifact(metadata);
    const timestampLine = result.split('\n').find(line => line.startsWith('Last Updated:'));

    expect(timestampLine).toBeDefined();
    // Indonesian format: DD/MM/YYYY HH:MM
    expect(timestampLine).toMatch(/Last Updated: \d{2}\/\d{2}\/\d{4}/);
  });
});

describe('estimateArtifactTokens', () => {
  it('should estimate token count using 3.5 chars per token heuristic', () => {
    const text = 'A'.repeat(35); // 35 characters = ~10 tokens
    const tokens = estimateArtifactTokens(text);

    expect(tokens).toBe(10);
  });

  it('should round up fractional tokens', () => {
    const text = 'A'.repeat(36); // 36 chars = 10.28 tokens → 11
    const tokens = estimateArtifactTokens(text);

    expect(tokens).toBe(11);
  });
});

describe('isWithinTokenBudget', () => {
  it('should return true for minimal metadata (within budget)', () => {
    const metadata: WorkflowMetadata = {
      phase: 'exploring',
      progress: 0.05,
      artifacts: {},
      timestamp: '2025-10-09T14:30:00Z'
    };

    const withinBudget = isWithinTokenBudget(metadata, 50);

    expect(withinBudget).toBe(true);
  });

  it('should return true for typical metadata (within budget)', () => {
    const metadata: WorkflowMetadata = {
      phase: 'foundation_ready',
      progress: 0.35,
      artifacts: {
        topicSummary: 'Gender bias in AI diagnostic algorithms',
        references: [
          { author: 'Smith', year: 2023, title: 'AI Bias' },
          { author: 'Lee', year: 2024, title: 'Diagnostics' }
        ],
        keywords: ['AI bias', 'healthcare']
      },
      timestamp: '2025-10-09T14:30:00Z'
    };

    const withinBudget = isWithinTokenBudget(metadata, 50);
    const formatted = formatWorkflowArtifact(metadata);
    const tokens = estimateArtifactTokens(formatted);

    expect(withinBudget).toBe(true);
    expect(tokens).toBeLessThanOrEqual(50);
  });

  it('should handle edge case with maximum fields populated', () => {
    const metadata: WorkflowMetadata = {
      phase: 'drafting_locked',
      progress: 0.75,
      artifacts: {
        topicSummary: 'Very long topic that will be truncated to 80 characters maximum to fit budget',
        references: Array(10).fill({ author: 'Author', year: 2024, title: 'Paper' }),
        keywords: ['kw1', 'kw2', 'kw3', 'kw4', 'kw5'],
        outline: '## Intro\n## Method\n## Results\n## Discussion\n## Conclusion'
      },
      timestamp: '2025-10-09T14:30:00Z'
    };

    const formatted = formatWorkflowArtifact(metadata);
    const tokens = estimateArtifactTokens(formatted);

    // Should still be within budget due to truncation
    expect(tokens).toBeLessThanOrEqual(60); // Allow 10 token buffer for edge cases
  });
});
