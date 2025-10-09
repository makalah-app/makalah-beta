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

// 3. Define Workflow Artifacts (accumulated data)
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

// 4. Define Workflow Metadata (state stored in UIMessage.metadata)
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
}

// 5. Export AcademicUIMessage type (extends AI SDK UIMessage)
export type AcademicUIMessage = UIMessage<WorkflowMetadata>;

// 6. Re-export workflow engine types for convenience
export type { PhaseDefinition, WorkflowContext } from '../ai/workflow-engine';
