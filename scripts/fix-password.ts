import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function fixPassword() {
  console.log('🔐 Fixing superadmin password...');
  console.log('   Email: erik.supit@gmail.com');
  console.log('   New Password: M4k4l4h2025 (with lowercase "l")');

  try {
    // Get user ID first
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users.users.find(u => u.email === 'erik.supit@gmail.com');

    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }

    console.log('   User ID:', user.id);

    // Update password using admin API
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: 'M4k4l4h2025'
    });

    if (error) {
      console.log('❌ Error:', error.message);
      process.exit(1);
    }

    console.log('✅ Password updated successfully!');
    console.log('   New password: M4k4l4h2025');
    console.log('   You can now login at /auth or /test-login');

  } catch (err) {
    console.log('❌ Unexpected error:', err);
    process.exit(1);
  }
}

fixPassword();
