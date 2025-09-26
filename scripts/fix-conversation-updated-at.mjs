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
  console.log('🔍 Memuat semua percakapan...');
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('id, updated_at, metadata, message_count')
    .eq('archived', false)
    .limit(1000);

  if (error) {
    console.error('Gagal memuat conversations:', error.message || error);
    process.exit(1);
  }

  console.log(`✅ Ditemukan ${conversations.length} percakapan aktif`);
  let updated = 0;
  const changes = [];

  for (const conv of conversations) {
    const convId = conv.id;
    const currentMetadata = (conv.metadata && typeof conv.metadata === 'object') ? conv.metadata : {};

    const { data: lastMessages, count, error: msgErr } = await supabase
      .from('chat_messages')
      .select('created_at, role', { count: 'exact' })
      .eq('conversation_id', convId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (msgErr) {
      console.error(`⚠️  Gagal membaca pesan untuk ${convId}:`, msgErr.message || msgErr);
      continue;
    }

    const lastMessage = lastMessages?.[0] || null;
    const lastMessageAt = lastMessage ? iso(lastMessage.created_at) : (currentMetadata.last_message_at || null);
    const lastRole = lastMessage ? lastMessage.role : (currentMetadata.last_message_role || null);
    const messageCount = typeof count === 'number' ? count : (conv.message_count || 0);

    const desiredUpdatedAt = lastMessageAt || conv.updated_at;

    const needsUpdate =
      desiredUpdatedAt !== conv.updated_at ||
      messageCount !== conv.message_count ||
      lastMessageAt !== currentMetadata.last_message_at ||
      lastRole !== currentMetadata.last_message_role;

    if (!needsUpdate) {
      continue;
    }

    const newMetadata = {
      ...currentMetadata,
      last_message_at: lastMessageAt,
      last_message_role: lastRole,
      message_count_cached: messageCount,
      backfilled_at: new Date().toISOString(),
    };

    const updatePayload = {
      updated_at: desiredUpdatedAt,
      message_count: messageCount,
      metadata: newMetadata,
    };

    const { error: updateErr } = await supabase
      .from('conversations')
      .update(updatePayload)
      .eq('id', convId);

    if (updateErr) {
      console.error(`❌ Gagal memperbarui conversation ${convId}:`, updateErr.message || updateErr);
      continue;
    }

    updated += 1;
    changes.push({ id: convId, updated_at: desiredUpdatedAt, message_count: messageCount });
  }

  console.log(`✅ Backfill selesai. Percakapan diperbarui: ${updated}`);
  console.log(JSON.stringify(changes.slice(0, 20), null, 2));
}

main().catch((err) => {
  console.error('💥 Error tak terduga:', err);
  process.exit(1);
});
