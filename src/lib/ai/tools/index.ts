/**
 * Tools Module - Simplified for Natural LLM Intelligence
 * Only exports web search functionality, trusting LLM intelligence for conversation flow
 *
 * Based on cleanup philosophy: Remove programmatic control, enable natural conversation
 */

// Export only web search functionality
export { academicTools } from './academic-tools';
export { webSearch } from './search/web-search';

// Export search types and utilities
export type { SearchProvider, SearchResult } from './search/search-schemas';
export { SearchProviderManager } from './search/search-providers';
