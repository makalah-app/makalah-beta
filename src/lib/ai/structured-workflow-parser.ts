import type { WorkflowMetadata, WorkflowPhase } from '../types/academic-message';
import { calculateProgress, phaseIndex } from './workflow-engine';

interface StructuredWorkflowStatePayload {
  phase?: string;
  progress?: number;
  artifacts?: Record<string, unknown>;
  timestamp?: string;
  offTopicCount?: number;
}

const STRUCTURED_STATE_REGEX = /<!--\s*workflow-state\s*:(\{[\s\S]*?\})\s*-->/i;

const KNOWN_PHASES: WorkflowPhase[] = [
  'exploring',
  'topic_locked',
  'researching',
  'foundation_ready',
  'outlining',
  'outline_locked',
  'drafting',
  'drafting_locked',
  'integrating',
  'polishing',
  'delivered'
];

function coercePhase(raw: string | undefined, fallback: WorkflowPhase): WorkflowPhase {
  if (!raw) {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase() as WorkflowPhase;
  return KNOWN_PHASES.includes(normalized) ? normalized : fallback;
}

function coerceProgress(progress: unknown, phase: WorkflowPhase, fallback: number): number {
  if (typeof progress === 'number' && Number.isFinite(progress) && progress >= 0 && progress <= 1) {
    return progress;
  }

  return calculateProgress(phase) ?? fallback;
}

function coerceArtifacts(value: unknown, fallback: WorkflowMetadata['artifacts']): WorkflowMetadata['artifacts'] {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as WorkflowMetadata['artifacts'];
  }

  return fallback || {};
}

function coerceTimestamp(value: unknown): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  return new Date().toISOString();
}

export interface StructuredWorkflowStateResult {
  metadata: WorkflowMetadata;
  rawBlock: string;
}

export function extractStructuredWorkflowState(
  response: string,
  previousMetadata: WorkflowMetadata
): StructuredWorkflowStateResult | null {
  const match = STRUCTURED_STATE_REGEX.exec(response);
  if (!match) {
    return null;
  }

  const rawBlock = match[0];
  try {
    const payload = JSON.parse(match[1]) as StructuredWorkflowStatePayload;

    const currentPhase = previousMetadata.phase || 'exploring';
    const coercedPhase = coercePhase(payload.phase, currentPhase);

    // Prevent backwards jumps: only allow same or forward
    const previousIndex = phaseIndex(currentPhase);
    const nextIndex = phaseIndex(coercedPhase);
    const sanitizedPhase =
      nextIndex >= previousIndex ? coercedPhase : currentPhase;

  const progress = coerceProgress(payload.progress, sanitizedPhase, previousMetadata.progress || 0.1);
    const artifacts = coerceArtifacts(payload.artifacts, previousMetadata.artifacts);
    const timestamp = coerceTimestamp(payload.timestamp);
    const offTopicCount = typeof payload.offTopicCount === 'number' ? payload.offTopicCount : previousMetadata.offTopicCount || 0;

    return {
      rawBlock,
      metadata: {
        ...previousMetadata,
        phase: sanitizedPhase,
        progress,
        artifacts,
        timestamp,
        offTopicCount
      }
    };
  } catch (error) {
    console.warn('[Workflow] Failed to parse structured workflow state:', error);
    return null;
  }
}
