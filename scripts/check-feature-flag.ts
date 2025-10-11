/**
 * Check and Enable Feature Flag
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndEnableFlag() {
  console.log('🔍 Checking semantic_detection feature flag...\n');

  // Check if flag exists
  const { data: flag, error } = await supabase
    .from('feature_flags')
    .select('*')
    .eq('flag_name', 'semantic_detection')
    .single();

  if (error && error.code === 'PGRST116') {
    console.log('⚠️  Feature flag does not exist. Creating...\n');

    // Create the flag
    const { data: created, error: createError } = await supabase
      .from('feature_flags')
      .insert({
        flag_name: 'semantic_detection',
        is_enabled: true,
        config: {
          rollout_stage: 'shadow',
          match_threshold: 0.50,
          confidence_threshold: 0.55,
          log_comparisons: true
        }
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating flag:', createError);
      process.exit(1);
    }

    console.log('✅ Feature flag created!');
    console.log(JSON.stringify(created, null, 2));
    return;
  }

  if (error) {
    console.error('❌ Error fetching flag:', error);
    process.exit(1);
  }

  console.log('📋 Current flag state:');
  console.log(JSON.stringify(flag, null, 2));

  // Enable if disabled
  if (!flag.is_enabled) {
    console.log('\n⚠️  Flag is DISABLED. Enabling...\n');

    const { error: updateError } = await supabase
      .from('feature_flags')
      .update({ is_enabled: true })
      .eq('flag_name', 'semantic_detection');

    if (updateError) {
      console.error('❌ Error enabling flag:', updateError);
      process.exit(1);
    }

    console.log('✅ Flag enabled!');
  } else {
    console.log('\n✅ Flag is already ENABLED');
  }

  // Final verification
  const { data: final } = await supabase
    .from('feature_flags')
    .select('*')
    .eq('flag_name', 'semantic_detection')
    .single();

  console.log('\n📊 Final state:');
  console.log('  Name:', final?.flag_name);
  console.log('  Enabled:', final?.is_enabled ? '✅ YES' : '❌ NO');
  console.log('  Stage:', final?.config?.rollout_stage);
  console.log('  Log Comparisons:', final?.config?.log_comparisons ? '✅ YES' : '❌ NO');
  console.log('  Match Threshold:', final?.config?.match_threshold);
  console.log('  Confidence Threshold:', final?.config?.confidence_threshold);

  console.log('\n✅ Ready for frontend testing!\n');
}

checkAndEnableFlag().catch(console.error);
