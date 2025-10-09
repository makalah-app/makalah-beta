import type {
  WorkflowPhase,
  WorkflowMetadata,
  WorkflowArtifacts,
  AcademicUIMessage,
  ReferenceMetadata
} from '../types/academic-message';
import { calculateProgress, phaseIndex } from './workflow-engine';

/**
 * Ambil metadata workflow terbaru dari riwayat pesan
 */
export function inferWorkflowState(
  messages: AcademicUIMessage[]
): WorkflowMetadata {
  const assistantMessages = messages
    .filter(m => m.role === 'assistant')
    .reverse();

  const latestWithMetadata = assistantMessages.find(
    m => m.metadata?.phase
  );

  if (latestWithMetadata?.metadata) {
    return latestWithMetadata.metadata;
  }

  return {
    phase: 'exploring',
    progress: 0.05,
    artifacts: {},
    timestamp: new Date().toISOString()
  };
}

/**
 * Deteksi apakah respons LLM mengandung upaya redirect off-topic
 */
function detectRedirectAttempt(llmResponse: string): {
  isRedirect: boolean;
  tier: 1 | 2 | 3 | null;
} {
  const text = llmResponse.toLowerCase();

  if (/gue spesifik untuk.*akademik|mau lanjut.*paper.*atau.*selesai/i.test(text)) {
    return { isRedirect: true, tier: 3 };
  }

  if (/noted.*anyway.*(?:paper|topik|outline)|oke.*balik ke.*(?:paper|topik|outline)/i.test(text)) {
    return { isRedirect: true, tier: 2 };
  }

  if (/(btw|anyway).*(?:paper|topik|outline|draft|penelitian|riset)/i.test(text)) {
    return { isRedirect: true, tier: 1 };
  }

  return { isRedirect: false, tier: null };
}

/**
 * Infer fase baru dari respons LLM
 */
export function inferStateFromResponse(
  response: string,
  previousState: WorkflowMetadata
): WorkflowMetadata {
  const text = response.toLowerCase();
  const currentPhase: WorkflowPhase = previousState.phase || 'exploring';
  let detectedPhase: WorkflowPhase = currentPhase;

  if (
    /paper\s+(?:sudah\s+)?selesai|siap\s+diserahkan|dokumen\s+final/i.test(text) ||
    /(?:ya|oke).*deliver.*(?:final\s+)?package/i.test(text) ||
    /paper\s+siap\s+submit/i.test(text)
  ) {
    detectedPhase = 'delivered';
  } else if (
    /polish|grammar.*check|proofreading|formatting/i.test(text) ||
    /(?:ya|oke).*(?:mulai\s+)?(?:grammar|polish|citation\s+check)/i.test(text) ||
    /ready.*polish/i.test(text)
  ) {
    detectedPhase = 'polishing';
  } else if (
    /integrat|transisi|hubung.*bagian|flow.*paper/i.test(text) ||
    /(?:semua\s+)?(?:oke|approved).*lanjut\s+integra/i.test(text)
  ) {
    detectedPhase = 'integrating';
  } else if (
    /draft\s+(?:sudah\s+)?(?:selesai|complete|lengkap)/i.test(text) ||
    /(?:semua\s+)?section.*(?:selesai|complete)/i.test(text) ||
    /siap.*integra/i.test(text)
  ) {
    detectedPhase = 'drafting_locked';
  } else if (/(?:mulai|menulis|tulis)\s+(?:draft|section|bagian)/i.test(text)) {
    detectedPhase = 'drafting';
  } else if (
    /outline\s+(?:disetujui|approved|oke|locked)/i.test(text) ||
    /approved.*(?:mulai\s+)?drafting/i.test(text) ||
    /mari\s+mulai\s+menulis/i.test(text)
  ) {
    detectedPhase = 'outline_locked';
  } else if (/(?:berikut|ini)\s+(?:adalah\s+)?(?:struktur\s+)?outline|struktur\s+paper|kerangka|susunan\s+bagian/i.test(text)) {
    detectedPhase = 'outlining';
  } else if (
    /(?:referensi|sumber)\s+(?:sudah\s+)?(?:cukup|lengkap)/i.test(text) ||
    /foundation.*ready|siap.*(?:mulai\s+)?outline/i.test(text) ||
    /(?:punya|ada)\s+\d+.*(?:paper|referensi|sumber)/i.test(text)
  ) {
    detectedPhase = 'foundation_ready';
  } else if (/(?:mencari|cari|search).*(?:paper|artikel|jurnal)|web_search/i.test(text)) {
    detectedPhase = 'researching';
  } else if (
    /topik\s+(?:sudah\s+)?(?:dipilih|ditetapkan|locked|fix)/i.test(text) ||
    /(?:^|\s)locked!?(?:\s|$)/i.test(text) ||
    /pertanyaan\s+penelitian|research\s+question/i.test(text)
  ) {
    detectedPhase = 'topic_locked';
  } else if (/eksplorasi|brainstorm|clarify|ide.*topik|pilihan.*topik/i.test(text)) {
    detectedPhase = 'exploring';
  }

  const previousIndex = Math.max(phaseIndex(currentPhase), 0);
  const detectedIndex = phaseIndex(detectedPhase);

  if (detectedIndex >= 0) {
    if (detectedIndex < previousIndex) {
      detectedPhase = currentPhase;
    } else if (detectedIndex > previousIndex + 1) {
      const sequence: WorkflowPhase[] = [
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

      detectedPhase = sequence[Math.min(previousIndex + 1, sequence.length - 1)];
    }
  }

  const artifacts = extractArtifacts(response, previousState.artifacts);
  const progress = calculateProgress(detectedPhase);
  const redirectInfo = detectRedirectAttempt(response);
  const offTopicCount = redirectInfo.isRedirect
    ? (previousState.offTopicCount || 0) + 1
    : 0;

  const timestamp = new Date().toISOString();

  return {
    ...previousState,
    phase: detectedPhase,
    progress,
    artifacts,
    timestamp,
    offTopicCount,
    lastRedirectAttempt: redirectInfo.isRedirect ? timestamp : previousState.lastRedirectAttempt
  };
}

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

function extractReferences(text: string): ReferenceMetadata[] | undefined {
  const pattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*\((\d{4})\)[.\s]*["']([^"']+)["']/g;
  const refs: ReferenceMetadata[] = [];

  let match;
  while ((match = pattern.exec(text)) !== null) {
    refs.push({
      author: match[1],
      year: parseInt(match[2], 10),
      title: match[3]
    });
  }

  return refs.length > 0 ? refs : undefined;
}

function extractOutline(text: string): string | undefined {
  const outlinePattern = /((?:^|\n)(?:#{1,3}\s+|[\d\.]+\s+)[A-Z][^\n]+\n){4,}/m;
  const match = text.match(outlinePattern);

  if (match && match[1]) {
    return match[1].trim();
  }

  return undefined;
}

function extractCompletedSections(text: string): string[] | undefined {
  const pattern = /(?:selesai|completed?|done).*(?:section|bagian)\s+["']?([^"'\n]+)["']?/gi;
  const sections: string[] = [];

  let match;
  while ((match = pattern.exec(text)) !== null) {
    sections.push(match[1].trim());
  }

  return sections.length > 0 ? sections : undefined;
}

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
