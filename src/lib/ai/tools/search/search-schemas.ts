/**
 * Web Search Tool Schemas
 * Comprehensive Zod schemas untuk web search validation
 * 
 * Based on Vercel AI SDK v5 Core patterns dari primary source documentation
 */

import { z } from 'zod';

/**
 * Search provider types
 */
export const SearchProviderSchema = z.enum([
  'native-openai',        // Priority 1: Native OpenAI web search (default)
  'openrouter-online',    // Priority 1: OpenRouter :online suffix (built-in web search)
  'sinta-kemdiktisaintek', // Priority 2: Indonesian academic sources
  'garuda-kemdikbud',     // Priority 2: Indonesian academic sources
  'google',               // Priority 3: International sources
  'bing',
  'duckduckgo',
  'semantic_scholar',     // Priority 3: International academic sources
  'arxiv',
  'pubmed',
  'crossref',
  'ieee',
]);

export type SearchProvider = z.infer<typeof SearchProviderSchema>;

/**
 * Search result schema
 */
export const SearchResultSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  snippet: z.string().optional(),
  publishedDate: z.string().optional(),
  author: z.string().optional(),
  source: z.string().optional(),
  doi: z.string().optional(),
  citationCount: z.number().optional(),
  accessType: z.enum(['open', 'subscription', 'restricted']).optional(),
  contentType: z.enum(['article', 'paper', 'book', 'website', 'pdf', 'video']).optional(),
  language: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

/**
 * Search filters schema
 */
export const SearchFiltersSchema = z.object({
  domains: z.array(z.string()).optional(),
  excludeDomains: z.array(z.string()).optional(),
  fileTypes: z.array(z.string()).optional(),
  academicOnly: z.boolean().optional(),
  freeAccessOnly: z.boolean().optional(),
  peerReviewedOnly: z.boolean().optional(),
  minimumCitations: z.number().min(0).optional(),
  minimumRelevanceScore: z.number().min(0).max(1).optional(),
  languageFilter: z.array(z.string()).optional(),
  dateFilter: z.object({
    start: z.date().optional(),
    end: z.date().optional(),
  }).optional(),
  contentTypeFilter: z.array(z.enum(['article', 'paper', 'book', 'website', 'pdf', 'video'])).optional(),
});

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

/**
 * Web search input schema - SIMPLIFIED for better AI tool usage
 */
export const WebSearchInputSchema = z.object({
  query: z.string()
    .min(2, 'Search query must be at least 2 characters')
    .max(500, 'Query too long')
    .describe('The search query text to look for on the web'),
  maxResults: z.number()
    .min(1)
    .max(20)
    .default(10)
    .optional()
    .describe('Maximum number of search results to return (default: 10)'),
  academicOnly: z.boolean()
    .default(false)
    .optional()
    .describe('Whether to focus on academic/scholarly sources only (default: false)')
});

export type WebSearchInput = z.infer<typeof WebSearchInputSchema>;

/**
 * Web search output schema
 */
export const WebSearchOutputSchema = z.object({
  query: z.string(),
  optimizedQuery: z.string().optional(),
  results: z.array(SearchResultSchema),
  totalResults: z.number(),
  searchDuration: z.number(),
  providers: z.array(SearchProviderSchema),
  statistics: z.object({
    totalProviders: z.number(),
    successfulProviders: z.number(),
    failedProviders: z.number(),
    totalResults: z.number(),
    filteredResults: z.number(),
    duplicatesRemoved: z.number(),
    averageRelevanceScore: z.number(),
    searchDuration: z.number(),
    cacheHit: z.boolean(),
  }),
  cached: z.boolean(),
  metadata: z.object({
    searchId: z.string(),
    timestamp: z.date(),
    parameters: WebSearchInputSchema,
  }),
});

export type WebSearchOutput = z.infer<typeof WebSearchOutputSchema>;