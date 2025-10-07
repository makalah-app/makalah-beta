/**
 * Verify Password
 *
 * Tests all possible variations of the password to find which one works
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testPassword(email: string, password: string): Promise<boolean> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return !error && !!data.user;
}

async function verifyPassword() {
  const email = 'erik.supit@gmail.com';

  console.log('🔐 Testing password variations for:', email);
  console.log('');

  const passwords = [
    'M4k4lah2025',
    'M4k4l4h2025',  // typo variation
    'M4k4lah2025 ',  // with trailing space
    ' M4k4lah2025',  // with leading space
    'M4kalah2025',   // without number 4 in middle
  ];

  for (const pwd of passwords) {
    process.stdout.write(`Testing: "${pwd}"... `);
    const works = await testPassword(email, pwd);
    if (works) {
      console.log('✅ WORKS!');
      console.log('\n🎉 Correct password found:', pwd);
      return;
    } else {
      console.log('❌ Failed');
    }
  }

  console.log('\n⚠️  None of the common variations worked');
  console.log('    Try manually typing the password in browser');
}

verifyPassword()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
