/**
 * Check if feature_flags table exists and show current data
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
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

async function checkFeatureFlags() {
  console.log('Checking feature_flags table...\n');

  // Try to query the table
  const { data, error } = await supabase
    .from('feature_flags')
    .select('*')
    .eq('flag_name', 'contextual_guidance');

  if (error) {
    console.log('❌ Table does not exist or error occurred:');
    console.log(error.message);
    console.log('\n📋 Migration needs to be applied.');
    return;
  }

  if (data && data.length > 0) {
    console.log('✅ Table exists with data:');
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log('✅ Table exists but no contextual_guidance flag found.');
    console.log('📋 Need to initialize flag via rollout script.');
  }
}

checkFeatureFlags();
