import { tool } from 'ai';
import { z } from 'zod';
import { ArtifactRegistry } from '@/lib/ai/artifacts';
import { getContext as getArtifactContext } from '@/lib/ai/tools/artifact-context';

const SectionSchema = z.object({
  heading: z.string().min(1, 'Heading wajib diisi'),
  content: z.string().min(1, 'Konten wajib diisi'),
  level: z.enum(['h1', 'h2', 'h3', 'h4']).optional(),
});

const ReferenceSchema = z.object({
  title: z.string().min(1),
  url: z.string().min(1),
  summary: z.string().optional(),
});

const MetadataSchema = z.object({
  discipline: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  language: z.enum(['id', 'en']).optional(),
}).optional();

const WriteArtifactZodSchema = z.object({
  title: z.string().min(1).optional(),
  synopsis: z.string().optional(),
  sections: z.array(SectionSchema).default([]),
  references: z.array(ReferenceSchema).optional(),
  metadata: MetadataSchema,
});

const WriteArtifactJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
      minLength: 1,
      description: 'Judul artefak analisis (opsional).',
    },
    synopsis: {
      type: 'string',
      description: 'Ringkasan singkat (opsional).',
    },
    sections: {
      type: 'array',
      description: 'Daftar bagian analisis akademik.',
      default: [],
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          heading: {
            type: 'string',
            minLength: 1,
            description: 'Judul bagian.',
          },
          content: {
            type: 'string',
            minLength: 1,
            description: 'Isi bagian (HTML atau markdown).',
          },
          level: {
            type: 'string',
            enum: ['h1', 'h2', 'h3', 'h4'],
            description: 'Level heading (default h2).',
          },
        },
        required: ['heading', 'content'],
      },
    },
    references: {
      type: 'array',
      description: 'Daftar referensi pendukung.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: {
            type: 'string',
            minLength: 1,
            description: 'Judul atau sumber referensi.',
          },
          url: {
            type: 'string',
            minLength: 1,
            description: 'URL referensi.',
          },
          summary: {
            type: 'string',
            description: 'Ringkasan singkat referensi (opsional).',
          },
        },
        required: ['title', 'url'],
      },
    },
    metadata: {
      type: 'object',
      additionalProperties: false,
      description: 'Metadata tambahan untuk artefak.',
      properties: {
        discipline: {
          type: 'string',
          description: 'Disiplin ilmu terkait.',
        },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Daftar kata kunci.',
        },
        language: {
          type: 'string',
          enum: ['id', 'en'],
          description: 'Kode bahasa konten (default id).',
        },
      },
    },
  },
  required: [],
} as const;

const DEFAULT_TITLE = 'Analisis Akademik';

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ');
}

function getWordCount(value?: string): number {
  if (!value) return 0;
  const text = stripHtml(value).trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

export const writeArtifactTool = tool({
  description:
    'Mengirim artefak analisis akademik formal Bahasa Indonesia ke panel artefak.',
  inputSchema: WriteArtifactZodSchema,
  execute: async (input, options) => {
    // ✅ Get user data from Agent context
    const agentContext = options?.experimental_context as {
      userId: string;
      chatId?: string;
    } | undefined;

    // ✅ Get writer from manual context (still required)
    const artifactContext = getArtifactContext();

    if (!artifactContext?.writer) {
      throw new Error(
        'Artifact writer tidak tersedia. Pastikan execution context sudah di-set.'
      );
    }

    // ✅ Use both contexts with fallback
    const userId = agentContext?.userId || artifactContext.userId;
    const chatId = agentContext?.chatId || artifactContext.sessionId;

    const title = input.title?.trim() || DEFAULT_TITLE;
    const synopsis = input.synopsis?.trim();

    const normalizedSections = [];

    if (synopsis) {
      normalizedSections.push({
        heading: 'Ringkasan',
        content: synopsis,
        level: 'h2' as const,
      });
    }

    for (const section of input.sections) {
      const trimmedHeading = section.heading.trim();
      const trimmedContent = section.content.trim();

      if (!trimmedHeading && !trimmedContent) {
        continue;
      }

      normalizedSections.push({
        heading: trimmedHeading || 'Bagian',
        content: trimmedContent,
        level: section.level ?? 'h2',
      });
    }

    const references = (input.references ?? []).map((reference) => ({
      title: reference.title.trim(),
      url: reference.url.trim(),
      summary: reference.summary?.trim(),
    }));

    const metadataInput = input.metadata;
    const metadata = metadataInput
      ? {
          ...(metadataInput.discipline ? { discipline: metadataInput.discipline } : {}),
          ...(metadataInput.keywords?.length ? { keywords: metadataInput.keywords } : {}),
          language: metadataInput.language ?? 'id',
        }
      : { language: 'id' as const };

    const totalWordCount = normalizedSections.reduce(
      (sum, section) => sum + getWordCount(section.content),
      0
    );

    const artifact = ArtifactRegistry.academicAnalysis.stream({
      title,
      sections: [],
      references: [],
      wordCount: 0,
      stage: 'loading',
      metadata,
    } as any);

    artifact.progress = normalizedSections.length > 0 ? 0.2 : 0.1;

    if (normalizedSections.length > 0 || references.length > 0 || totalWordCount > 0) {
      await artifact.update({
        title,
        stage: 'drafting',
        sections: normalizedSections,
        references,
        wordCount: totalWordCount,
        metadata,
      } as any);

      artifact.progress = 0.75;
    }

    await artifact.complete({
      title,
      stage: 'complete',
      sections: normalizedSections,
      references,
      wordCount: totalWordCount,
      metadata,
    } as any);

    return {
      artifactId: artifact.id,
      stage: 'complete',
      wordCount: totalWordCount,
      sections: normalizedSections.length,
      references: references.length,
    };
  },
});

export type WriteArtifactToolInput = z.infer<typeof WriteArtifactZodSchema>;
