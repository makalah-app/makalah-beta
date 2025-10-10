/**
 * Threshold Tuning Script for Contextual Guidance Retrieval
 *
 * Tests different similarity thresholds to optimize precision vs recall tradeoff.
 * Requires manual review of retrieved guidance for relevance assessment.
 *
 * Part of: Task 4.3 - Testing & Tuning for Contextual Guidance
 * Run: tsx scripts/testing/contextual-guidance/tune-threshold.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { OpenAIEmbeddings } from '@langchain/openai';
import { createClient } from '@supabase/supabase-js';
import type { WorkflowPhase } from '../../../src/lib/types/academic-message';
import * as readline from 'readline';

// ===================================================================
// Configuration
// ===================================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('[Threshold Tuning] Missing required environment variables');
}

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: OPENAI_API_KEY,
  modelName: 'text-embedding-ada-002'
});

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const THRESHOLDS_TO_TEST = [0.55, 0.60, 0.65, 0.70, 0.75];
const MATCH_COUNT = 2; // Number of chunks to retrieve per query
const MAX_SAMPLES_PER_THRESHOLD = 10; // Manual review limit

// ===================================================================
// Load Test Dataset
// ===================================================================

interface TestCase {
  id: string;
  user_message: string;
  phase: WorkflowPhase;
  expected_trigger: boolean;
  expected_type: string | null;
  description: string;
}

interface TestDataset {
  test_cases: TestCase[];
}

const datasetPath = resolve(__dirname, './test-dataset.json');
const testDataset: TestDataset = JSON.parse(
  readFileSync(datasetPath, 'utf-8')
);

// Filter test cases that should trigger guidance
const triggeredCases = testDataset.test_cases.filter(tc => tc.expected_trigger);

console.log(`Loaded ${triggeredCases.length} triggered test cases for threshold tuning`);

// ===================================================================
// Manual Review Interface
// ===================================================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function promptUserForRelevance(): Promise<boolean> {
  const answer = await askQuestion('  Is this retrieval relevant? (y/n): ');
  return answer.toLowerCase().trim() === 'y';
}

// ===================================================================
// Threshold Testing Function
// ===================================================================

interface ChunkResult {
  id: string;
  chunk_type: string;
  phase: string | null;
  title: string;
  content: string;
  similarity: number;
}

interface ThresholdResult {
  threshold: number;
  totalRetrievals: number;
  relevantRetrievals: number;
  precision: number;
  avgSimilarity: number;
  avgTokenCount: number;
  samples: Array<{
    testCaseId: string;
    userMessage: string;
    phase: WorkflowPhase;
    chunks: ChunkResult[];
    relevant: boolean;
  }>;
}

async function testThreshold(
  threshold: number,
  testCases: TestCase[]
): Promise<ThresholdResult> {
  console.log('\n' + '='.repeat(70));
  console.log(`TESTING THRESHOLD: ${threshold}`);
  console.log('='.repeat(70));
  console.log(`Will manually review up to ${MAX_SAMPLES_PER_THRESHOLD} retrievals\n`);

  let totalRetrievals = 0;
  let relevantRetrievals = 0;
  let totalSimilarity = 0;
  let totalTokens = 0;
  const samples: ThresholdResult['samples'] = [];

  // Sample up to MAX_SAMPLES_PER_THRESHOLD test cases
  const samplesToReview = testCases.slice(0, MAX_SAMPLES_PER_THRESHOLD);

  for (const testCase of samplesToReview) {
    console.log(`\n[Test: ${testCase.id}]`);
    console.log(`User: "${testCase.user_message}"`);
    console.log(`Phase: ${testCase.phase}`);

    try {
      // Generate embedding
      const queryEmbedding = await embeddings.embedQuery(testCase.user_message);

      if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== 1536) {
        console.log(`  → Invalid embedding dimensions: ${queryEmbedding?.length}`);
        continue;
      }

      // Retrieve with current threshold
      const { data, error } = await supabaseAdmin.rpc('match_workflow_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: MATCH_COUNT,
        filter_phase: testCase.phase
      });

      if (error) {
        console.log(`  → Database error: ${error.message}`);
        continue;
      }

      if (!data || data.length === 0) {
        console.log(`  → No chunks found above threshold`);
        continue;
      }

      // Filter by chunk_type (transitions and artifacts only)
      const filteredChunks: ChunkResult[] = data
        .filter((chunk: any) => ['transition', 'artifact'].includes(chunk.chunk_type))
        .map((chunk: any) => ({
          id: chunk.id,
          chunk_type: chunk.chunk_type,
          phase: chunk.phase,
          title: chunk.title,
          content: chunk.content,
          similarity: chunk.similarity
        }));

      if (filteredChunks.length === 0) {
        console.log(`  → No relevant chunk types found`);
        continue;
      }

      totalRetrievals++;

      // Display retrieved chunks
      console.log(`\n  Retrieved ${filteredChunks.length} chunks:`);
      filteredChunks.forEach((chunk, i) => {
        console.log(`    ${i + 1}. [${chunk.chunk_type}] ${chunk.title}`);
        console.log(`       Similarity: ${chunk.similarity.toFixed(3)}`);
        console.log(`       Content preview: ${chunk.content.substring(0, 150)}...`);
      });

      // Calculate metrics
      const avgSimilarity = filteredChunks.reduce((sum, c) => sum + c.similarity, 0) / filteredChunks.length;
      const tokenCount = filteredChunks.reduce((sum, c) => sum + Math.ceil(c.content.length / 4), 0);

      totalSimilarity += avgSimilarity;
      totalTokens += tokenCount;

      console.log(`\n  Avg Similarity: ${avgSimilarity.toFixed(3)}, Tokens: ${tokenCount}`);

      // Ask for manual relevance judgment
      const isRelevant = await promptUserForRelevance();
      if (isRelevant) relevantRetrievals++;

      samples.push({
        testCaseId: testCase.id,
        userMessage: testCase.user_message,
        phase: testCase.phase,
        chunks: filteredChunks,
        relevant: isRelevant
      });

    } catch (error) {
      console.log(`  → Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const precision = totalRetrievals > 0 ? relevantRetrievals / totalRetrievals : 0;
  const avgSimilarity = totalRetrievals > 0 ? totalSimilarity / totalRetrievals : 0;
  const avgTokenCount = totalRetrievals > 0 ? totalTokens / totalRetrievals : 0;

  console.log('\n' + '-'.repeat(70));
  console.log(`Threshold ${threshold} Results:`);
  console.log(`  Total Retrievals: ${totalRetrievals}`);
  console.log(`  Relevant: ${relevantRetrievals}`);
  console.log(`  Precision: ${(precision * 100).toFixed(1)}%`);
  console.log(`  Avg Similarity: ${avgSimilarity.toFixed(3)}`);
  console.log(`  Avg Token Count: ${avgTokenCount.toFixed(0)}`);
  console.log('-'.repeat(70));

  return {
    threshold,
    totalRetrievals,
    relevantRetrievals,
    precision,
    avgSimilarity,
    avgTokenCount,
    samples
  };
}

// ===================================================================
// Main Tuning Process
// ===================================================================

async function main() {
  console.log('THRESHOLD TUNING FOR CONTEXTUAL GUIDANCE');
  console.log('='.repeat(70));
  console.log('This script tests different similarity thresholds:');
  console.log(`  ${THRESHOLDS_TO_TEST.join(', ')}`);
  console.log('');
  console.log('You will manually review retrieved guidance and mark as relevant/irrelevant.');
  console.log(`Up to ${MAX_SAMPLES_PER_THRESHOLD} samples per threshold will be reviewed.`);
  console.log('='.repeat(70));
  console.log('');

  const results: ThresholdResult[] = [];

  for (const threshold of THRESHOLDS_TO_TEST) {
    const result = await testThreshold(threshold, triggeredCases);
    results.push(result);
  }

  // Print summary
  console.log('\n\n' + '='.repeat(70));
  console.log('THRESHOLD TUNING SUMMARY');
  console.log('='.repeat(70));
  console.log('');

  console.log('| Threshold | Retrievals | Relevant | Precision | Avg Similarity | Avg Tokens |');
  console.log('|-----------|------------|----------|-----------|----------------|------------|');

  results.forEach(r => {
    console.log(`| ${r.threshold.toFixed(2)}      | ${r.totalRetrievals.toString().padStart(10)} | ${r.relevantRetrievals.toString().padStart(8)} | ${(r.precision * 100).toFixed(1).padStart(8)}% | ${r.avgSimilarity.toFixed(3).padStart(14)} | ${r.avgTokenCount.toFixed(0).padStart(10)} |`);
  });

  console.log('');

  // Recommendation
  console.log('RECOMMENDATION:');
  console.log('');
  console.log('Choose threshold with:');
  console.log('  - Precision ≥75%');
  console.log('  - Sufficient retrievals (not too restrictive)');
  console.log('  - Token count <350');
  console.log('');

  const recommended = results.find(r =>
    r.precision >= 0.75 &&
    r.totalRetrievals >= 5 &&
    r.avgTokenCount < 350
  );

  if (recommended) {
    console.log(`✓ Recommended threshold: ${recommended.threshold}`);
    console.log(`  Precision: ${(recommended.precision * 100).toFixed(1)}%`);
    console.log(`  Avg Tokens: ${recommended.avgTokenCount.toFixed(0)}`);
  } else {
    console.log('⚠ No threshold meets all criteria. Review results and adjust criteria.');
  }

  console.log('');

  // Save results to file
  const outputPath = resolve(__dirname, './threshold-tuning-results.json');
  const output = {
    timestamp: new Date().toISOString(),
    thresholds_tested: THRESHOLDS_TO_TEST,
    results,
    recommendation: recommended ? {
      threshold: recommended.threshold,
      precision: recommended.precision,
      avgTokenCount: recommended.avgTokenCount
    } : null
  };

  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`Results saved to: ${outputPath}`);
  console.log('='.repeat(70));

  rl.close();
  process.exit(0);
}

main().catch(error => {
  console.error('\n❌ Threshold tuning error:', error);
  rl.close();
  process.exit(1);
});
