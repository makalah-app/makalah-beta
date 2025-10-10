/**
 * Retrieval Integration for Contextual Guidance
 *
 * Fetches phase-specific guidance from knowledge base using pgvector similarity search.
 *
 * Part of: Phase 4 - Contextual Guidance (RAG Tier 2)
 * Reference: workflow_infrastructure/04_proposed_improvements/contextual_guidance.md
 */

import { OpenAIEmbeddings } from '@langchain/openai';
import { createClient } from '@supabase/supabase-js';
import type { WorkflowPhase } from '@/lib/types/academic-message';
import type { GuidanceChunk, GuidanceRetrievalResult } from './types';

// ===================================================================
// Configuration
// ===================================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('[Contextual Guidance] Missing required environment variables');
}

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: OPENAI_API_KEY,
  modelName: 'text-embedding-ada-002',
  timeout: 10000,  // 10 second timeout
  maxRetries: 2
});

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

// ===================================================================
// Retrieval Parameters
// ===================================================================

const RETRIEVAL_CONFIG = {
  match_threshold: 0.65,    // Similarity threshold (0.0-1.0)
  match_count: 2,           // Number of chunks to retrieve
  chunk_types: ['transition', 'artifact'] as const  // Focus on guidance, not phase definitions
};

// ===================================================================
// Main Retrieval Function
// ===================================================================

export async function getContextualGuidance(
  userMessage: string,
  currentPhase: WorkflowPhase
): Promise<GuidanceRetrievalResult | null> {
  const startTime = Date.now();

  try {
    // 1. Generate embedding for user message
    const queryEmbedding = await embeddings.embedQuery(userMessage);

    if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== 1536) {
      throw new Error(`Invalid embedding dimensions: ${queryEmbedding?.length}`);
    }

    // 2. Retrieve relevant chunks from database
    const { data, error } = await supabaseAdmin.rpc('match_workflow_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: RETRIEVAL_CONFIG.match_threshold,
      match_count: RETRIEVAL_CONFIG.match_count,
      filter_phase: currentPhase  // Phase-aware filtering
    });

    if (error) {
      console.error('[Contextual Guidance] Database error:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log('[Contextual Guidance] No relevant chunks found');
      return null;
    }

    // 3. Filter by chunk_type (transitions and artifacts only)
    const filteredChunks: GuidanceChunk[] = data
      .filter((chunk: any) =>
        RETRIEVAL_CONFIG.chunk_types.includes(chunk.chunk_type)
      )
      .map((chunk: any) => ({
        id: chunk.id,
        chunk_type: chunk.chunk_type,
        phase: chunk.phase,
        title: chunk.title,
        content: chunk.content,
        similarity: chunk.similarity
      }));

    if (filteredChunks.length === 0) {
      return null;
    }

    // 4. Estimate token count
    const totalTokens = filteredChunks.reduce((sum, chunk) => {
      // Rough estimate: 4 chars per token
      return sum + Math.ceil(chunk.content.length / 4);
    }, 0);

    const retrievalTime = Date.now() - startTime;

    return {
      chunks: filteredChunks,
      totalTokens,
      retrievalTime
    };

  } catch (error) {
    console.error('[Contextual Guidance] Retrieval error:', error);
    return null;
  }
}

// ===================================================================
// Format Guidance for Injection
// ===================================================================

export function formatGuidanceForInjection(chunks: GuidanceChunk[]): string {
  const formattedChunks = chunks.map(chunk => {
    return `[${chunk.chunk_type.toUpperCase()}: ${chunk.title}]\n\n${chunk.content}`;
  });

  return `[Additional Workflow Guidance]\n\n${formattedChunks.join('\n\n---\n\n')}`;
}
