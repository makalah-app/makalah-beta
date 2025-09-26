#!/usr/bin/env node

import { webcrypto } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';

// Muat env dari .env.local bila ada
loadEnv({ path: '.env.local' });
loadEnv();

// Inject crypto polyfill
if (!globalThis.crypto) {
  console.log('🔧 Menyuntikkan crypto polyfill...');
  globalThis.crypto = webcrypto;
  console.log('✅ Crypto polyfill aktif');
} else {
  console.log('ℹ️ Crypto sudah tersedia, lanjut tanpa injeksi');
}

const [, , ...args] = process.argv;
const query = args.join(' ').trim();

if (!query) {
  console.error('❌ SQL kosong. Contoh: node scripts/mcp-with-crypto.mjs "SELECT 1"');
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('❌ Environment NEXT_PUBLIC_SUPABASE_URL belum diset');
  process.exit(1);
}

if (!serviceKey) {
  console.error('❌ Environment SUPABASE_SERVICE_ROLE_KEY belum diset');
  process.exit(1);
}

console.log('🔌 Menghubungkan ke Supabase (crypto ready)...');
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`🏃 Menjalankan SQL dengan crypto polyfill:\n${query}`);

const normalized = query.replace(/\s+/g, ' ').trim().toLowerCase();

async function handleSelectFallback() {
  const convMatch = query.match(/select\s+(.+)\s+from\s+public\.conversations/i);
  if (convMatch) {
    if (normalized === 'select count(*) from public.conversations') {
      const { count, error } = await supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true });
      if (error) throw error;
      return [{ count }];
    }

    const columns = convMatch[1].trim();
    let builder = supabase.from('conversations').select(columns);

    if (normalized.includes('order by updated_at desc')) {
      builder = builder.order('updated_at', { ascending: false });
    } else if (normalized.includes('order by updated_at asc')) {
      builder = builder.order('updated_at', { ascending: true });
    }

    const limitMatch = normalized.match(/limit\s+(\d+)/);
    if (limitMatch) {
      builder = builder.limit(Number(limitMatch[1]));
    }

    const { data, error } = await builder;
    if (error) {
      throw error;
    }
    return data;
  }

  const chatAggMatch = normalized.match(
    /^select conversation_id, max\(created_at\) as last_msg, count\(\*\) as total from public\.chat_messages group by conversation_id order by last_msg desc(?: limit (\d+))?$/
  );

  if (chatAggMatch) {
    const limit = chatAggMatch[1] ? Number(chatAggMatch[1]) : 10;
    const fetchLimit = Math.max(limit * 20, 200);
    const { data, error } = await supabase
      .from('chat_messages')
      .select('conversation_id, created_at')
      .order('created_at', { ascending: false })
      .limit(fetchLimit);

    if (error) {
      throw error;
    }

    const stats = new Map();
    for (const row of data || []) {
      const convId = row.conversation_id;
      const createdAt = row.created_at ? new Date(row.created_at) : null;
      if (!convId || !createdAt) continue;

      const existing = stats.get(convId) || { conversation_id: convId, last_msg: createdAt, total: 0 };
      if (createdAt > existing.last_msg) {
        existing.last_msg = createdAt;
      }
      existing.total += 1;
      stats.set(convId, existing);
    }

    const sorted = Array.from(stats.values())
      .sort((a, b) => b.last_msg - a.last_msg)
      .slice(0, limit)
      .map((item) => ({
        conversation_id: item.conversation_id,
        last_msg: item.last_msg.toISOString(),
        total: item.total,
      }));

    return sorted;
  }

  throw new Error('Query tidak didukung oleh fallback parser. Gunakan RPC execute_sql atau sesuaikan query.');
}

try {
  let data;
  try {
    const rpc = await supabase.rpc('execute_sql', { query });
    if (rpc.error && rpc.error.message?.toLowerCase().includes('could not find the function')) {
      data = await handleSelectFallback();
    } else if (rpc.error) {
      throw rpc.error;
    } else {
      data = rpc.data;
    }
  } catch (rpcErr) {
    if (rpcErr?.message?.toLowerCase().includes('could not find the function')) {
      data = await handleSelectFallback();
    } else {
      throw rpcErr;
    }
  }

  console.log('📊 Hasil:');
  console.log(JSON.stringify(data, null, 2));
  console.log('✅ Eksekusi SQL berhasil!');
} catch (err) {
  console.error('💥 Terjadi error saat eksekusi SQL:', err instanceof Error ? err.message : err);
  process.exit(1);
}
