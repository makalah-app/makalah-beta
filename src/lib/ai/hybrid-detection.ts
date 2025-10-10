/**
 * Hybrid Detection: Run regex + semantic in parallel (shadow mode)
 *
 * Purpose:
 * - Compare accuracy before full semantic rollout
 * - Log agreement/disagreement for analysis
 * - Enable gradual transition from regex to semantic
 *
 * Shadow Mode Flow:
 * 1. Run both detections in parallel
 * 2. Log comparison results
 * 3. Return regex result (safe - proven method)
 * 4. Track semantic accuracy in background
 *
 * @module hybrid-detection
 * @since Beta 0.3
 */

import type {
  WorkflowMetadata,
  WorkflowPhase,
  DetectionComparison,
  HybridDetectionResult
} from '@/lib/types/academic-message';

// Import detection methods
import { semanticPhaseDetection } from './semantic-detection';

// ============================================
// Core Hybrid Detection Function
// ============================================

/**
 * Run regex and semantic detection in parallel
 *
 * Process:
 * 1. Execute both detections concurrently (Promise.all)
 * 2. Compare results for agreement
 * 3. Log disagreements for analysis
 * 4. Return regex result (shadow mode) or semantic (active mode)
 *
 * @param modelResponse - AI model's response text
 * @param previousState - Previous workflow metadata
 * @param useSemanticResult - If true, use semantic; if false, use regex (shadow mode)
 * @returns Workflow metadata and comparison log
 *
 * @example
 * // Shadow mode: Use regex, log semantic
 * const { result, comparison } = await hybridDetection(
 *   aiResponse,
 *   currentState,
 *   false  // Shadow mode
 * );
 * console.log(comparison.agreement);  // true or false
 *
 * // Active mode: Use semantic
 * const { result, comparison } = await hybridDetection(
 *   aiResponse,
 *   currentState,
 *   true  // Active mode
 * );
 */
export async function hybridDetection(
  modelResponse: string,
  previousState: WorkflowMetadata,
  useSemanticResult: boolean = false  // Default: shadow mode (use regex)
): Promise<HybridDetectionResult> {
  const currentPhase: WorkflowPhase = previousState.phase || 'exploring';

  // ========================================
  // Step 1: Run Both Detections in Parallel
  // ========================================

  const startTime = Date.now();

  // Import regex detection dynamically to avoid circular dependency
  const { regexPhaseDetection } = await import('./workflow-inference-helpers');

  const [regexPhase, semanticResult] = await Promise.all([
    Promise.resolve(regexPhaseDetection(modelResponse, currentPhase)),
    semanticPhaseDetection(modelResponse, currentPhase)
  ]);

  const detectionTime = Date.now() - startTime;

  // ========================================
  // Step 2: Build Comparison
  // ========================================

  const comparison: DetectionComparison = {
    regex_phase: regexPhase,
    semantic_phase: semanticResult.phase,
    agreement: regexPhase === semanticResult.phase,
    confidence: semanticResult.confidence,
    method_used: useSemanticResult ? 'semantic' : 'regex'
  };

  // ========================================
  // Step 3: Log Comparison
  // ========================================

  if (comparison.agreement) {
    console.log('[Hybrid Detection] ✅ Agreement:', {
      phase: comparison.regex_phase,
      confidence: comparison.confidence.toFixed(3),
      detection_time: `${detectionTime}ms`
    });
  } else {
    console.warn('[Hybrid Detection] ⚠️  Disagreement:', {
      regex: comparison.regex_phase,
      semantic: comparison.semantic_phase,
      confidence: comparison.confidence.toFixed(3),
      detection_time: `${detectionTime}ms`,
      response_snippet: modelResponse.substring(0, 100)
    });
  }

  // Record metrics
  hybridMetrics.recordDetection(comparison);

  // ========================================
  // Step 4: Return Result Based on Mode
  // ========================================

  const finalPhase = useSemanticResult ? semanticResult.phase : regexPhase;

  const finalResult: WorkflowMetadata = {
    ...previousState,
    phase: finalPhase,
    timestamp: new Date().toISOString()
  };

  return {
    result: finalResult,
    comparison
  };
}

// ============================================
// Metrics Tracking
// ============================================

/**
 * Track hybrid detection metrics for analysis
 */
export class HybridDetectionMetrics {
  private totalDetections = 0;
  private agreements = 0;
  private disagreements = 0;
  private semanticFallbacks = 0;

  recordDetection(comparison: DetectionComparison) {
    this.totalDetections++;

    if (comparison.agreement) {
      this.agreements++;
    } else {
      this.disagreements++;
    }

    if (comparison.confidence < 0.70) {
      this.semanticFallbacks++;
    }
  }

  getStats() {
    const agreementRate = this.totalDetections > 0
      ? (this.agreements / this.totalDetections) * 100
      : 0;

    return {
      total: this.totalDetections,
      agreements: this.agreements,
      disagreements: this.disagreements,
      agreement_rate: agreementRate.toFixed(2) + '%',
      semantic_fallbacks: this.semanticFallbacks
    };
  }

  reset() {
    this.totalDetections = 0;
    this.agreements = 0;
    this.disagreements = 0;
    this.semanticFallbacks = 0;
  }
}

// Export singleton instance for production tracking
export const hybridMetrics = new HybridDetectionMetrics();
