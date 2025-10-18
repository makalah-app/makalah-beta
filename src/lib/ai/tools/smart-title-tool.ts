import { tool, generateText } from 'ai';
import { z } from 'zod';
import { createOpenAI } from '@ai-sdk/openai';
import { cachedTool } from '@/lib/ai/cache';
import { getDynamicModelConfig } from '@/lib/ai/dynamic-config';
import { hashStrings, sanitizeTitle } from '@/lib/ai/utils/title-utils';

const MAX_PROMPTS = 3;

const baseSmartTitleTool = tool({
  description: 'Generate a short Indonesian academic chat title from early user prompts.',
  parameters: z.object({
    chatId: z.string().default('unknown'),
    userPrompts: z.array(z.string().min(1)).min(1).max(MAX_PROMPTS),
  }),
  execute: async ({ chatId, userPrompts }) => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return '';
    }

    const orderedPrompts = userPrompts.slice(0, MAX_PROMPTS).map((text, index) => {
      return `${index + 1}. ${text.trim()}`;
    });

    const prompt = [
      'Buat judul singkat dan spesifik (maksimal 35 karakter) dalam Bahasa Indonesia untuk percakapan akademik berikut.',
      'Syarat: Title Case, tanpa tanda kutip, tanpa titik di akhir, tanpa nomor.',
      'Fokus pada keyword utama. Maksimal 4-5 kata.',
      'Dasarkan pada 1-3 prompt awal user di bawah ini:',
      ...orderedPrompts,
      'Output hanya judulnya saja.',
    ].join('\n');

    const titleOpenAI = createOpenAI({ apiKey: key });

    let modelName = 'gpt-4o';
    let temperature = 0.3;

    try {
      const dynamic = await getDynamicModelConfig();
      temperature = Math.min(dynamic.config.temperature * 3, 0.5);
      if (dynamic.primaryProvider === 'openai' && dynamic.primaryModelName) {
        modelName = dynamic.primaryModelName;
      }
    } catch {
      // Preserve defaults silently when dynamic config unavailable.
    }

    try {
      const result = await generateText({
        model: titleOpenAI(modelName),
        prompt,
        temperature,
        maxOutputTokens: 48,
        metadata: {
          source: 'smart-title-tool',
          chatId,
        },
      });

      const raw = typeof result === 'object' && 'text' in result ? String(result.text) : '';
      return sanitizeTitle(raw, { maxLength: 35 });
    } catch {
      return '';
    }
  },
});

export const smartTitleTool = cachedTool(baseSmartTitleTool, {
  scope: 'smart-title',
  keyGenerator: ({ chatId, userPrompts }) => {
    const hash = hashStrings(userPrompts);
    return `smart-title:${chatId}:${hash}`;
  },
  shouldCache: (_, result) => Boolean(result),
  metricsId: 'tool.smart-title',
});

export async function generateSmartTitleFromPrompts(
  chatId: string,
  userPrompts: string[]
): Promise<string | null> {
  if (userPrompts.length === 0) {
    return null;
  }

  const title = await smartTitleTool.execute({
    chatId,
    userPrompts,
  });

  return title ? title : null;
}
