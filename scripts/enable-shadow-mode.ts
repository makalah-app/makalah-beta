/**
 * Enable Shadow Mode for Semantic Detection
 *
 * Shadow mode runs both regex + semantic, uses regex result, logs comparison
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function enableShadowMode() {
  console.log('🔄 Enabling Shadow Mode for Semantic Detection\n');

  // Update feature flag to shadow mode
  const { data, error } = await supabase
    .from('feature_flags')
    .update({
      config: {
        rollout_stage: 'shadow',
        match_threshold: 0.50,
        confidence_threshold: 0.55,
        log_comparisons: true
      }
    })
    .eq('flag_name', 'semantic_detection')
    .select();

  if (error) {
    console.error('❌ Error updating feature flag:', error);
    process.exit(1);
  }

  console.log('✅ Feature flag updated to shadow mode');
  console.log('\nConfig:', data?.[0]?.config);

  // Verify
  const { data: flag } = await supabase
    .from('feature_flags')
    .select('*')
    .eq('flag_name', 'semantic_detection')
    .single();

  console.log('\n📋 Current Status:');
  console.log('  Flag Name:', flag?.flag_name);
  console.log('  Enabled:', flag?.is_enabled);
  console.log('  Stage:', flag?.config?.rollout_stage);
  console.log('  Log Comparisons:', flag?.config?.log_comparisons);

  console.log('\n📝 What happens now:');
  console.log('  ✓ Both regex + semantic detection run on every message');
  console.log('  ✓ Chat uses REGEX result (safe, no behavior change)');
  console.log('  ✓ Comparison logged to console for monitoring');
  console.log('  ✓ Check browser DevTools Console for comparison logs');

  console.log('\n🧪 Testing Instructions:');
  console.log('  1. Open http://localhost:3000/chat');
  console.log('  2. Open Browser DevTools (F12) → Console tab');
  console.log('  3. Start new conversation');
  console.log('  4. Look for "[Hybrid Detection]" logs');
  console.log('  5. Check for agreement/disagreement warnings');

  console.log('\n✅ Shadow mode enabled! Ready for frontend testing.\n');
}

enableShadowMode().catch(console.error);
