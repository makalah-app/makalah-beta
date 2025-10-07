/**
 * Test Login Directly to Supabase
 *
 * Tests if erik.supit@gmail.com can login directly via Supabase Auth API
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Create client with anon key (same as browser)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testLogin() {
  const email = 'erik.supit@gmail.com';
  const password = 'M4k4lah2025';

  console.log('🔐 Testing login to Supabase Auth...');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('Supabase URL:', SUPABASE_URL);
  console.log('\n');

  try {
    // Attempt login
    console.log('📝 Attempting signInWithPassword...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('❌ Login failed!');
      console.error('Error code:', error.status);
      console.error('Error message:', error.message);
      console.error('Error name:', error.name);
      console.error('\nFull error:', JSON.stringify(error, null, 2));

      // Try to get more details from auth.users
      console.log('\n📊 Checking user details in database...');
      const { createClient } = await import('@supabase/supabase-js');
      const adminClient = createClient(
        SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const { data: users } = await adminClient.auth.admin.listUsers();
      const user = users.users.find(u => u.email === email);

      if (user) {
        console.log('User exists in auth.users:');
        console.log('  - ID:', user.id);
        console.log('  - Email:', user.email);
        console.log('  - Email confirmed:', user.email_confirmed_at ? '✅' : '❌');
        console.log('  - Created:', user.created_at);
        console.log('  - Last sign in:', user.last_sign_in_at);
        console.log('  - Banned:', user.banned_until ? '⚠️ BANNED' : '✅ Not banned');
        console.log('  - Confirmed:', user.confirmation_sent_at);
        console.log('\n  Raw user data:', JSON.stringify(user, null, 2));
      } else {
        console.log('❌ User NOT found in auth.users!');
      }

      process.exit(1);
    }

    console.log('✅ Login successful!');
    console.log('\n📋 Session data:');
    console.log('  - User ID:', data.user?.id);
    console.log('  - Email:', data.user?.email);
    console.log('  - Access token:', data.session?.access_token?.substring(0, 50) + '...');
    console.log('  - Refresh token:', data.session?.refresh_token?.substring(0, 50) + '...');

    console.log('\n✅ Login works! The issue is NOT with Supabase Auth.');
    console.log('   Problem likely in frontend login logic or useAuth hook.');

  } catch (error) {
    console.error('❌ Unexpected error during login test');
    console.error('Error:', error);
    process.exit(1);
  }
}

testLogin()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
