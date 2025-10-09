/**
 * Workflow Spec Utilities
 *
 * Provides lightweight accessors untuk mendeskripsikan 11-phase workflow
 * tanpa menambah durasi system prompt panjang. Data diambil dari
 * PHASE_REGISTRY single source of truth.
 */

import { PHASE_REGISTRY, PHASE_SEQUENCE } from './workflow-engine';
import type { WorkflowPhase } from '../types/academic-message';

export interface WorkflowPhaseSpec {
  id: WorkflowPhase;
  label: string;
  description: string;
  progress: number;
}

export interface WorkflowSpec {
  phases: WorkflowPhaseSpec[];
  generatedAt: string;
}

let cachedSpec: WorkflowSpec | null = null;
let cachedSummary: string | null = null;
let lastFetch = 0;
const CACHE_TTL_MS = 30_000;

function computeSpec(): WorkflowSpec {
  const phases = PHASE_SEQUENCE.map(id => {
    const definition = PHASE_REGISTRY[id];
    return {
      id,
      label: definition.label,
      description: definition.description,
      progress: definition.progress,
    };
  });

  return {
    phases,
    generatedAt: new Date().toISOString(),
  };
}

export function getWorkflowSpec(): WorkflowSpec {
  const now = Date.now();
  if (!cachedSpec || now - lastFetch > CACHE_TTL_MS) {
    cachedSpec = computeSpec();
    lastFetch = now;
    cachedSummary = null; // invalidate summary cache
  }

  return cachedSpec;
}

export function getWorkflowSpecSummary(): string {
  if (cachedSummary && cachedSpec) {
    return cachedSummary;
  }

  const spec = getWorkflowSpec();
  const summaryLines = spec.phases.map(phase => {
    const percent = Math.round(phase.progress * 100);
    return `${phase.id}: ${phase.label} – ${phase.description} (≈${percent}%)`;
  });

  cachedSummary = summaryLines.join('\n');
  return cachedSummary;
}
