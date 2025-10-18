import { tool } from 'ai';
import { z } from 'zod';
import { ArtifactRegistry } from '@/lib/ai/artifacts';
import { getContext as getArtifactContext } from '@/lib/ai/tools/artifact-context';
import { cachedTool } from '@/lib/ai/cache';

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
  finalize: z.boolean().optional().default(true),
  progressive: z.enum(['paragraph', 'sentence', 'word']).optional(),
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
    finalize: {
      type: 'boolean',
      description: 'Apakah stream harus di-finalize (complete) pada call ini. Default true.',
      default: true,
    },
    progressive: {
      type: 'string',
      enum: ['paragraph', 'sentence'],
      description: 'Mode update bertahap di dalam satu call (opsional).',
    },
  },
  required: [],
} as const;

const DEFAULT_TITLE = 'Analisis Akademik';
const SENTENCE_MODE_THRESHOLD = 40;
const WORD_CHUNK_SIZE = 4;
const STREAM_DELAY_MS = 45;
const FINALIZE_DELAY_MS = 120;
const IS_DEV = process.env.NODE_ENV !== 'production';

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ');
}

function getWordCount(value?: string): number {
  if (!value) return 0;
  const text = stripHtml(value).trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function debugArtifactStream(message: string, context?: Record<string, unknown>) {
  if (!IS_DEV) return;
  // eslint-disable-next-line no-console
  console.debug('[artifact:stream]', message, context ?? {});
}

const baseWriteArtifactTool = tool({
  description:
    'Mengirim artefak analisis akademik formal Bahasa Indonesia ke panel artefak. Dukung streaming bertahap dan finalize opsional.',
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
    const finalize = typeof input.finalize === 'boolean' ? input.finalize : true;
    const progressiveInput = input.progressive as 'paragraph' | 'sentence' | 'word' | undefined;
    const startedAt = Date.now();

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

    let progressiveMode = progressiveInput;
    if (!progressiveMode && normalizedSections.length > 0) {
      const hasLongSection = normalizedSections.some(
        section => getWordCount(section.content) >= SENTENCE_MODE_THRESHOLD
      );
      progressiveMode = hasLongSection ? 'sentence' : 'word';
    }

    if (progressiveMode === 'paragraph') {
      debugArtifactStream('progressive-paragraph-suppressed', {
        progressive: progressiveMode,
        sections: normalizedSections.length,
      });
      progressiveMode = 'sentence';
    }

    const artifact = ArtifactRegistry.academicAnalysis.stream({
      title,
      sections: [],
      references: [],
      wordCount: 0,
      stage: 'loading',
      metadata,
    } as any);

    // Initial progress hint
    artifact.progress = normalizedSections.length > 0 ? 0.2 : 0.1;

    // Helper to clamp progress in streaming phase
    const clamp = (v: number, min = 0, max = 0.95) => Math.max(min, Math.min(max, v));

    const shouldStream = Boolean(progressiveMode) && normalizedSections.length > 0;

    if (shouldStream) {
      debugArtifactStream('progressive-mode-start', {
        finalize,
        progressive: progressiveMode,
        sections: normalizedSections.length,
      });
      const incrementalSections: typeof normalizedSections = [];
      let totalUnits = 0;

      for (const s of normalizedSections) {
        const content = s.content || '';
        let units: string[] = [];
        if (progressiveMode === 'sentence') {
          units = content.split(/(?<=[.!?])\s+/g).map(p => p.trim()).filter(Boolean);
        } else if (progressiveMode === 'word') {
          const words = content.split(/\s+/g).map(w => w.trim()).filter(Boolean);
          const chunks: string[] = [];
          for (let i = 0; i < words.length; i += WORD_CHUNK_SIZE) {
            chunks.push(words.slice(i, i + WORD_CHUNK_SIZE).join(' '));
          }
          units = chunks.length ? chunks : words;
        } else {
          units = content.split(/\n\s*\n+/g).map(p => p.trim()).filter(Boolean);
        }
        totalUnits += Math.max(1, units.length);
      }

      let processed = 0;
      for (let idx = 0; idx < normalizedSections.length; idx++) {
        const base = normalizedSections[idx];
        const content = base.content || '';
        let units: string[] = [];
        if (progressiveMode === 'sentence') {
          units = content.split(/(?<=[.!?])\s+/g).map(p => p.trim()).filter(Boolean);
        } else if (progressiveMode === 'word') {
          const words = content.split(/\s+/g).map(w => w.trim()).filter(Boolean);
          const chunks: string[] = [];
          for (let i = 0; i < words.length; i += WORD_CHUNK_SIZE) {
            chunks.push(words.slice(i, i + WORD_CHUNK_SIZE).join(' '));
          }
          units = chunks.length ? chunks : words;
        } else {
          units = content.split(/\n\s*\n+/g).map(p => p.trim()).filter(Boolean);
        }

        if (units.length === 0) {
          incrementalSections.push(base);
          processed += 1;
          debugArtifactStream('progressive-empty-units', {
            heading: base.heading,
            index: idx,
          });
          await artifact.update({
            title,
            stage: 'drafting',
            sections: [...incrementalSections],
            references,
            wordCount: getWordCount(incrementalSections.map(s => s.content).join(' ')),
            metadata,
          } as any);
          artifact.progress = clamp(0.2 + (processed / Math.max(1, totalUnits)) * 0.7);
          await delay(STREAM_DELAY_MS);
          continue;
        }

        let built = '';
        for (const unit of units) {
          built = built ? `${built}\n\n${unit}` : unit;
          const partial = { ...base, content: built };

          const existingIndex = incrementalSections.findIndex(ss => ss.heading === base.heading);
          if (existingIndex >= 0) incrementalSections[existingIndex] = partial;
          else incrementalSections.push(partial);

          processed += 1;
          debugArtifactStream('progressive-chunk', {
            heading: base.heading,
            chunkWords: getWordCount(unit),
            processed,
            totalUnits,
          });
          await artifact.update({
            title,
            stage: 'drafting',
            sections: [...incrementalSections],
            references,
            wordCount: getWordCount(incrementalSections.map(s => s.content).join(' ')),
            metadata,
          } as any);
          artifact.progress = clamp(0.2 + (processed / Math.max(1, totalUnits)) * 0.7);
          await delay(STREAM_DELAY_MS);
        }
      }
    } else {
      debugArtifactStream('progressive-disabled', {
        finalize,
        progressive: progressiveMode ?? 'none',
        sections: normalizedSections.length,
      });
      // Single-shot update
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
    }

    // Finalize if requested, otherwise keep streaming state
    if (finalize) {
      debugArtifactStream('finalize-start', {
        sections: normalizedSections.length,
        words: totalWordCount,
      });
      artifact.progress = clamp(0.95);
      await artifact.update({
        title,
        stage: 'drafting',
        sections: normalizedSections,
        references,
        wordCount: totalWordCount,
        metadata,
      } as any);
      await delay(FINALIZE_DELAY_MS);
      await artifact.complete({
        title,
        stage: 'complete',
        sections: normalizedSections,
        references,
        wordCount: totalWordCount,
        metadata,
      } as any);
    }

    // Lightweight observability for artifact writes
    try {
      const elapsed = Date.now() - startedAt;
      // eslint-disable-next-line no-console
      console.log('[artifact:write]', {
        chatId,
        userId,
        finalize,
        progressive: progressiveMode ?? 'none',
        sections: normalizedSections.length,
        words: totalWordCount,
        took_ms: elapsed,
        stage: finalize ? 'complete' : 'streaming',
      });
    } catch {}

    return {
      artifactId: artifact.id,
      stage: finalize ? 'complete' : 'streaming',
      wordCount: totalWordCount,
      sections: normalizedSections.length,
      references: references.length,
    };
  },
});

function hashArtifactPayload(value: unknown): string {
  const input = JSON.stringify(value ?? {});
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash >>> 0).toString(16);
}

export const writeArtifactTool = cachedTool(baseWriteArtifactTool, {
  scope: 'artifact',
  keyGenerator: (params) => {
    const context = getArtifactContext();
    const userKey = context?.userId ?? 'anonymous';
    const sessionKey = context?.sessionId ?? 'session';
    const payloadHash = hashArtifactPayload(params);
    return `artifact:${userKey}:${sessionKey}:${payloadHash}`;
  },
  shouldCache: (params) => {
    return Array.isArray(params?.sections) && params.sections.length > 0;
  },
  metricsId: 'tool.write-artifact',
});

export type WriteArtifactToolInput = z.infer<typeof WriteArtifactZodSchema>;
