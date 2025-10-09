/**
 * Unified Workflow Engine
 *
 * Consolidates workflow logic into a single source of truth.
 * Provides phase registry dengan deskripsi yang mudah dipahami LLM serta
 * context generation for "permanent RAG" pattern.
 *
 * Philosophy: LLM-native - provide state context, not instructions.
 */

import type {
  WorkflowPhase,
  WorkflowMetadata,
  WorkflowArtifacts
} from '../types/academic-message';

// =============================================================================
// PHASE REGISTRY - Single Source of Truth
// =============================================================================

/**
 * Phase definition dengan deskripsi yang mudah dimakan LLM
 */
export interface PhaseDefinition {
  id: WorkflowPhase;
  label: string;          // Indonesian label for UI
  description: string;    // LLM context: what's happening, how to help
  progress: number;       // 0.0 - 1.0
}

/**
 * Workflow context for LLM injection
 * This is the "permanent RAG" pattern - minimal tokens, current state only
 */
export interface WorkflowContext {
  currentPhase: PhaseDefinition;
  artifacts: WorkflowArtifacts;
  contextMessage: string; // Pre-formatted for system message injection
}

/**
 * Unified phase registry dengan deskripsi yang mudah dibaca LLM
 *
 * Descriptions tell LLM "what's happening now" not "what to do"
 * Trust LLM to decide appropriate actions based on context
 */
export const PHASE_REGISTRY: Record<WorkflowPhase, PhaseDefinition> = {
  exploring: {
    id: 'exploring',
    label: 'Exploring',
    description: 'Brainstorming and topic exploration. Help user discover researchable ideas.',
    progress: 0.05
  },

  topic_locked: {
    id: 'topic_locked',
    label: 'Topic Locked',
    description: 'Topic confirmed. Research questions defined. Ready to search literature.',
    progress: 0.15
  },

  researching: {
    id: 'researching',
    label: 'Researching',
    description: 'Literature search active. Gather and synthesize peer-reviewed references.',
    progress: 0.25
  },

  foundation_ready: {
    id: 'foundation_ready',
    label: 'Foundation Ready',
    description: 'Research complete. Sufficient references gathered (≥5-8 papers). Ready to structure.',
    progress: 0.35
  },

  outlining: {
    id: 'outlining',
    label: 'Outlining',
    description: 'Structuring paper sections. Design formal outline based on research direction.',
    progress: 0.45
  },

  outline_locked: {
    id: 'outline_locked',
    label: 'Outline Locked',
    description: 'Structure approved. User ready to start drafting sections.',
    progress: 0.55
  },

  drafting: {
    id: 'drafting',
    label: 'Drafting',
    description: 'Writing section content. Produce complete drafts with citations.',
    progress: 0.65
  },

  drafting_locked: {
    id: 'drafting_locked',
    label: 'Drafting Locked',
    description: 'Draft complete. All sections written. Ready for integration.',
    progress: 0.75
  },

  integrating: {
    id: 'integrating',
    label: 'Integrating',
    description: 'Connecting sections. Ensure smooth transitions and terminology consistency.',
    progress: 0.85
  },

  polishing: {
    id: 'polishing',
    label: 'Polishing',
    description: 'Final refinement. Check grammar, citations, formatting.',
    progress: 0.95
  },

  delivered: {
    id: 'delivered',
    label: 'Delivered',
    description: 'Paper completed. Provide executive summary and publication guidance.',
    progress: 1.0
  }
};

/**
 * Ordered sequence of workflow phases untuk normalisasi legacy data
 */
