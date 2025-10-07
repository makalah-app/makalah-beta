/**
 * Sync Auth Metadata
 *
 * Updates auth.users.raw_user_meta_data to match public.users.role
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

async function syncAuthMetadata() {
  const email = 'erik.supit@gmail.com';

  console.log('🔄 Syncing auth metadata for:', email);

  try {
    // Get user from auth.users
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = users.users.find(u => u.email === email);

    if (!authUser) {
      throw new Error(`User ${email} not found in auth.users`);
    }

    console.log('\n📋 Current auth.users metadata:');
    console.log('   raw_user_meta_data:', JSON.stringify(authUser.user_metadata, null, 2));

    // Update user_metadata to include role='superadmin'
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      authUser.id,
      {
        user_metadata: {
          ...authUser.user_metadata,
          role: 'superadmin',
          full_name: 'Erik Supit'
        }
      }
    );

    if (error) {
      throw error;
    }

    console.log('\n✅ Metadata updated successfully!');
    console.log('   New user_metadata:', JSON.stringify(data.user.user_metadata, null, 2));

    console.log('\n🎉 Login should now work with superadmin role!');

  } catch (error) {
    console.error('❌ Failed to sync metadata');
    console.error('Error:', error);
    process.exit(1);
  }
}

syncAuthMetadata()
  .then(() => {
    console.log('\n✅ Sync completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  });
