import { artifact } from '@ai-sdk-tools/artifacts';
import {
  AcademicAnalysisSchema,
  SectionDraftSchema,
  PaperOutlineSchema,
  type AcademicAnalysisPayload,
  type SectionDraftPayload,
  type PaperOutlinePayload
} from './types/artifact-schemas';

/**
 * Academic Analysis Artifact Definition
 *
 * Use when: LLM generates formal academic analysis >50 words
 * Detection: Formal Indonesian, has headings, has citations
 * Output: Structured analysis with sections and references
 */
export const AcademicAnalysisArtifact = artifact('academic-analysis', AcademicAnalysisSchema as any);

/**
 * Section Draft Artifact Definition
 *
 * Use when: LLM drafts specific paper section
 * Detection: Formal tone, single section focus, >50 words
 * Output: Complete section with citations
 */
export const SectionDraftArtifact = artifact('section-draft', SectionDraftSchema as any);

/**
 * Paper Outline Artifact Definition
 *
 * Use when: LLM creates hierarchical paper structure
 * Detection: Numbered sections, hierarchical format
 * Output: Complete outline with thesis and sections
 */
export const PaperOutlineArtifact = artifact('paper-outline', PaperOutlineSchema as any);

/**
 * Artifact Registry Export
 * Central registry for all artifact types
 */
export const ArtifactRegistry = {
  academicAnalysis: AcademicAnalysisArtifact,
  sectionDraft: SectionDraftArtifact,
  paperOutline: PaperOutlineArtifact,
} as const;

// Type exports for client usage
export type { AcademicAnalysisPayload, SectionDraftPayload, PaperOutlinePayload };
