/**
 * Workflow Inference Helpers
 *
 * Extracted from workflow-inference.ts to avoid circular dependencies.
 * Contains regex-based phase detection as fallback method.
 *
 * @module workflow-inference-helpers
 */

import type { WorkflowPhase } from '@/lib/types/academic-message';

/**
 * Regex-based phase detection (fallback method)
 * Keep existing regex patterns for graceful degradation
 */
export function regexPhaseDetection(response: string, currentPhase: WorkflowPhase): WorkflowPhase {
  const text = response.toLowerCase();
  let detectedPhase: WorkflowPhase = currentPhase;

  // Existing regex patterns (unchanged for now)
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

  return detectedPhase;
}
