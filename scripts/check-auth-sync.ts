#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', override: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function main() {
  const authUsers: Record<string, string> = {};
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.error('Failed to list auth users:', error.message);
      process.exit(1);
    }

    for (const user of data.users) {
      if (user.id && user.email) {
        authUsers[user.id] = user.email.toLowerCase();
      }
    }

    if (data.users.length < 200) break;
    page += 1;
  }

  const { data: tableUsers, error: tableError } = await supabase
    .from('users')
    .select('id, email, role');

  if (tableError) {
    console.error('Failed to query public.users:', tableError.message);
    process.exit(1);
  }

  const tableUserIds = new Set((tableUsers || []).map((u) => u.id));
  const missingInTable = Object.keys(authUsers).filter((id) => !tableUserIds.has(id));

  const authIds = new Set(Object.keys(authUsers));
  const orphaned = (tableUsers || []).filter((row) => !authIds.has(row.id));

  console.log('Auth users:', Object.keys(authUsers).length);
  console.log('public.users rows:', tableUsers?.length ?? 0);

  if (missingInTable.length === 0 && orphaned.length === 0) {
    console.log('✅ All users are synchronized.');
    return;
  }

  if (missingInTable.length > 0) {
    console.log('\n⚠️  Users missing in public.users:');
    for (const id of missingInTable) {
      console.log(` - ${id} (${authUsers[id]})`);
    }
  }

  if (orphaned.length > 0) {
    console.log('\n⚠️  Rows in public.users without auth counterpart:');
    for (const row of orphaned) {
      console.log(` - ${row.id} (${row.email ?? 'no-email'}) role=${row.role}`);
    }
  }
}

main().catch((error) => {
  console.error('Unexpected failure:', error);
  process.exit(1);
});
