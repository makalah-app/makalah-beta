/**
 * Semantic Phase Detection (Tier 1) - AI SDK v5 Compliant
 *
 * Replaces regex-based detection with embedding similarity search.
 * Philosophy: Backend observes model responses using semantic understanding.
 *
 * ✅ AI SDK v5 COMPLIANT: Uses native embed() function instead of LangChain
 *
 * @module semantic-detection
 * @since Beta 0.3
 */

import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { createClient } from '@supabase/supabase-js';
import type { WorkflowPhase } from '@/lib/types/academic-message';

// ============================================
// Supabase Client
// ============================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// ============================================
// Phase Order for Guardrails
// ============================================

const PHASE_ORDER: WorkflowPhase[] = [
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

// ============================================
// Core Detection Function
// ============================================

/**
 * Semantic phase detection using embedding similarity
 *
 * Process:
 * 1. Generate embedding for AI response using AI SDK v5
 * 2. Search workflow_knowledge for similar phase_definition chunks
 * 3. Apply phase transition guardrails for safety
 * 4. Return detected phase with confidence score
 *
 * @param modelResponse - AI model's response text
 * @param currentPhase - Current workflow phase (for guardrails)
 * @returns Detected phase, confidence, and detection method
 *
 * @example
 * const result = await semanticPhaseDetection(
 *   "Mari kita eksplorasi beberapa topik potensial...",
 *   "exploring"
 * );
 * console.log(result.phase);       // "exploring"
 * console.log(result.confidence);  // 0.87
 * console.log(result.method);      // "semantic"
 */
export async function semanticPhaseDetection(
  modelResponse: string,
  currentPhase: WorkflowPhase
): Promise<{
  phase: WorkflowPhase;
  confidence: number;
  method: 'semantic' | 'fallback';
}> {
  try {
    // ========================================
    // Step 1: Generate Embedding (AI SDK v5)
    // ========================================

    const { embedding: queryEmbedding } = await embed({
      model: openai.textEmbeddingModel('text-embedding-3-small'),
      value: modelResponse,
      maxRetries: 2,
    });

    // ========================================
    // Step 2: Search Phase Definitions
    // ========================================

    const { data, error } = await supabase.rpc('match_workflow_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.65,  // Minimum 65% similarity required
      match_count: 3,         // Get top 3 matches for logging
      filter_chunk_type: 'phase_definition'  // Only search phase chunks
    });

    // Error handling: Fallback to current phase
    if (error || !data || data.length === 0) {
      console.warn('[Semantic Detection] No matches found or error:', error?.message);
      return {
        phase: currentPhase,
        confidence: 0.5,
        method: 'fallback'
      };
    }

    // ========================================
    // Step 3: Get Best Match
    // ========================================

    const topMatch = data[0];
    const detectedPhase = topMatch.phase as WorkflowPhase;
    const similarity = topMatch.similarity;

    // Log top 3 matches for debugging
    console.log('[Semantic Detection] Top matches:', {
      match1: { phase: data[0]?.phase, similarity: data[0]?.similarity },
      match2: { phase: data[1]?.phase, similarity: data[1]?.similarity },
      match3: { phase: data[2]?.phase, similarity: data[2]?.similarity }
    });

    // ========================================
    // Step 4: Apply Guardrails
    // ========================================

    const validatedPhase = applyPhaseTransitionGuardrails(
      currentPhase,
      detectedPhase,
      similarity
    );

    return {
      phase: validatedPhase,
      confidence: similarity,
      method: 'semantic'
    };

  } catch (error) {
    console.error('[Semantic Detection] Error:', error);

    // Graceful degradation: Return current phase on error
    return {
      phase: currentPhase,
      confidence: 0.5,
      method: 'fallback'
    };
  }
}

// ============================================
// Phase Transition Guardrails
// ============================================

/**
 * Apply safety guardrails to phase transitions
 *
 * Rules:
 * 1. No backward jumps (exploring → delivered is invalid)
 * 2. Max +2 steps forward (exploring → outlining is invalid, skip to topic_locked)
 * 3. Low confidence (<0.70) → stay in current phase
 * 4. Terminal phase (delivered) never transitions out
 *
 * Philosophy: Trust semantic detection but prevent illogical jumps
 *
 * @param currentPhase - Current phase from workflow state
 * @param detectedPhase - Phase detected by semantic search
 * @param confidence - Similarity score (0-1)
 * @returns Validated phase after guardrail checks
 *
 * @example
 * // High confidence, valid transition
 * applyPhaseTransitionGuardrails("exploring", "topic_locked", 0.85);
 * // Returns: "topic_locked"
 *
 * // Low confidence, stay put
 * applyPhaseTransitionGuardrails("exploring", "drafting", 0.60);
 * // Returns: "exploring"
 *
 * // Too far forward, limit to +1
 * applyPhaseTransitionGuardrails("exploring", "outlining", 0.85);
 * // Returns: "topic_locked"
 */
function applyPhaseTransitionGuardrails(
  currentPhase: WorkflowPhase,
  detectedPhase: WorkflowPhase,
  confidence: number
): WorkflowPhase {
  // ========================================
  // Rule 1: Terminal Phase Check
  // ========================================

  if (currentPhase === 'delivered') {
    console.log('[Guardrails] Delivered is terminal phase - no transition');
    return 'delivered';
  }

  // ========================================
  // Rule 2: Low Confidence Threshold
  // ========================================

  if (confidence < 0.70) {
    console.log('[Guardrails] Low confidence - staying in current phase');
    return currentPhase;
  }

  // ========================================
  // Rule 3: Get Phase Indices
  // ========================================

  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  const detectedIndex = PHASE_ORDER.indexOf(detectedPhase);

  // Invalid phase detected
  if (currentIndex === -1 || detectedIndex === -1) {
    console.warn('[Guardrails] Invalid phase detected - fallback to current');
    return currentPhase;
  }

  // ========================================
  // Rule 4: No Backward Jumps
  // ========================================

  if (detectedIndex < currentIndex) {
    console.log('[Guardrails] Backward jump prevented:', {
      from: currentPhase,
      to: detectedPhase
    });
    return currentPhase;
  }

  // ========================================
  // Rule 5: Max +2 Steps Forward
  // ========================================

  if (detectedIndex > currentIndex + 2) {
    const limitedPhase = PHASE_ORDER[currentIndex + 1];
    console.log('[Guardrails] Jump too far - limited to +1 step:', {
      from: currentPhase,
      detected: detectedPhase,
      limited: limitedPhase
    });
    return limitedPhase;
  }

  // ========================================
  // Valid Transition
  // ========================================

  console.log('[Guardrails] Valid transition approved:', {
    from: currentPhase,
    to: detectedPhase,
    confidence: confidence
  });

  return detectedPhase;
}
