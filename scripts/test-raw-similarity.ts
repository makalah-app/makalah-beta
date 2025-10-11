/**
 * Test Raw Similarity Scores (No Threshold)
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRawSimilarity() {
  const testText = "Mari kita eksplorasi beberapa topik potensial untuk paper Anda";

  console.log('🔍 Testing Raw Similarity Scores (No Threshold)\n');
  console.log(`Query: "${testText}"\n`);

  // Generate embedding
  const { embedding: queryEmbedding } = await embed({
    model: openai.textEmbeddingModel('text-embedding-3-small'),
    value: testText,
    maxRetries: 2,
  });

  console.log(`Embedding dimension: ${queryEmbedding.length}\n`);

  // Get ALL similarities without threshold
  const { data, error } = await supabase.rpc('sql', {
    query: `
      SELECT
        phase,
        chunk_type,
        LEFT(content, 60) as content_preview,
        1 - (embedding <=> $1::vector) AS similarity
      FROM workflow_knowledge
      WHERE chunk_type = 'phase_definition'
      ORDER BY similarity DESC
      LIMIT 15
    `,
    params: [queryEmbedding]
  });

  if (error) {
    console.error('❌ Error:', error);

    // Try alternative: fetch all and calculate manually
    console.log('\nTrying alternative query without raw SQL...\n');

    const { data: allChunks, error: err2 } = await supabase
      .from('workflow_knowledge')
      .select('phase, chunk_type, content, embedding')
      .eq('chunk_type', 'phase_definition')
      .not('embedding', 'is', null);

    if (err2) {
      console.error('❌ Alternative also failed:', err2);
      return;
    }

    console.log(`Found ${allChunks?.length || 0} phase definitions\n`);

    // Check if embeddings exist
    if (allChunks && allChunks.length > 0) {
      const firstChunk = allChunks[0];
      console.log('Sample chunk:');
      console.log(`  Phase: ${firstChunk.phase}`);
      console.log(`  Content: "${firstChunk.content.substring(0, 60)}..."`);
      console.log(`  Has embedding: ${firstChunk.embedding !== null}`);

      if (firstChunk.embedding) {
        console.log(`  Embedding type: ${typeof firstChunk.embedding}`);
        console.log(`  Embedding sample: ${JSON.stringify(firstChunk.embedding).substring(0, 100)}`);
      }
    }

    return;
  }

  console.log('Top similarities:\n');

  for (const row of data || []) {
    const icon = row.similarity > 0.70 ? '✅' : row.similarity > 0.60 ? '⚠️' : '❌';
    console.log(`  ${icon} ${row.phase.padEnd(20)} | ${row.similarity.toFixed(4)} | "${row.content_preview}..."`);
  }
}

testRawSimilarity().catch(console.error);
