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
  console.error('Environment Supabase belum lengkap.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log('🔧 RESTORING PROPER CONVERSATION ORDERING...');
  console.log('⚠️  Using ACTUAL last message timestamps, not script runtime');

  // Load conversations for specific user (makalah.app@gmail.com)
  const userId = '38967a42-3fdb-4d08-8768-bce6f97e3f0b';

  console.log(`🔍 Loading conversations for user: ${userId}`);
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('id, title, created_at, updated_at, metadata')
    .eq('user_id', userId)
    .eq('archived', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Failed to load conversations:', error.message || error);
    process.exit(1);
  }

  console.log(`✅ Found ${conversations.length} conversations to fix`);

  let fixed = 0;
  const updates = [];

  for (let i = 0; i < conversations.length; i++) {
    const conv = conversations[i];

    // Get last message for this conversation
    const { data: lastMessages, error: msgErr } = await supabase
      .from('chat_messages')
      .select('created_at, role')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (msgErr) {
      console.error(`⚠️  Failed to get last message for ${conv.id}:`, msgErr.message);
      continue;
    }

    const lastMessage = lastMessages?.[0];
    let naturalUpdatedAt;

    if (lastMessage) {
      // Use ACTUAL last message timestamp (not modified)
      naturalUpdatedAt = lastMessage.created_at;
    } else {
      // Fallback to conversation created_at if no messages
      naturalUpdatedAt = conv.created_at;
    }

    // Add tiny microsecond offset to prevent identical timestamps but preserve chronological order
    // Offset is based on original created_at order to maintain proper sequence
    const originalTime = new Date(naturalUpdatedAt);
    const offsetMicroseconds = i * 10; // 10ms spacing
    const finalTime = new Date(originalTime.getTime() + offsetMicroseconds);
    const finalUpdatedAt = finalTime.toISOString();

    const { error: updateErr } = await supabase
      .from('conversations')
      .update({
        updated_at: finalUpdatedAt, // Use ACTUAL message time, not script runtime
        metadata: {
          ...conv.metadata,
          proper_order_restored: true,
          restored_at: new Date().toISOString(),
          restore_method: 'actual_last_message_time',
          original_bulk_time: conv.updated_at,
        }
      })
      .eq('id', conv.id);

    if (updateErr) {
      console.error(`❌ Failed to update conversation ${conv.id}:`, updateErr.message);
      continue;
    }

    fixed++;
    updates.push({
      id: conv.id,
      title: conv.title?.substring(0, 40) + '...',
      old_updated_at: conv.updated_at,
      new_updated_at: finalUpdatedAt,
      last_message_time: lastMessage ? lastMessage.created_at : null,
      based_on: lastMessage ? 'last_message_actual_time' : 'conversation_created_at'
    });

    if (i % 10 === 0) {
      console.log(`📊 Progress: ${i + 1}/${conversations.length} processed...`);
    }
  }

  console.log(`\n✅ PROPER ORDERING RESTORE COMPLETE!`);
  console.log(`📊 Fixed ${fixed} conversations with ACTUAL timestamps`);
  console.log(`\n🔍 Sample updates (showing actual vs script runtime):`);
  console.log(JSON.stringify(updates.slice(0, 3), null, 2));

  console.log(`\n💡 Now using ACTUAL last message timestamps (not script runtime)`);
  console.log(`🔄 Conversations should now appear in true chronological order`);
}

main().catch((err) => {
  console.error('💥 Unexpected error:', err);
  process.exit(1);
});