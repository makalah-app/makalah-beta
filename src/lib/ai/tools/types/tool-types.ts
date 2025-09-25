/**
 * Simplified Tool Types - Natural LLM Intelligence Focus
 * Only includes basic tool types for search functionality
 *
 * Based on cleanup philosophy: Remove programmatic control, enable natural conversation
 */

import type { ToolSet } from 'ai';

/**
 * Re-export simplified types from main types file
 */
export type { ToolCategory, AcademicTools } from '../types';

/**
 * Re-export search types
 */
export type { SearchProvider, SearchResult } from '../search/search-schemas';
export type { ProviderConfig } from '../search/search-providers';