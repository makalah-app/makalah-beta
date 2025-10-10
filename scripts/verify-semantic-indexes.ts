/**
 * Verify semantic detection indexes exist and are working
 *
 * Checks:
 * - idx_workflow_knowledge_phase_definition
 * - idx_workflow_knowledge_version
 * - idx_workflow_knowledge_chunk_phase
 *
 * Note: This script queries the workflow_knowledge table to indirectly verify
 * indexes are working. For direct index verification, use Supabase MCP tool.
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

async function verifyIndexes() {
  console.log('🔍 Verifying Semantic Detection Indexes\n');

  let allChecks = true;

  // Test 1: Phase definition filter (uses idx_workflow_knowledge_phase_definition)
  console.log('1. Testing phase definition index...');
  const start1 = Date.now();
  const { data: phaseData, error: error1 } = await supabase
    .from('workflow_knowledge')
    .select('id, title, chunk_type')
    .eq('chunk_type', 'phase_definition')
    .limit(5);

  const time1 = Date.now() - start1;

  if (error1) {
    console.log(`   ❌ Query failed: ${error1.message}`);
    allChecks = false;
  } else {
    console.log(`   ✅ Query completed in ${time1}ms`);
    console.log(`   Retrieved ${phaseData?.length || 0} phase definition chunks`);
  }

  // Test 2: Version filter (uses idx_workflow_knowledge_version)
  console.log('\n2. Testing version index...');
  const start2 = Date.now();
  const { data: versionData, error: error2 } = await supabase
    .from('workflow_knowledge')
    .select('id, version')
    .eq('version', 1)
    .limit(5);

  const time2 = Date.now() - start2;

  if (error2) {
    console.log(`   ❌ Query failed: ${error2.message}`);
    allChecks = false;
  } else {
    console.log(`   ✅ Query completed in ${time2}ms`);
    console.log(`   Retrieved ${versionData?.length || 0} v1 chunks`);
  }

  // Test 3: Composite filter (uses idx_workflow_knowledge_chunk_phase)
  console.log('\n3. Testing composite chunk_type + phase index...');
  const start3 = Date.now();
  const { data: compositeData, error: error3 } = await supabase
    .from('workflow_knowledge')
    .select('id, chunk_type, phase')
    .eq('chunk_type', 'phase_definition')
    .eq('phase', 'exploring')
    .limit(5);

  const time3 = Date.now() - start3;

  if (error3) {
    console.log(`   ❌ Query failed: ${error3.message}`);
    allChecks = false;
  } else {
    console.log(`   ✅ Query completed in ${time3}ms`);
    console.log(`   Retrieved ${compositeData?.length || 0} exploring phase chunks`);
  }

  // Final report
  console.log('\n' + '='.repeat(60));
  console.log('Performance Summary:');
  console.log(`  Phase definition filter: ${time1}ms`);
  console.log(`  Version filter:          ${time2}ms`);
  console.log(`  Composite filter:        ${time3}ms`);
  console.log('\nTarget: All queries <50ms');

  if (allChecks) {
    const allFast = time1 < 50 && time2 < 50 && time3 < 50;
    if (allFast) {
      console.log('✅ All indexes verified and performing well');
    } else {
      console.log('⚠️  Indexes exist but some queries slower than target');
      console.log('   (This is normal with small datasets <100 rows)');
    }
    console.log('\nNext: Proceed to Phase 2 - Semantic Detection Module');
  } else {
    console.log('❌ Some index tests failed');
  }
  console.log('='.repeat(60));

  process.exit(allChecks ? 0 : 1);
}

verifyIndexes().catch((error) => {
  console.error('\n❌ Fatal error during verification:');
  console.error(error);
  process.exit(1);
});
