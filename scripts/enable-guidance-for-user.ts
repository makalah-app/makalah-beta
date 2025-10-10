/**
 * Enable Contextual Guidance for specific user (testing)
 *
 * Usage: npx tsx scripts/enable-guidance-for-user.ts <user_email>
 * Example: npx tsx scripts/enable-guidance-for-user.ts erik.supit@gmail.com
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

async function enableGuidanceForUser(email: string) {
  console.log(`\n🔍 Looking up user: ${email}`);

  // Get user ID from email
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email)
    .single();

  if (userError || !user) {
    console.error('❌ User not found:', email);
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.email} (${user.id})`);

  // Add user to enabled_for_users array
  const { error: updateError } = await supabase.rpc('add_user_to_flag', {
    flag_name: 'contextual_guidance',
    user_id: user.id,
    column_name: 'enabled_for_users'
  });

  if (updateError) {
    console.error('❌ Failed to enable guidance:', updateError.message);
    process.exit(1);
  }

  console.log('✅ Contextual Guidance ENABLED for this user!');

  // Verify
  const { data: flag } = await supabase
    .from('feature_flags')
    .select('enabled_for_users')
    .eq('flag_name', 'contextual_guidance')
    .single();

  console.log('\n📋 Enabled users:', flag?.enabled_for_users);
  console.log('\n🎉 User can now experience Contextual Guidance!');
  console.log('\n📖 Next steps:');
  console.log('   1. Start a new conversation at /chat');
  console.log('   2. Follow the test scenarios below');
  console.log('   3. Check admin dashboard for metrics\n');
}

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.error('❌ Usage: npx tsx scripts/enable-guidance-for-user.ts <email>');
  console.error('   Example: npx tsx scripts/enable-guidance-for-user.ts erik.supit@gmail.com');
  process.exit(1);
}

enableGuidanceForUser(email);
