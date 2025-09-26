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

async function main() {
  console.log('🚨 CRITICAL FIX: Restoring proper conversation ordering');
  console.log('🎯 Target: makalah.app@gmail.com (38967a42-3fdb-4d08-8768-bce6f97e3f0b)');
  console.log('⏰ Starting at:', new Date().toISOString());
  console.log('');

  const userId = '38967a42-3fdb-4d08-8768-bce6f97e3f0b';

  // Step 1: Get all conversations with their last message time
  console.log('📊 Step 1: Fetching all conversations with last activity times...');

  let conversationActivity = new Map();

  // Get all conversations
  const { data: conversations, error: convError } = await supabase
    .from('conversations')
    .select('id, title, created_at')
    .eq('user_id', userId)
    .eq('archived', false);

  if (convError) {
    console.error('❌ Failed to load conversations:', convError);
    process.exit(1);
  }

  console.log(`  Loading last message times for ${conversations.length} conversations...`);

  // Get last message for each conversation
  for (const conv of conversations) {
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('created_at')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastMessageTime = messages?.[0]?.created_at || conv.created_at;
    conversationActivity.set(conv.id, {
      id: conv.id,
      title: conv.title,
      last_activity: lastMessageTime,
      created_at: conv.created_at
    });
  }

  console.log(`✅ Found ${conversationActivity.size} conversations to fix`);
  console.log('');

  // Step 2: Sort by actual last activity and update
  console.log('📝 Step 2: Updating conversations with correct timestamps...');

  // Sort by last activity (newest first)
  const sortedConversations = Array.from(conversationActivity.values())
    .sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime());

  let successCount = 0;
  let errorCount = 0;
  const sampleUpdates = [];

  for (let i = 0; i < sortedConversations.length; i++) {
    const conv = sortedConversations[i];

    // Use the actual last activity time
    const correctTimestamp = conv.last_activity;

    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        updated_at: correctTimestamp,
        metadata: {
          ordering_fixed: true,
          fixed_at: new Date().toISOString(),
          fix_method: 'final-fix-ordering',
          original_last_activity: conv.last_activity
        }
      })
      .eq('id', conv.id);

    if (updateError) {
      console.error(`❌ Failed to update ${conv.id}:`, updateError.message);
      errorCount++;
    } else {
      successCount++;

      // Collect first 5 for sample
      if (sampleUpdates.length < 5) {
        sampleUpdates.push({
          title: conv.title?.substring(0, 40) + '...',
          updated_to: correctTimestamp,
          last_activity: conv.last_activity
        });
      }
    }

    // Progress indicator
    if ((i + 1) % 20 === 0) {
      console.log(`  Progress: ${i + 1}/${sortedConversations.length} processed...`);
    }
  }

  console.log('');
  console.log('=' .repeat(60));
  console.log('✅ FIX COMPLETE!');
  console.log('=' .repeat(60));
  console.log('');
  console.log(`📊 Results:`);
  console.log(`  • Total conversations: ${conversationActivity.size}`);
  console.log(`  • Successfully fixed: ${successCount}`);
  console.log(`  • Errors: ${errorCount}`);
  console.log('');
  console.log('🔍 Sample updates (newest first):');
  sampleUpdates.forEach((update, i) => {
    console.log(`  ${i + 1}. ${update.title}`);
    console.log(`     Updated to: ${update.updated_to}`);
  });
  console.log('');
  console.log('✨ Conversations now ordered by ACTUAL last message time');
  console.log('🔄 Refresh UI to see proper chronological order');

  // Step 3: Verify the fix
  console.log('');
  console.log('🔍 Step 3: Verifying the fix...');

  const { data: verifyData } = await supabase
    .from('conversations')
    .select('title, updated_at')
    .eq('user_id', userId)
    .eq('archived', false)
    .order('updated_at', { ascending: false })
    .limit(5);

  if (verifyData) {
    console.log('📅 Current top 5 conversations by updated_at:');
    verifyData.forEach((conv, i) => {
      console.log(`  ${i + 1}. ${conv.title?.substring(0, 40)}... (${conv.updated_at})`);
    });
  }

  console.log('');
  console.log('🎉 Fix operation completed at:', new Date().toISOString());
}

main().catch((err) => {
  console.error('💥 CRITICAL ERROR:', err);
  process.exit(1);
});