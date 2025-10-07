/**
 * Create Superadmin Account
 *
 * Directly creates erik.supit@gmail.com account in Supabase Auth and public.users.
 * The auto_promote_superadmin trigger will automatically set role='superadmin'.
 *
 * Usage: node --loader tsx scripts/create-superadmin.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✅' : '❌');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createSuperadmin() {
  const email = 'erik.supit@gmail.com';
  const password = 'M4k4lah2025';
  const fullName = 'Erik Supit';

  console.log('🚀 Creating superadmin account...');
  console.log('Email:', email);

  try {
    // Step 1: Create user in Supabase Auth
    console.log('\n📝 Step 1: Creating user in Supabase Auth...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        role: 'user' // Will be auto-promoted by trigger
      }
    });

    if (authError) {
      console.error('❌ Auth creation error:', authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error('No user returned from auth.admin.createUser');
    }

    console.log('✅ User created in Supabase Auth');
    console.log('   User ID:', authData.user.id);

    // Step 2: Insert into public.users (trigger will auto-promote)
    console.log('\n📝 Step 2: Inserting into public.users...');
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        role: 'user', // Will be changed to 'superadmin' by trigger
        email_verified_at: new Date().toISOString(),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (userError) {
      console.error('❌ User insert error:', userError);
      throw userError;
    }

    console.log('✅ User inserted into public.users');

    // Step 3: Create user profile
    console.log('\n📝 Step 3: Creating user profile...');
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        first_name: 'Erik',
        last_name: 'Supit',
        display_name: fullName,
        predikat: 'Peneliti',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('❌ Profile creation error:', profileError);
      throw profileError;
    }

    console.log('✅ User profile created');

    // Step 4: Verify superadmin role
    console.log('\n📝 Step 4: Verifying superadmin role...');
    const { data: verifyData, error: verifyError } = await supabaseAdmin
      .from('users')
      .select('id, email, role')
      .eq('id', authData.user.id)
      .single();

    if (verifyError) {
      console.error('❌ Verification error:', verifyError);
      throw verifyError;
    }

    console.log('✅ Role verification:');
    console.log('   Email:', verifyData.email);
    console.log('   Role:', verifyData.role);

    if (verifyData.role === 'superadmin') {
      console.log('\n🎉 SUCCESS! Superadmin account created and auto-promoted!');
      console.log('\n📋 Login Credentials:');
      console.log('   Email:', email);
      console.log('   Password:', password);
      console.log('   Role:', verifyData.role);
    } else {
      console.log('\n⚠️  WARNING: Role is not superadmin!');
      console.log('   Expected: superadmin');
      console.log('   Actual:', verifyData.role);
      console.log('\n   Trigger might not have fired. Check migration status.');
    }

  } catch (error) {
    console.error('\n❌ FAILED to create superadmin account');
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
createSuperadmin()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
