/**
 * Reset Superadmin Password
 *
 * Resets erik.supit@gmail.com password to M4k4lah2025
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetPassword() {
  const email = 'erik.supit@gmail.com';
  const newPassword = 'M4k4lah2025';

  console.log('🔐 Resetting superadmin password...');
  console.log('Email:', email);

  try {
    // Get user ID from auth.users
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      throw listError;
    }

    const user = users.users.find(u => u.email === email);

    if (!user) {
      throw new Error(`User ${email} not found in auth.users`);
    }

    console.log('✅ User found:', user.id);

    // Update password
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (error) {
      throw error;
    }

    console.log('✅ Password updated successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   Email:', email);
    console.log('   Password:', newPassword);
    console.log('\n🎉 You can now login!');

  } catch (error) {
    console.error('❌ Failed to reset password');
    console.error('Error:', error);
    process.exit(1);
  }
}

resetPassword()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
