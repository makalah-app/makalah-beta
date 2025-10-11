/**
 * Debug RPC Function - Check if it works at all
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugRpcFunction() {
  console.log('🔍 Debugging RPC Function\n');

  // Step 1: Check if match_workflow_chunks function exists
  console.log('Step 1: Check if function exists in database');
  const { data: funcs, error: funcError } = await supabase
    .from('pg_catalog.pg_proc')
    .select('proname')
    .eq('proname', 'match_workflow_chunks');

  if (funcError) {
    console.log('  ⚠️  Cannot query pg_proc (permission issue, this is normal)');
  }

  // Step 2: Create a simple test vector (all zeros)
  console.log('\nStep 2: Test with simple zero vector');
  const zeroVector = new Array(1536).fill(0);
  zeroVector[0] = 1.0; // Make first element 1 to avoid all-zero

  const { data: result1, error: error1 } = await supabase.rpc('match_workflow_chunks', {
    query_embedding: zeroVector,
    match_threshold: 0.01,
    match_count: 5
  });

  console.log(`  RPC call status: ${error1 ? '❌ ERROR' : '✅ SUCCESS'}`);
  if (error1) {
    console.log(`  Error: ${error1.message}`);
    console.log(`  Code: ${error1.code}`);
    console.log(`  Details: ${error1.details || 'N/A'}`);
  } else {
    console.log(`  Results: ${result1?.length || 0} matches`);
  }

  // Step 3: Get ONE embedding from database and test with itself
  console.log('\nStep 3: Get embedding from DB and search with it (should return itself with similarity=1.0)');

  const { data: chunks, error: chunkError } = await supabase
    .from('workflow_knowledge')
    .select('id, phase, embedding')
    .eq('chunk_type', 'phase_definition')
    .eq('phase', 'exploring')
    .limit(1)
    .single();

  if (chunkError || !chunks) {
    console.log(`  ❌ Cannot fetch chunk: ${chunkError?.message}`);
    return;
  }

  console.log(`  Fetched chunk: ${chunks.id} (phase: ${chunks.phase})`);
  console.log(`  Embedding exists: ${chunks.embedding !== null}`);
  console.log(`  Embedding type: ${typeof chunks.embedding}`);

  if (typeof chunks.embedding === 'string') {
    console.log(`  ⚠️  Embedding is STRING, parsing JSON...`);
    try {
      const parsedEmbedding = JSON.parse(chunks.embedding);
      console.log(`  Parsed to array of ${parsedEmbedding.length} numbers`);

      // Search with this exact embedding
      const { data: result2, error: error2 } = await supabase.rpc('match_workflow_chunks', {
        query_embedding: parsedEmbedding,
        match_threshold: 0.99, // Should match itself with 1.0
        match_count: 3
      });

      console.log(`  Search with own embedding:`);
      console.log(`    Status: ${error2 ? '❌ ERROR' : '✅ SUCCESS'}`);
      if (error2) {
        console.log(`    Error: ${error2.message}`);
      } else {
        console.log(`    Results: ${result2?.length || 0} matches`);
        if (result2 && result2.length > 0) {
          result2.forEach((r, i) => {
            console.log(`      ${i + 1}. ${r.phase} (similarity: ${r.similarity})`);
          });
        }
      }
    } catch (parseError) {
      console.log(`  ❌ Failed to parse embedding: ${parseError}`);
    }
  }

  console.log('\n✅ Debug complete\n');
}

debugRpcFunction().catch(console.error);
