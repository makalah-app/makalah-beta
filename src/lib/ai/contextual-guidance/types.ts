/**
 * Type definitions for Contextual Guidance system
 *
 * Part of: Phase 4 - Contextual Guidance (RAG Tier 2)
 */

import type { WorkflowPhase } from '@/lib/types/academic-message';

// ===================================================================
// Detection Types
// ===================================================================

export type TriggerType =
  | 'clarifying_question'  // User asks "what should I do?"
  | 'stuck_detection'      // Same phase for >5 messages
  | 'confusion_signal';    // Keywords: "bingung", "tidak mengerti"

export interface DetectionMetadata {
  samePhaseCount?: number;       // For stuck detection
  detectedKeywords?: string[];   // For confusion signals
}

export interface ConfusionDetectionResult {
  needsGuidance: boolean;
  triggerType: TriggerType | null;
  confidence: number;  // 0.0-1.0
  metadata?: DetectionMetadata;
}

// ===================================================================
// Retrieval Types (for next task - Task 4.2)
// ===================================================================

export interface GuidanceChunk {
  id: string;
  chunk_type: 'phase_definition' | 'transition' | 'artifact';
  phase: WorkflowPhase | null;
  title: string;
  content: string;
  similarity: number;
}

export interface GuidanceRetrievalResult {
  chunks: GuidanceChunk[];
  totalTokens: number;
  retrievalTime: number;  // milliseconds
}
