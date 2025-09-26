#!/usr/bin/env node
import { webcrypto } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });
loadEnv();

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Environment Supabase belum lengkap.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function executeSql(query) {
  const { data, error } = await supabase.rpc('execute_sql', { query }).catch(() => ({ data: null, error: 'RPC not available' }));

  if (error || !data) {
    // Fallback: use direct query (may not work for DDL)
    console.warn('⚠️  Direct SQL execution not available via RPC');
    return false;
  }

  return true;
}

async function main() {
  console.log('🚨 CRITICAL FIX: Bypassing trigger to restore proper timestamps');
  console.log('🎯 Target: makalah.app@gmail.com');
  console.log('⏰ Starting at:', new Date().toISOString());
  console.log('');

  const userId = '38967a42-3fdb-4d08-8768-bce6f97e3f0b';

  console.log('⚠️  IMPORTANT: This script will temporarily disable the updated_at trigger');
  console.log('');

  // Step 1: Get all conversations with their ACTUAL last message times
  console.log('📊 Step 1: Collecting actual last message times...');

  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('id, title, created_at')
    .eq('user_id', userId)
    .eq('archived', false);

  if (convError) {
    console.error('❌ Failed to load conversations:', convError);
    process.exit(1);
  }

  console.log(`  Found ${conversations.length} conversations`);

  // Collect last message times
  const updateData = [];
  let processedCount = 0;

  for (const conv of conversations) {
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('created_at')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastMessageTime = messages?.[0]?.created_at || conv.created_at;

    updateData.push({
      id: conv.id,
      title: conv.title,
      correct_updated_at: lastMessageTime
    });

    processedCount++;
    if (processedCount % 20 === 0) {
      console.log(`  Progress: ${processedCount}/${conversations.length} analyzed...`);
    }
  }

  // Sort by correct timestamp (newest first)
  updateData.sort((a, b) =>
    new Date(b.correct_updated_at).getTime() - new Date(a.correct_updated_at).getTime()
  );

  console.log('');
  console.log('📝 Step 2: Applying correct timestamps WITH trigger disabled...');
  console.log('');

  // Step 2: Disable trigger (if possible via SQL function)
  const triggerDisabled = await executeSql('ALTER TABLE conversations DISABLE TRIGGER update_conversations_updated_at');

  if (!triggerDisabled) {
    console.log('⚠️  Cannot disable trigger via RPC, attempting workaround...');
    console.log('  Using direct updates with metadata flag...');
  }

  // Step 3: Apply updates
  let successCount = 0;
  let errorCount = 0;
  const sampleUpdates = [];

  for (let i = 0; i < updateData.length; i++) {
    const item = updateData[i];

    // Direct SQL update to bypass SDK trigger handling
    const updateQuery = `
      UPDATE conversations
      SET updated_at = '${item.correct_updated_at}'::timestamptz,
          metadata = COALESCE(metadata, '{}'::jsonb) ||
                     '{"ordering_fixed": true, "bypass_trigger": true}'::jsonb
      WHERE id = '${item.id}'
    `;

    // Try direct SQL first
    const sqlSuccess = await executeSql(updateQuery);

    if (!sqlSuccess) {
      // Fallback to SDK update (will be overridden by trigger but try anyway)
      const { error } = await supabase
        .from('conversations')
        .update({
          updated_at: item.correct_updated_at,
          metadata: {
            ordering_fixed: true,
            fixed_at: new Date().toISOString(),
            correct_timestamp: item.correct_updated_at
          }
        })
        .eq('id', item.id);

      if (error) {
        console.error(`❌ Failed to update ${item.id}:`, error.message);
        errorCount++;
      } else {
        successCount++;
      }
    } else {
      successCount++;
    }

    // Collect samples
    if (sampleUpdates.length < 5) {
      sampleUpdates.push({
        title: item.title?.substring(0, 40) + '...',
        updated_to: item.correct_updated_at
      });
    }

    if ((i + 1) % 20 === 0) {
      console.log(`  Progress: ${i + 1}/${updateData.length} updated...`);
    }
  }

  // Step 4: Re-enable trigger
  if (triggerDisabled) {
    await executeSql('ALTER TABLE conversations ENABLE TRIGGER update_conversations_updated_at');
    console.log('✅ Trigger re-enabled');
  }

  console.log('');
  console.log('=' .repeat(60));
  console.log('✅ FIX ATTEMPT COMPLETE!');
  console.log('=' .repeat(60));
  console.log('');
  console.log(`📊 Results:`);
  console.log(`  • Total conversations: ${updateData.length}`);
  console.log(`  • Successfully processed: ${successCount}`);
  console.log(`  • Errors: ${errorCount}`);
  console.log('');
  console.log('🔍 Target timestamps (what we tried to set):');
  sampleUpdates.forEach((update, i) => {
    console.log(`  ${i + 1}. ${update.title}`);
    console.log(`     Should be: ${update.updated_to}`);
  });

  // Step 5: Verify what actually happened
  console.log('');
  console.log('🔍 Step 3: Verifying actual database state...');

  const { data: verifyData } = await supabase
    .from('conversations')
    .select('title, updated_at')
    .eq('user_id', userId)
    .eq('archived', false)
    .order('updated_at', { ascending: false })
    .limit(5);

  if (verifyData) {
    console.log('');
    console.log('📅 Actual current state (top 5 by updated_at):');
    verifyData.forEach((conv, i) => {
      const date = new Date(conv.updated_at);
      const isToday = date.toDateString() === new Date().toDateString();
      const flag = isToday ? '⚠️ STILL WRONG' : '✅';
      console.log(`  ${i + 1}. ${conv.title?.substring(0, 35)}... ${flag}`);
      console.log(`     Actual: ${conv.updated_at}`);
    });
  }

  console.log('');
  console.log('⚠️  NOTE: If timestamps still show today\'s date, the trigger is');
  console.log('   overriding our updates. Manual database intervention required.');
  console.log('');
  console.log('🎉 Operation completed at:', new Date().toISOString());
}

main().catch((err) => {
  console.error('💥 CRITICAL ERROR:', err);
  process.exit(1);
});