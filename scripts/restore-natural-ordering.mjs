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

function iso(input) {
  return input ? new Date(input).toISOString() : null;
}

async function main() {
  console.log('🔧 RESTORING NATURAL CONVERSATION ORDERING...');
  console.log('⚠️  Fixing bulk update problem from fix-conversation-updated-at.mjs');

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
      // Use last message timestamp as natural updated_at
      naturalUpdatedAt = lastMessage.created_at;
    } else {
      // Fallback to conversation created_at if no messages
      naturalUpdatedAt = conv.created_at;
    }

    // Add small offset to prevent identical timestamps (microsecond spacing)
    const offsetMs = i * 100; // 100ms spacing between conversations
    const offsetDate = new Date(new Date(naturalUpdatedAt).getTime() + offsetMs);
    const finalUpdatedAt = offsetDate.toISOString();

    const { error: updateErr } = await supabase
      .from('conversations')
      .update({
        updated_at: finalUpdatedAt,
        metadata: {
          ...conv.metadata,
          natural_order_restored: true,
          restored_at: new Date().toISOString(),
          original_bulk_updated_at: conv.updated_at,
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
      title: conv.title?.substring(0, 50) + '...',
      old_updated_at: conv.updated_at,
      new_updated_at: finalUpdatedAt,
      based_on: lastMessage ? 'last_message' : 'created_at'
    });

    if (i % 10 === 0) {
      console.log(`📊 Progress: ${i + 1}/${conversations.length} processed...`);
    }
  }

  console.log(`\n✅ RESTORE COMPLETE!`);
  console.log(`📊 Fixed ${fixed} conversations`);
  console.log(`\n🔍 Sample updates:`);
  console.log(JSON.stringify(updates.slice(0, 5), null, 2));

  console.log(`\n💡 Natural ordering restored based on last message timestamps`);
  console.log(`🔄 Refresh your UI to see the proper chronological order`);
}

main().catch((err) => {
  console.error('💥 Unexpected error:', err);
  process.exit(1);
});