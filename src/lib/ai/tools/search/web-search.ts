/**
 * Web Search Integration - P0.3 Implementation
 * Unified search interface with automatic provider selection
 */

import { SearchProviderManager, type ProviderConfig } from './search-providers';
import { getDynamicModelConfig } from '../../dynamic-config';
import type { SearchResult } from './search-schemas';

// Initialize search provider manager
const searchManager = new SearchProviderManager();

export interface WebSearchOptions {
  maxResults?: number;
  language?: string;
  timeout?: number;
  forceProvider?: 'native-openai' | 'perplexity' | 'duckduckgo';
}

export interface WebSearchResponse {
  results: SearchResult[];
  provider: string;
  query: string;
  totalResults: number;
}

/**
 * Unified web search function with automatic provider selection
 * Based on P0.3 implementation requirements
 */
export async function webSearch(
  query: string,
  options: WebSearchOptions = {}
): Promise<WebSearchResponse> {
  const {
    maxResults = 10,
    language = 'en',
    timeout = 15000,
    forceProvider
  } = options;

  // Starting unified search - silent handling for production

  const config: ProviderConfig = {
    maxResults,
    language,
    timeout,
  };

  try {
    let results: SearchResult[];
    let actualProvider: string;

    if (forceProvider) {
      // Use explicitly specified provider
      // Using forced provider - silent handling for production
      results = await searchManager.search(forceProvider, query, config);
      actualProvider = forceProvider;
    } else {
      // Auto-select provider based on text provider (P0.3 policy)
      const dynamicConfig = await getDynamicModelConfig();
      const textProvider = dynamicConfig.primaryProvider;

      if (textProvider) {
        // Auto-selecting based on text provider - silent handling for production
        results = await searchManager.searchWithAutoProvider(query, config, textProvider);

        // Determine actual provider used
        if (textProvider === 'openai') {
          actualProvider = 'native-openai';
        } else if (textProvider === 'openrouter') {
          actualProvider = 'perplexity';
        } else {
          actualProvider = 'duckduckgo';
        }
      } else {
        // Default fallback
        // No text provider detected, using DuckDuckGo fallback - silent handling for production
        results = await searchManager.search('duckduckgo', query, config);
        actualProvider = 'duckduckgo';
      }
    }

    // Search completed - silent handling for production

    return {
      results,
      provider: actualProvider,
      query,
      totalResults: results.length,
    };

  } catch (error) {
    // Search failed - silent handling for production

    // Return empty results instead of throwing
    return {
      results: [],
      provider: 'error',
      query,
      totalResults: 0,
    };
  }
}

/**
 * Legacy interface for backward compatibility
 * @deprecated Use webSearch() function directly
 */
export function getWebSearch() {
  return {
    async query(q: string, options?: WebSearchOptions): Promise<WebSearchResponse> {
      return webSearch(q, options);
    },
  };
}

/**
 * Quick search with OpenAI native provider
 */
export async function searchWithOpenAI(query: string, maxResults = 8): Promise<SearchResult[]> {
  const response = await webSearch(query, {
    maxResults,
    forceProvider: 'native-openai'
  });
  return response.results;
}

/**
 * Quick search with Perplexity provider
 */
export async function searchWithPerplexity(query: string, maxResults = 8): Promise<SearchResult[]> {
  const response = await webSearch(query, {
    maxResults,
    forceProvider: 'perplexity'
  });
  return response.results;
}

/**
 * Quick search with DuckDuckGo provider
 */
export async function searchWithDuckDuckGo(query: string, maxResults = 8): Promise<SearchResult[]> {
  const response = await webSearch(query, {
    maxResults,
    forceProvider: 'duckduckgo'
  });
  return response.results;
}