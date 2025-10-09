/**
 * Workflow Artifact Formatter (Task 2.1)
 *
 * Formats workflow artifacts (data) as structured text summary for user display.
 * This is NOT for backend context injection - use formatArtifactsWithBudget() from
 * workflow-engine.ts for that purpose.
 *
 * Purpose: User-facing read-only artifact display (collapsed/expandable)
 * Format: Multi-line structured text (NOT AI SDK artifacts)
 * Token Budget: Maximum 50 tokens
 */

import type { WorkflowMetadata } from '../types/academic-message';
import { PHASE_REGISTRY } from './workflow-engine';

/**
 * Format workflow artifacts as structured text summary for user display
 *
 * Output format:
 * ```
 * [Workflow State]
 * Phase: Research Foundation (35%)
 * Topic: Gender bias in AI diagnostic algorithms
 * References: 3 papers collected
 * Keywords: AI bias, healthcare, diagnostic accuracy
 * Outline: 5 sections planned
 * Last Updated: 2025-10-09 14:30
 * ```
 *
 * @param metadata - Workflow metadata containing phase, progress, artifacts, timestamp
 * @returns Formatted multi-line string (≤50 tokens)
 */
export function formatWorkflowArtifact(metadata: WorkflowMetadata): string {
  // Get phase definition from registry
  const phase = PHASE_REGISTRY[metadata.phase || 'exploring'];
  const progress = Math.round((metadata.progress || 0) * 100);

  // Start with workflow state header and phase line
  const lines: string[] = [
    '[Workflow State]',
    `Phase: ${phase.label} (${progress}%)`
  ];

  // Add topic summary if exists (truncate to 50 chars max for token budget)
  if (metadata.artifacts?.topicSummary) {
    const topic = metadata.artifacts.topicSummary.length > 50
      ? metadata.artifacts.topicSummary.slice(0, 47) + '...'
      : metadata.artifacts.topicSummary;
    lines.push(`Topic: ${topic}`);
  }

  // Add reference count if exists (shortened format)
  if (metadata.artifacts?.references && metadata.artifacts.references.length > 0) {
    lines.push(`Refs: ${metadata.artifacts.references.length} papers`);
  }

  // Add keywords (max 3, comma-separated for token budget)
  if (metadata.artifacts?.keywords && metadata.artifacts.keywords.length > 0) {
    const keywords = metadata.artifacts.keywords.slice(0, 3).join(', ');
    lines.push(`Keywords: ${keywords}`);
  }

  // Add outline section count if exists (shortened format)
  if (metadata.artifacts?.outline) {
    // Count markdown h2 sections (##)
    const sectionCount = (metadata.artifacts.outline.match(/^##\s/gm) || []).length;
    if (sectionCount > 0) {
      lines.push(`Outline: ${sectionCount} sections`);
    }
  }

  // Add timestamp (Indonesian locale format)
  const timestamp = new Date(metadata.timestamp || new Date()).toLocaleString('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  lines.push(`Last Updated: ${timestamp}`);

  return lines.join('\n');
}

/**
 * Estimate token count for formatted artifact text
 * Uses heuristic: 1 token ≈ 3.5 characters for Indonesian mixed text
 *
 * @param text - Formatted artifact text
 * @returns Estimated token count
 */
export function estimateArtifactTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

/**
 * Check if formatted artifact exceeds token budget
 *
 * @param metadata - Workflow metadata to format
 * @param maxTokens - Maximum allowed tokens (default: 50)
 * @returns True if within budget, false if exceeds
 */
export function isWithinTokenBudget(
  metadata: WorkflowMetadata,
  maxTokens: number = 50
): boolean {
  const formatted = formatWorkflowArtifact(metadata);
  const tokenCount = estimateArtifactTokens(formatted);
  return tokenCount <= maxTokens;
}
