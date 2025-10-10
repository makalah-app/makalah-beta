/**
 * Detection Logic for Contextual Guidance (RAG Tier 2)
 *
 * Identifies when users need additional workflow context:
 * - Confusion signals (keywords: "bingung", "tidak mengerti")
 * - Stuck in same phase (>5 consecutive messages)
 * - Clarifying questions about workflow
 *
 * Part of: Phase 4 - Contextual Guidance (RAG Tier 2)
 * Reference: workflow_infrastructure/04_proposed_improvements/contextual_guidance.md
 */

import type { AcademicUIMessage, WorkflowPhase } from '@/lib/types/academic-message';
import type { ConfusionDetectionResult } from './types';

// ===================================================================
// Clarifying Question Detection
// ===================================================================

const CLARIFYING_PATTERNS = [
  /apa yang harus.*lakukan/i,              // "what should I do"
  /gimana.*cara/i,                         // "how do I"
  /maksudnya.*apa/i,                       // "what does this mean"
  /apa itu/i,                              // "what is"
  /tolong.*jelaskan/i,                     // "please explain"
  /selanjutnya.*apa/i,                     // "what's next"
  /step.*berikutnya/i,                     // "next step"
  /cara.*mulai/i                           // "how to start"
];

function hasClarifyingQuestion(userMessage: string): boolean {
  return CLARIFYING_PATTERNS.some(pattern => pattern.test(userMessage));
}

// ===================================================================
// Stuck Detection
// ===================================================================

function isUserStuck(
  messageHistory: AcademicUIMessage[],
  currentPhase: WorkflowPhase
): { isStuck: boolean; samePhaseCount: number } {
  // Get last 10 messages
  const recentMessages = messageHistory.slice(-10);

  // Filter for assistant messages with workflow metadata
  const assistantMessages = recentMessages.filter(
    msg => msg.role === 'assistant' && msg.metadata?.phase
  );

  // Count consecutive messages in same phase
  let samePhaseCount = 0;
  for (let i = assistantMessages.length - 1; i >= 0; i--) {
    if (assistantMessages[i].metadata?.phase === currentPhase) {
      samePhaseCount++;
    } else {
      break;
    }
  }

  // Stuck if >5 consecutive assistant messages in same phase
  return {
    isStuck: samePhaseCount > 5,
    samePhaseCount
  };
}

// ===================================================================
// Confusion Signal Detection
// ===================================================================

const CONFUSION_KEYWORDS = [
  'bingung',           // confused
  'tidak paham',       // don't understand
  'tidak mengerti',    // don't get it
  'susah',             // difficult
  'ribet',             // complicated
  'ga ngerti',         // don't understand (informal)
  'kurang jelas'       // unclear
];

function hasConfusionSignal(userMessage: string): {
  hasSignal: boolean;
  detectedKeywords: string[]
} {
  const messageLower = userMessage.toLowerCase();
  const detectedKeywords = CONFUSION_KEYWORDS.filter(
    keyword => messageLower.includes(keyword)
  );

  return {
    hasSignal: detectedKeywords.length > 0,
    detectedKeywords
  };
}

// ===================================================================
// Main Detection Function
// ===================================================================

export async function detectConfusionOrStuck(
  userMessage: string,
  messageHistory: AcademicUIMessage[],
  currentPhase: WorkflowPhase
): Promise<ConfusionDetectionResult> {
  // 1. Check for clarifying questions
  const hasClarifying = hasClarifyingQuestion(userMessage);
  if (hasClarifying) {
    return {
      needsGuidance: true,
      triggerType: 'clarifying_question',
      confidence: 0.85,
      metadata: {}
    };
  }

  // 2. Check for confusion signals
  const { hasSignal, detectedKeywords } = hasConfusionSignal(userMessage);
  if (hasSignal) {
    return {
      needsGuidance: true,
      triggerType: 'confusion_signal',
      confidence: 0.80,
      metadata: { detectedKeywords }
    };
  }

  // 3. Check if stuck in same phase
  const { isStuck, samePhaseCount } = isUserStuck(messageHistory, currentPhase);
  if (isStuck) {
    return {
      needsGuidance: true,
      triggerType: 'stuck_detection',
      confidence: 0.75,
      metadata: { samePhaseCount }
    };
  }

  // No guidance needed
  return {
    needsGuidance: false,
    triggerType: null,
    confidence: 0.0
  };
}

// ===================================================================
// Utility: Get Current Phase from History
// ===================================================================

export function getCurrentPhaseFromHistory(
  messageHistory: AcademicUIMessage[]
): WorkflowPhase | null {
  // Get most recent assistant message with workflow metadata
  for (let i = messageHistory.length - 1; i >= 0; i--) {
    const msg = messageHistory[i];
    if (msg.role === 'assistant' && msg.metadata?.phase) {
      return msg.metadata.phase;
    }
  }

  return null;
}
