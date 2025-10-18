import { tool } from 'ai';
import { z } from 'zod';
import { cachedTool } from '@/lib/ai/cache';

/**
 * Placeholder helper for the forthcoming search_literature tool.
 * Enforces cache wiring so the real implementation can focus solely on fetching logic.
 */
export function createSearchToolPlaceholder() {
  const SearchPlaceholderSchema = z.object({
    query: z.string().min(1, 'Query is required'),
  });
  type SearchPlaceholderInput = z.infer<typeof SearchPlaceholderSchema>;

  return cachedTool(
    tool<SearchPlaceholderInput, string>({
      description: 'Placeholder search tool. Replace with search_literature implementation.',
      inputSchema: SearchPlaceholderSchema,
      execute: async (_input: SearchPlaceholderInput, _options: unknown) => {
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
