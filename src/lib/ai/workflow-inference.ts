import type {
  WorkflowMilestone,
  WorkflowMetadata,
  WorkflowArtifacts,
  AcademicUIMessage,
  ReferenceMetadata
} from '../types/academic-message';
import { calculateProgress } from '../utils/workflow-helpers';

/**
 * Main entry: Infer current workflow state from message history
 * Looks backwards through messages to find latest metadata
 */
export function inferWorkflowState(
  messages: AcademicUIMessage[]
): WorkflowMetadata {
  // Find latest assistant message with metadata
  const assistantMessages = messages
    .filter(m => m.role === 'assistant')
    .reverse();

  const latestWithMetadata = assistantMessages.find(
    m => m.metadata?.milestone
  );

  if (latestWithMetadata?.metadata) {
    return latestWithMetadata.metadata;
  }

  // Default initial state
  return {
    milestone: 'exploring',
    progress: 0.05,
    artifacts: {},
    timestamp: new Date().toISOString()
  };
}

/**
 * Detect if LLM response contains redirect attempt
 * Observes what LLM ALREADY DECIDED, doesn't predict user intent
 *
 * Philosophy: Backend observes LLM behavior, not enforces patterns
 */
function detectRedirectAttempt(llmResponse: string): {
  isRedirect: boolean;
  tier: 1 | 2 | 3 | null;
} {
  const text = llmResponse.toLowerCase();

  // Tier 3: Firm boundary (LLM declining to engage, giving binary choice)
  if (/gue spesifik untuk.*akademik|mau lanjut.*paper.*atau.*selesai/i.test(text)) {
    return { isRedirect: true, tier: 3 };
  }

  // Tier 2: Medium redirect (acknowledged + stronger return to topic)
  if (/noted.*anyway.*(?:paper|topik|outline)|oke.*balik ke.*(?:paper|topik|outline)/i.test(text)) {
    return { isRedirect: true, tier: 2 };
  }

  // Tier 1: Soft redirect (btw/anyway + academic keyword)
  if (/(btw|anyway).*(?:paper|topik|outline|draft|penelitian|riset)/i.test(text)) {
    return { isRedirect: true, tier: 1 };
  }

  return { isRedirect: false, tier: null };
}

/**
 * Infer new state from AI response text
 * Uses priority-based pattern detection
 *
 * Philosophy: Observes LLM behavior (milestones + redirects) from response only
 */
export function inferStateFromResponse(
  response: string,
  previousState: WorkflowMetadata
): WorkflowMetadata {
  const text = response.toLowerCase();
  const currentMilestone = previousState.milestone || 'exploring';

  // Priority-based detection (most specific first)
  let detectedMilestone = currentMilestone;

  // 1. Delivery detection (terminal)
  if (/paper\s+(?:sudah\s+)?selesai|siap\s+diserahkan|dokumen\s+final/i.test(text)) {
    detectedMilestone = 'delivered';
  }
  // 2. Polishing
  else if (/polish|grammar.*check|proofreading|formatting/i.test(text)) {
    detectedMilestone = 'polishing';
  }
  // 3. Integration
  else if (/integrat|transisi|hubung.*bagian|flow.*paper/i.test(text)) {
    detectedMilestone = 'integrating';
  }
  // 4. Drafting
  else if (/(?:mulai|menulis|tulis)\s+(?:draft|section|bagian)/i.test(text)) {
    detectedMilestone = 'drafting';
  }
  // 5. Outline locked
  else if (/outline\s+(?:disetujui|approved|oke)|mari\s+mulai\s+menulis/i.test(text)) {
    detectedMilestone = 'outline_locked';
  }
  // 7. Foundation ready (check before outlining to catch readiness signals)
  else if (/cukup\s+referensi|foundation\s+ready|siap.*(?:membuat|buat)\s+outline/i.test(text)) {
    detectedMilestone = 'foundation_ready';
  }
  // 6. Outlining
  else if (/(?:berikut|ini)\s+(?:adalah\s+)?(?:struktur\s+)?outline|struktur\s+paper|kerangka|susunan\s+bagian/i.test(text)) {
    detectedMilestone = 'outlining';
  }
  // 8. Researching
  else if (/(?:mencari|cari|search).*(?:paper|artikel|jurnal)|web_search/i.test(text)) {
    detectedMilestone = 'researching';
  }
  // 9. Topic locked
  else if (/topik\s+(?:sudah\s+)?(?:dipilih|ditetapkan|fix)|pertanyaan\s+penelitian/i.test(text)) {
    detectedMilestone = 'topic_locked';
  }
  // 10. Exploring (default)
  else if (/eksplorasi|brainstorm|ide.*topik|pilihan.*topik/i.test(text)) {
    detectedMilestone = 'exploring';
  }

  // Extract artifacts
  const artifacts = extractArtifacts(response, previousState.artifacts);

  // Calculate progress
  const progress = calculateProgress(detectedMilestone);

  // Detect redirect attempt from LLM response
  const redirectInfo = detectRedirectAttempt(response);

  // Increment counter ONLY if LLM showed redirect behavior
  const offTopicCount = redirectInfo.isRedirect
    ? (previousState.offTopicCount || 0) + 1
    : 0; // Reset counter when LLM stops redirecting

  const timestamp = new Date().toISOString();

  return {
    milestone: detectedMilestone,
    progress,
    artifacts,
    timestamp,
    offTopicCount,
    lastRedirectAttempt: redirectInfo.isRedirect ? timestamp : previousState.lastRedirectAttempt
  };
}