export const PHASE_SEQUENCE: WorkflowPhase[] = [
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

// =============================================================================
// CONTEXT GENERATION - "Permanent RAG" Pattern
// =============================================================================

/**
 * Context cache for performance optimization
 * TTL: 30 seconds for active conversations
 */
interface CacheEntry {
  context: WorkflowContext;
  timestamp: number;
}

const contextCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30000; // 30 seconds

/**
 * Generate deterministic cache key from workflow metadata
 * Uses phase, artifacts hash, and time bucket (rounded to 30s)
 */
function generateCacheKey(metadata: WorkflowMetadata): string {
  const phase = metadata.phase || 'exploring';
  const timestamp = metadata.timestamp || new Date().toISOString();

  // Round timestamp to nearest 30 seconds for cache hits
  const timeBucket = Math.floor(new Date(timestamp).getTime() / CACHE_TTL_MS);

  // Create deterministic hash of artifacts
  const artifactsHash = metadata.artifacts
    ? JSON.stringify({
        topic: metadata.artifacts.topicSummary?.substring(0, 50),
        rq: metadata.artifacts.researchQuestion?.substring(0, 50),
        refCount: metadata.artifacts.references?.length || 0,
        keywordCount: metadata.artifacts.keywords?.length || 0,
        hasOutline: !!metadata.artifacts.outline,
        sectionCount: metadata.artifacts.completedSections?.length || 0,
        wordCount: metadata.artifacts.wordCount
      })
    : 'empty';

  return `${phase}:${artifactsHash}:${timeBucket}`;
}

/**
 * Clear expired cache entries
 * Run periodically to prevent memory leaks
 */
function clearExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of contextCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      contextCache.delete(key);
    }
  }
}

/**
 * Get workflow context for LLM injection (with caching)
 *
 * This is the "permanent RAG" pattern:
 * - LLM fetches current state (minimal tokens)
 * - No context window limit (only current state, not full history)
 * - Infrastructure provides state, LLM interprets naturally
 *
 * Performance optimizations:
 * - 30-second cache for repeated requests
 * - Token-optimized artifact formatting (40-60 tokens)
 *
 * @param metadata Current workflow metadata from conversation
 * @returns Formatted context ready for system message injection
 */
export function getWorkflowContext(metadata: WorkflowMetadata): WorkflowContext {
  // Check cache first
  const cacheKey = generateCacheKey(metadata);
  const cached = contextCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.context;
  }

  // Compute new context
  const phase = PHASE_REGISTRY[metadata.phase || 'exploring'];

  // Format artifacts with token budgeting (40-60 tokens target)
  const artifactSummary = formatArtifactsWithBudget(metadata.artifacts, 50);

  // Pre-format context message for injection
  const contextMessage = `[Workflow State]
Phase: ${phase.label}
Context: ${phase.description}
${artifactSummary}`.trim();

  const context: WorkflowContext = {
    currentPhase: phase,
    artifacts: metadata.artifacts || {},
    contextMessage
  };

  // Cache result
  contextCache.set(cacheKey, {
    context,
    timestamp: Date.now()
  });

  // Periodic cleanup (every 100 requests)
  if (contextCache.size > 100) {
    clearExpiredCache();
  }

  return context;
}

/**
 * Estimate token count for a string
 * Uses heuristic: 1 token ≈ 4 characters for English
 * Adjusted to 3.5 characters for Indonesian mixed text
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

/**
 * Format artifacts with token budgeting
 *
 * Optimizations:
 * - References: Show count + latest 2 only
 * - Outline: Show section count, not full content
 * - Keywords: Show first 5 only (if more, add "+N more")
 * - Comma-separated format (not newlines) for efficiency
 *
 * @param artifacts Workflow artifacts to format
 * @param maxTokens Maximum tokens to use (default: 50)
 * @returns Formatted string within token budget (40-60 tokens)
 */
