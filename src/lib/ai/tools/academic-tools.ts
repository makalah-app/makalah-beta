/**
 * Academic Tools - Simplified Natural Flow
 *
 * Implements web search tool following AI SDK v5 patterns from:
 * - /documentation/cookbook/01-next/70-call-tools.mdx
 *
 * Key Features:
 * - Web search tool WITH execute function (automatic execution)
 * - Proper Zod schema validation for all inputs/outputs
 * - Type-safe tool definitions using ToolSet pattern
 * - Trusts natural LLM intelligence instead of rigid programmatic control
 */

import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { SearchProviderManager, type ProviderConfig } from '../tools/search/search-providers';
// ❌ REMOVED: ConversationDepthAnalyzer - over-engineered analysis blocking natural flow
import { getDynamicModelConfig } from '../dynamic-config';
// ❌ REMOVED: AcademicUIMessage import - no longer used after simplification

// Initialize search provider manager
const searchManager = new SearchProviderManager();

// ❌ REMOVED: Phase completion tools - rigid approval gates that block natural LLM flow
// Previously had complete_phase_1 through complete_phase_7 tools (91 lines removed)
// User requirement: Trust natural LLM intelligence instead of programmatic control

// ❌ REMOVED: Phase progression confirmation tool - UI blocking mechanism
// Previously had phase_progression_confirm tool (20 lines removed)
// User requirement: Natural conversation without forced confirmations

/**
 * Web Search Tool - WITH execute function for automatic execution
 *
 * This tool has an execute function and will run automatically without HITL approval
 * Integrates with existing SearchProviderManager for multi-provider search
 */
const webSearchTool = {
  web_search: tool({
    description: 'Search for factual data, recent statistics, academic literature, or verified information when current knowledge is insufficient. ONLY use when: (1) User explicitly requests research/data ("cari", "temukan", "riset"), OR (2) Making factual claims requiring verification. DO NOT use for conceptual explanations, how-to questions, or general discussion.',
    inputSchema: z.object({
      query: z.string().describe('Search query to find relevant information'),
      maxResults: z.number().min(1).max(10).default(8).describe('Maximum number of search results to return (1-10)'),
      provider: z.enum(['native-openai', 'openrouter-online', 'duckduckgo', 'sinta-kemdiktisaintek', 'garuda-kemdikbud'])
        .default('native-openai')
        .describe('Search provider to use - native-openai for general web, openrouter-online for built-in web search, Indonesian sources for academic'),
    }),
    execute: async ({ query, maxResults = 8, provider = 'native-openai' }) => {
      // Executing search - silent handling for production

      try {
        const config: ProviderConfig = {
          maxResults,
          language: 'en',
          timeout: 15000,
        };

        let results: any[];
        let actualProvider = provider;

        // P0.3: Auto-select search provider based on current text provider
        try {
          const dynamicConfig = await getDynamicModelConfig();
          const textProvider = dynamicConfig.primaryProvider;

          if (textProvider) {
            // Using auto-selection based on text provider - silent handling for production
            results = await searchManager.searchWithAutoProvider(query, config, textProvider as any);

            // Determine which provider was actually used
            if (textProvider === 'openai') {
              actualProvider = 'native-openai';
            } else if (textProvider === 'openrouter') {
              actualProvider = 'openrouter-online';
            } else {
              actualProvider = 'duckduckgo';
            }
          } else {
            // Fallback to explicit provider selection
            // No text provider found, using explicit provider - silent handling for production
            results = await searchManager.search(provider as any, query, config);
          }
        } catch (autoError) {
          // Auto-selection failed, falling back to explicit provider - silent handling for production
          results = await searchManager.search(provider as any, query, config);
        }

        // Map to output schema format
        const mappedResults = results.map(result => ({
          title: result.title,
          url: result.url,
          snippet: result.snippet || '',
          source: result.source,
          publishedDate: result.publishedDate,
        }));

        // Found results - silent handling for production

        return {
          results: mappedResults,
          resultsCount: mappedResults.length,
          provider: actualProvider,
          query,
        };
      } catch (error) {
        // Search failed - silent handling for production

        // Return empty results on error - tool should not throw
        return {
          results: [],
          resultsCount: 0,
          provider,
          query,
        };
      }
    },
  }),
} as const;

/**
 * Academic Tools - Simplified Natural Flow
 *
 * Only web search tool for research assistance - trusts natural LLM intelligence
 */
export const academicTools = {
  ...webSearchTool,
} satisfies ToolSet;

// ❌ REMOVED: getToolsRequiringConfirmation - no longer needed with simplified tools
// Only web search tool remains, which has execute function

// ❌ REMOVED: Phase completion tool getters - no longer needed
// - getPhaseCompletionTools() - phaseCompletionTools was removed
// - export { phaseCompletionTools } - phaseCompletionTools was removed
// - getExecutableTools() - simplified to only webSearchTool in academicTools export

// ❌ REMOVED: getConversationAwareTools - 200+ lines of complex gating logic
// This function used ConversationDepthAnalyzer to gate tool availability based on arbitrary metrics
// User requirement: Trust natural LLM intelligence instead of programmatic control

// ❌ REMOVED: Conversation depth analysis functions
// - isReadyForPhaseCompletion() - used ConversationDepthAnalyzer for arbitrary gating
// - getConversationSummary() - complex debugging function for removed depth analysis
// User requirement: Trust natural LLM intelligence instead of programmatic control

// ❌ REMOVED: Natural Language Approval Helpers - programmatic control patterns
// - generatePhaseApprovalOffer() - templated approval messages blocking natural flow
// - containsApprovalOffer() - pattern matching for rigid approval detection
// - extractPhaseFromOffer() - programmatic phase extraction from approvals
// User requirement: Natural LLM conversation instead of templated patterns

/**
 * Type exports for use in other modules
 */
export type AcademicTools = typeof academicTools;
export type WebSearchTool = typeof webSearchTool;

// ❌ REMOVED: Type exports for removed tools
// - PhaseCompletionTools (phaseCompletionTools was removed)
// - ProgressionTools (progressionTools was removed)
