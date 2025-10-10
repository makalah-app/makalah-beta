// Import AI SDK v5 UIMessage type
import type { UIMessage } from 'ai';

// 1. Define Phase type (11 workflow phases)
export type WorkflowPhase =
  | 'exploring'
  | 'topic_locked'
  | 'researching'
  | 'foundation_ready'
  | 'outlining'
  | 'outline_locked'
  | 'drafting'
  | 'drafting_locked'
  | 'integrating'
  | 'polishing'
  | 'delivered';

// 2. Define Reference metadata structure
export interface ReferenceMetadata {
  author: string;
  year: number;
  title: string;
  doi?: string;
  journal?: string;
}

// 3. Rollout stages for semantic detection feature flag (Task 3.1)
/**
 * Rollout stages for semantic detection
 */
export type RolloutStage =
  | 'disabled'
  | 'shadow'
  | 'canary_1'
  | 'beta_10'
  | 'gradual_50'
  | 'enabled';

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
 * Status result from feature flag check
 */
export interface SemanticDetectionStatus {
  enabled: boolean;
  stage: RolloutStage;
  useSemanticResult: boolean;
  config: SemanticDetectionConfig;
}

// 4. Define Workflow Artifacts (accumulated data)
export interface WorkflowArtifacts {
  topicSummary?: string;
  researchQuestion?: string;
  references?: ReferenceMetadata[];
  outline?: string;
  completedSections?: string[];
  wordCount?: number;
  targetWordCount?: number;
  keywords?: string[];
}

// 5. Define Workflow Metadata (state stored in UIMessage.metadata)
export interface WorkflowMetadata {
  phase?: WorkflowPhase;
  progress?: number; // 0.0 - 1.0
  artifacts?: WorkflowArtifacts;
  timestamp?: string;
  model?: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  userId?: string;
  offTopicCount?: number; // Track consecutive off-topic messages
  lastRedirectAttempt?: string; // ISO timestamp of last redirect
  // Contextual Guidance metadata (Task 4.3 - Production Monitoring)
  guidance?: {
    triggered: boolean;
    trigger_type?: string; // 'clarifying_question' | 'confusion_signal' | 'stuck_detection'
    token_count?: number;
    retrieval_time?: number; // milliseconds
    chunk_count?: number;
  };
  // Semantic detection comparison log (Task 3.2 - for debugging)
  semantic_comparison?: {
    regex_phase: WorkflowPhase;
    semantic_phase: WorkflowPhase;
    agreement: boolean;
    confidence: number;
    method_used: 'regex' | 'semantic';
  };
}

// 6. Export AcademicUIMessage type (extends AI SDK UIMessage)
export type AcademicUIMessage = UIMessage<WorkflowMetadata>;

// 7. Semantic Detection Result (Task 2.1)
/**
 * Result from semantic phase detection
 *
 * @property phase - Detected workflow phase
 * @property confidence - Similarity score (0-1)
 * @property method - Detection method used ('semantic' or 'fallback')
 */
export interface SemanticDetectionResult {
  phase: WorkflowPhase;
  confidence: number;
  method: 'semantic' | 'fallback';
}

// 8. Detection Comparison (Task 2.2)
/**
 * Comparison result between detection methods
 */
export interface DetectionComparison {
  regex_phase: WorkflowPhase;
  semantic_phase: WorkflowPhase;
  agreement: boolean;
  confidence: number;
  method_used: 'regex' | 'semantic';
}

/**
 * Hybrid detection result with comparison data
 */
export interface HybridDetectionResult {
  result: WorkflowMetadata;
  comparison: DetectionComparison;
}

// 9. Re-export workflow engine types for convenience
export type { PhaseDefinition, WorkflowContext } from '../ai/workflow-engine';
