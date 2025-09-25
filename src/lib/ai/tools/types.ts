/**
 * Simplified Tool Types - Natural LLM Intelligence Focus
 * Only includes search-related types, trusting LLM intelligence for conversation flow
 *
 * Based on cleanup philosophy: Remove programmatic control, enable natural conversation
 */

import type { ToolSet } from 'ai';

/**
 * Simple tool category - only search
 */
export type ToolCategory = 'search';

/**
 * Re-export search types from search module
 */
export type { SearchProvider, SearchResult } from './search/search-schemas';
export type { ProviderConfig } from './search/search-providers';

/**
 * Academic tools type (simplified)
 */
export type AcademicTools = ToolSet;