/**
 * Extract all artifacts from response text
 */
function extractArtifacts(
  response: string,
  previousArtifacts?: WorkflowArtifacts
): WorkflowArtifacts {
  const newRefs = extractReferences(response);
  const mergedRefs = newRefs
    ? [...(previousArtifacts?.references || []), ...newRefs]
    : previousArtifacts?.references;

  return {
    topicSummary: extractTopicSummary(response) || previousArtifacts?.topicSummary,
    researchQuestion: extractResearchQuestion(response) || previousArtifacts?.researchQuestion,
    references: mergedRefs,
    outline: extractOutline(response) || previousArtifacts?.outline,
    completedSections: extractCompletedSections(response) || previousArtifacts?.completedSections,
    keywords: extractKeywords(response) || previousArtifacts?.keywords
  };
}

/**
 * Extract topic summary from response
 */
function extractTopicSummary(text: string): string | undefined {
  const patterns = [
    /(?:topik|topic).*(?:adalah|is|:|yaitu)\s*["']?([^"'\n]+)["']?/i,
    /(?:fokus pada|focus on)\s+["']?([^"'\n]+)["']?/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

/**
 * Extract research question from response
 */
function extractResearchQuestion(text: string): string | undefined {
  const patterns = [
    /(?:pertanyaan penelitian|research question).*(?:adalah|is|:|yaitu)\s*["']?([^"'\n.?!]+[.?!]?)["']?/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].length > 3) {
      return match[1].trim();
    }
  }

  return undefined;
}

/**
 * Extract references from response
 * Simple detection - full parsing would be Phase 3+
 */
function extractReferences(text: string): ReferenceMetadata[] | undefined {
  // Pattern: Author (Year). "Title"
  const pattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*\((\d{4})\)[.\s]*["']([^"']+)["']/g;
  const refs: ReferenceMetadata[] = [];

  let match;
  while ((match = pattern.exec(text)) !== null) {
    refs.push({
      author: match[1],
      year: parseInt(match[2]),
      title: match[3]
    });
  }

  return refs.length > 0 ? refs : undefined;
}

/**
 * Extract outline from response
 */
function extractOutline(text: string): string | undefined {
  // Look for markdown headers or numbered structure
  const outlinePattern = /((?:^|\n)(?:#{1,3}\s+|[\d\.]+\s+)[A-Z][^\n]+\n){4,}/m;
  const match = text.match(outlinePattern);

  if (match && match[1]) {
    return match[1].trim();
  }

  return undefined;
}

/**
 * Extract completed sections from response
 */
function extractCompletedSections(text: string): string[] | undefined {
  const pattern = /(?:selesai|completed?|done).*(?:section|bagian)\s+["']?([^"'\n]+)["']?/gi;
  const sections: string[] = [];

  let match;
  while ((match = pattern.exec(text)) !== null) {
    sections.push(match[1].trim());
  }

  return sections.length > 0 ? sections : undefined;
}

/**
 * Extract keywords from response
 */
function extractKeywords(text: string): string[] | undefined {
  const pattern = /(?:keywords?|kata kunci).*?[:：]\s*([^\n]+)/i;
  const match = text.match(pattern);

  if (match && match[1]) {
    return match[1]
      .split(/[,;]/)
      .map(k => k.trim())
      .filter(k => k.length > 0);
  }

  return undefined;
}
