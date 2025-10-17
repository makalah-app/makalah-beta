import { z } from 'zod';

/**
 * Base artifact schema for all academic artifacts
 * Used for formal Indonesian academic outputs
 */
const BaseArtifactSchema = z.object({
  title: z.string(),
  stage: z.enum(['loading', 'processing', 'drafting', 'complete']).default('loading'),
  wordCount: z.number().default(0),
  createdAt: z.number().default(() => Date.now()),
  updatedAt: z.number().default(() => Date.now()),
});

/**
 * Academic Analysis Artifact
 * Use case: Formal analysis with sections and citations
 * Detection: >50 words, formal tone, has headings, has citations
 */
export const AcademicAnalysisSchema = BaseArtifactSchema.extend({
  sections: z.array(z.object({
    heading: z.string(),
    content: z.string(),
    level: z.enum(['h1', 'h2', 'h3', 'h4']).default('h2'),
  })).default([]),
  references: z.array(z.object({
    title: z.string(),
    url: z.string(),
    summary: z.string().optional(),
  })).default([]),
  metadata: z.object({
    discipline: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    language: z.enum(['id', 'en']).default('id'),
  }).optional(),
});

export type AcademicAnalysisPayload = z.infer<typeof AcademicAnalysisSchema>;

/**
 * Section Draft Artifact
 * Use case: Individual paper sections
 * Detection: >50 words, formal tone, single section focus
 */
export const SectionDraftSchema = BaseArtifactSchema.extend({
  sectionName: z.enum([
    'Abstract',
    'Pendahuluan',
    'Tinjauan Pustaka',
    'Metodologi',
    'Hasil dan Pembahasan',
    'Kesimpulan',
    'Implikasi',
    'Rekomendasi'
  ]),
  content: z.string(),
  citations: z.array(z.object({
    text: z.string(),
    url: z.string(),
  })).default([]),
  notes: z.array(z.string()).optional(), // Internal notes, not displayed
});

export type SectionDraftPayload = z.infer<typeof SectionDraftSchema>;

/**
 * Paper Outline Artifact
 * Use case: Hierarchical paper structure
 * Detection: Has numbered sections, hierarchical structure
 */
export const PaperOutlineSchema = BaseArtifactSchema.extend({
  thesis: z.string(),
  sections: z.array(z.object({
    level: z.enum(['I', 'II', 'III', '1', '2', '3', 'a', 'b', 'c']),
    heading: z.string(),
    description: z.string(),
    estimatedWords: z.number().optional(),
  })).default([]),
  totalEstimatedWords: z.number().default(0),
  locked: z.boolean().default(false), // Can be locked after approval
});

export type PaperOutlinePayload = z.infer<typeof PaperOutlineSchema>;

/**
 * Export all schemas for registry
 */
export const ArtifactSchemas = {
  academicAnalysis: AcademicAnalysisSchema,
  sectionDraft: SectionDraftSchema,
  paperOutline: PaperOutlineSchema,
} as const;
