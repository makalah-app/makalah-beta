/**
 * Set Feature Flag to Shadow Mode
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setShadowMode() {
  console.log('🔄 Setting semantic_detection to SHADOW MODE...\n');

  // Update both rollout_stage column AND config
  const { data, error } = await supabase
    .from('feature_flags')
    .update({
      rollout_stage: 'shadow',  // Update column
      config: {
        rollout_stage: 'shadow',  // Also in config for consistency
        match_threshold: 0.50,
        confidence_threshold: 0.55,
        log_comparisons: true
      }
    })
    .eq('flag_name', 'semantic_detection')
    .select();

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log('✅ Updated to shadow mode!\n');

  // Verify
  const { data: flag } = await supabase
    .from('feature_flags')
    .select('*')
    .eq('flag_name', 'semantic_detection')
    .single();

  console.log('📊 Current State:');
  console.log('  Flag Name:', flag?.flag_name);
  console.log('  Rollout Stage:', flag?.rollout_stage, flag?.rollout_stage === 'shadow' ? '✅' : '❌');
  console.log('  Config:', JSON.stringify(flag?.config, null, 2));

  console.log('\n📝 Shadow Mode Behavior:');
  console.log('  ✓ Hybrid detection runs (regex + semantic)');
  console.log('  ✓ Uses REGEX result (safe, no behavior change)');
  console.log('  ✓ Logs comparison for monitoring');
  console.log('  ✓ Check browser console for "[Hybrid Detection]" logs');

  console.log('\n🧪 How to Test:');
  console.log('  1. npm run dev');
  console.log('  2. Open http://localhost:3000/chat');
  console.log('  3. Open DevTools (F12) → Console');
  console.log('  4. Start conversation');
  console.log('  5. Look for comparison logs after each AI response');

  console.log('\n✅ Ready!\n');
}

setShadowMode().catch(console.error);
