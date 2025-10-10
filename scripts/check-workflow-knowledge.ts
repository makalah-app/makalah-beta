/**
 * Verification script for semantic detection infrastructure
 *
 * Checks:
 * - workflow_knowledge table exists
 * - pgvector extension enabled (via table query)
 * - Required row count (41 rows minimum)
 * - match_workflow_chunks function exists
 * - Chunk type distribution
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

async function verifyInfrastructure() {
  console.log('🔍 Verifying Semantic Detection Infrastructure\n');

  let allChecks = true;

  // Check 1: workflow_knowledge table existence and pgvector support
  console.log('1. Checking workflow_knowledge table and pgvector support...');
  const { data: table, error: tableError } = await supabase
    .from('workflow_knowledge')
    .select('id')
    .limit(1);

  if (tableError) {
    console.log('   ❌ workflow_knowledge table does NOT exist');
    console.log('   Fix: Re-apply Phase 3 migrations');
    console.log(`   Error: ${tableError.message}`);
    allChecks = false;
  } else {
    console.log('   ✅ workflow_knowledge table exists');
    console.log('   ✅ pgvector extension enabled (table has vector column)');
  }

  // Check 2: Row count
  console.log('\n2. Checking knowledge base row count...');
  const { count, error: countError } = await supabase
    .from('workflow_knowledge')
    .select('*', { count: 'exact', head: true });

  if (countError || count === null) {
    console.log('   ❌ Cannot query row count');
    console.log(`   Error: ${countError?.message || 'Unknown error'}`);
    allChecks = false;
  } else if (count < 41) {
    console.log(`   ⚠️  Only ${count} rows found (expected 41+)`);
    console.log('   Warning: May need to re-embed knowledge base');
    allChecks = false;
  } else {
    console.log(`   ✅ ${count} rows found (≥41 required)`);
  }

  // Check 3: match_workflow_chunks function
  console.log('\n3. Checking match_workflow_chunks RPC function...');
  try {
    // Try calling with dummy embedding (1536 dimensions)
    const dummyEmbedding = Array(1536).fill(0);
    const { data, error: rpcError } = await supabase.rpc('match_workflow_chunks', {
      query_embedding: dummyEmbedding,
      match_threshold: 0.5,
      match_count: 1,
      filter_chunk_type: 'phase_definition'
    });

    if (rpcError) {
      console.log('   ❌ match_workflow_chunks function NOT found or broken');
      console.log(`   Error: ${rpcError.message}`);
      allChecks = false;
    } else {
      console.log('   ✅ match_workflow_chunks function exists and works');
      console.log(`   Retrieved ${data?.length || 0} test results`);
    }
  } catch (error) {
    console.log('   ❌ Error testing RPC function');
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    allChecks = false;
  }

  // Check 4: Chunk type distribution
  console.log('\n4. Checking chunk type distribution...');
  const { data: chunks, error: typeError } = await supabase
    .from('workflow_knowledge')
    .select('chunk_type, phase');

  if (typeError || !chunks) {
    console.log('   ❌ Cannot query chunk types');
    console.log(`   Error: ${typeError?.message || 'Unknown error'}`);
    allChecks = false;
  } else {
    const distribution = chunks.reduce((acc: Record<string, number>, row: { chunk_type: string }) => {
      acc[row.chunk_type] = (acc[row.chunk_type] || 0) + 1;
      return acc;
    }, {});

    console.log('   Chunk distribution:');
    Object.entries(distribution).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count} chunks`);
    });

    const hasPhaseDefinitions = (distribution['phase_definition'] || 0) >= 11;
    if (hasPhaseDefinitions) {
      console.log('   ✅ Phase definitions present (≥11 chunks)');
    } else {
      console.log(`   ❌ Missing phase definitions (found ${distribution['phase_definition'] || 0}, need 11)`);
      allChecks = false;
    }
  }

  // Check 5: Verify embeddings exist
  console.log('\n5. Checking embeddings...');
  const { data: embeddedChunks, error: embedError } = await supabase
    .from('workflow_knowledge')
    .select('id')
    .not('embedding', 'is', null);

  if (embedError) {
    console.log('   ❌ Cannot verify embeddings');
    console.log(`   Error: ${embedError.message}`);
    allChecks = false;
  } else {
    const embeddedCount = embeddedChunks?.length || 0;
    const totalCount = count || 0;

    if (embeddedCount === totalCount && totalCount >= 41) {
      console.log(`   ✅ All ${embeddedCount} chunks have embeddings`);
    } else if (embeddedCount < totalCount) {
      console.log(`   ⚠️  Only ${embeddedCount}/${totalCount} chunks have embeddings`);
      console.log('   Warning: Run embedding script to complete missing embeddings');
      allChecks = false;
    }
  }

  // Final report
  console.log('\n' + '='.repeat(60));
  if (allChecks) {
    console.log('✅ ALL CHECKS PASSED - Ready for semantic detection');
    console.log('Next: Run Task 1.2 to add semantic detection indexes');
  } else {
    console.log('❌ SOME CHECKS FAILED - Fix issues before proceeding');
    console.log('\nRequired actions:');
    console.log('  1. Re-apply Phase 3 migrations if table missing');
    console.log('  2. Run embedding script if row count < 41');
    console.log('  3. Verify RPC function creation script');
  }
  console.log('='.repeat(60));

  process.exit(allChecks ? 0 : 1);
}

verifyInfrastructure().catch((error) => {
  console.error('\n❌ Fatal error during verification:');
  console.error(error);
  process.exit(1);
});
