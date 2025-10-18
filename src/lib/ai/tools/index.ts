import { tool } from 'ai';
import { z } from 'zod';
import { cachedTool } from '@/lib/ai/cache';

/**
 * Placeholder helper for the forthcoming search_literature tool.
 * Enforces cache wiring so the real implementation can focus solely on fetching logic.
 */
export function createSearchToolPlaceholder() {
  return cachedTool(
    tool({
      description: 'Placeholder search tool. Replace with search_literature implementation.',
      parameters: z.object({
        query: z.string().min(1, 'Query is required'),
      }),
      execute: async () => {
        throw new Error('search_literature tool not implemented yet');
      },
    }),
    {
      scope: 'search',
      shouldCache: () => false,
      metricsId: 'tool.search.placeholder',
    }
  );
}
