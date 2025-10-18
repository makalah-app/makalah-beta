import { tool, generateText } from 'ai';
import { z } from 'zod';
import { createOpenAI } from '@ai-sdk/openai';
import { cachedTool } from '@/lib/ai/cache';
import { getDynamicModelConfig } from '@/lib/ai/dynamic-config';
import { hashStrings, sanitizeTitle } from '@/lib/ai/utils/title-utils';

const MAX_PROMPTS = 3;

const SmartTitleInputSchema = z.object({
  chatId: z.string().default('unknown'),
  userPrompts: z.array(z.string().min(1)).min(1).max(MAX_PROMPTS),
});
type SmartTitleInput = z.infer<typeof SmartTitleInputSchema>;

const baseSmartTitleTool = tool<SmartTitleInput, string>({
  description: 'Generate a short Indonesian academic chat title from early user prompts.',
  inputSchema: SmartTitleInputSchema,
  execute: async (input, _options) => {
    const { chatId, userPrompts } = input;
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
      const { text } = await generateText({
        model: titleOpenAI(modelName),
        prompt,
        temperature,
        maxOutputTokens: 48,
      });

      const raw = text ?? '';
      return sanitizeTitle(raw, { maxLength: 35 });
    } catch {
      return '';
    }
  },
});

const cachedSmartTitleTool = cachedTool(baseSmartTitleTool, {
  scope: 'smart-title',
  keyGenerator: ({ chatId, userPrompts }) => {
    const hash = hashStrings(userPrompts);
    return `smart-title:${chatId}:${hash}`;
  },
  shouldCache: (_, result) => Boolean(result),
  metricsId: 'tool.smart-title',
});

export const smartTitleTool = cachedSmartTitleTool as typeof baseSmartTitleTool &
  typeof cachedSmartTitleTool;

export async function generateSmartTitleFromPrompts(
  chatId: string,
  userPrompts: string[]
): Promise<string | null> {
  if (userPrompts.length === 0) {
    return null;
  }

  if (!smartTitleTool.execute) {
    throw new Error('smartTitleTool missing execute implementation');
  }

  const result = await smartTitleTool.execute(
    {
      chatId,
      userPrompts,
    },
    {
      toolCallId: `manual-smart-title:${chatId}`,
      messages: [],
    }
  );

  if (typeof result === 'string') {
    return result.length > 0 ? result : null;
  }

  if (result && Symbol.asyncIterator in result) {
    const parts: string[] = [];
    for await (const chunk of result as AsyncIterable<string>) {
      parts.push(chunk);
    }
    const combined = parts.join('');
    return combined.length > 0 ? combined : null;
  }

  return null;
}