function formatArtifactsWithBudget(
  artifacts?: WorkflowArtifacts,
  maxTokens: number = 50
): string {
  if (!artifacts || Object.keys(artifacts).length === 0) {
    return 'Artifacts: None yet';
  }

  const parts: string[] = [];

  // Topic summary (truncate if too long)
  if (artifacts.topicSummary) {
    const topic = artifacts.topicSummary.length > 60
      ? artifacts.topicSummary.substring(0, 57) + '...'
      : artifacts.topicSummary;
    parts.push(`Topic: ${topic}`);
  }

  // Research question (truncate if too long)
  if (artifacts.researchQuestion) {
    const rq = artifacts.researchQuestion.length > 60
      ? artifacts.researchQuestion.substring(0, 57) + '...'
      : artifacts.researchQuestion;
    parts.push(`RQ: ${rq}`);
  }

  // References: Show count + latest 2
  if (artifacts.references && artifacts.references.length > 0) {
    const refCount = artifacts.references.length;
    if (refCount <= 2) {
      // Show all if 2 or fewer
      const refList = artifacts.references
        .map(ref => `${ref.author} ${ref.year}`)
        .join(', ');
      parts.push(`Sources: ${refList}`);
    } else {
      // Show latest 2 only
      const sorted = [...artifacts.references].sort((a, b) => b.year - a.year);
      const latest = sorted.slice(0, 2)
        .map(ref => `${ref.author} ${ref.year}`)
        .join(', ');
      parts.push(`Sources: ${refCount} (latest: ${latest})`);
    }
  }

  // Keywords: Show first 5 only
  if (artifacts.keywords && artifacts.keywords.length > 0) {
    const kwCount = artifacts.keywords.length;
    if (kwCount <= 5) {
      parts.push(`Keywords: ${artifacts.keywords.join(', ')}`);
    } else {
      const firstFive = artifacts.keywords.slice(0, 5).join(', ');
      const remaining = kwCount - 5;
      parts.push(`Keywords: ${firstFive} (+${remaining} more)`);
    }
  }

  // Outline: Show section count
  if (artifacts.outline) {
    const sectionCount = (artifacts.outline.match(/##/g) || []).length;
    if (sectionCount > 0) {
      parts.push(`Outline: ${sectionCount} sections`);
    } else {
      parts.push(`Outline: Ready`);
    }
  }

  // Completed sections
  if (artifacts.completedSections && artifacts.completedSections.length > 0) {
    parts.push(`Completed: ${artifacts.completedSections.join(', ')}`);
  }

  // Word count with progress
  if (artifacts.wordCount) {
    const target = artifacts.targetWordCount || 0;
    if (target > 0) {
      const progress = Math.round((artifacts.wordCount / target) * 100);
      parts.push(`Words: ${artifacts.wordCount}/${target} (${progress}%)`);
    } else {
      parts.push(`Words: ${artifacts.wordCount}`);
    }
  }

  // Format as comma-separated for efficiency
  const formatted = parts.length > 0
    ? `Artifacts: ${parts.join('; ')}`
    : 'Artifacts: None';

  // Verify token budget (50 ± 10 tokens)
  const tokenCount = estimateTokens(formatted);
  if (tokenCount > maxTokens + 10) {
    // Fallback: truncate to max tokens
    const targetChars = (maxTokens + 10) * 3.5;
    return formatted.substring(0, Math.floor(targetChars)) + '...';
  }

  return formatted;
}

/**
 * Legacy function for backward compatibility
 * Use formatArtifactsWithBudget() instead
 * @deprecated
 */
function formatArtifacts(artifacts?: WorkflowArtifacts): string {
  return formatArtifactsWithBudget(artifacts, 50);
}

// =============================================================================
// UTILITY FUNCTIONS - Migrated from workflow-helpers
// =============================================================================

/**
 * Calculate progress from phase
 *
 * @param phase Current workflow phase
 * @returns Progress as decimal (0.0 - 1.0)
 */
export function calculateProgress(phase: WorkflowPhase): number {
  return PHASE_REGISTRY[phase]?.progress || 0.1;
}

/**
 * Get phase index in sequence (0-10)
 * Useful for comparisons and guardrails
 *
 * @param phase Workflow phase
 * @returns Index in sequence (0 = exploring, 10 = delivered)
 */
export function phaseIndex(phase: WorkflowPhase): number {
  return PHASE_SEQUENCE.indexOf(phase);
}

/**
 * Format phase for display (Indonesian)
 *
 * @param phase Workflow phase
 * @returns Indonesian label for UI display
 */
export function formatPhase(phase: WorkflowPhase): string {
  return PHASE_REGISTRY[phase]?.label || 'Unknown';
}

/**
 * Normalize arbitrary value menjadi WorkflowPhase valid.
 * Handles legacy numeric values dari metadata lama.
 */
export function normalizePhase(
  value: unknown,
  fallback: WorkflowPhase = 'exploring'
): WorkflowPhase {
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim() as WorkflowPhase;
    if (PHASE_SEQUENCE.includes(lower)) {
      return lower;
    }
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const index = Math.max(0, Math.min(PHASE_SEQUENCE.length - 1, Math.floor(value)));
    return PHASE_SEQUENCE[index];
  }

  return fallback;
}
