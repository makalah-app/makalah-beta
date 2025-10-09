#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from project root
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const conversationId = process.argv[2] || '45941a92-6b07-4151-adb4-e8f4b82cb779';

console.log('Fetching conversation:', conversationId);

const { data, error } = await supabase
  .from('chat_messages')
  .select('sequence_number, role, parts, metadata, created_at')
  .eq('conversation_id', conversationId)
  .order('sequence_number', { ascending: true });

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('\n=== CONVERSATION ANALYSIS ===\n');
console.log(`Total messages: ${data.length}\n`);

for (const msg of data) {
  console.log(`--- Message #${msg.sequence_number} (${msg.role}) ---`);

  // Extract text from parts
  const textParts = msg.parts
    .filter(p => p.type === 'text')
    .map(p => p.text)
    .join('\n');

  console.log('Content:', textParts.substring(0, 200) + (textParts.length > 200 ? '...' : ''));

  if (msg.metadata) {
    console.log('Metadata:');
    if (msg.metadata.phase) console.log(`  - Phase: ${msg.metadata.phase}`);
    if (msg.metadata.progress) console.log(`  - Progress: ${msg.metadata.progress}`);
    if (msg.metadata.offTopicCount !== undefined) console.log(`  - Off-topic count: ${msg.metadata.offTopicCount}`);
    if (msg.metadata.artifacts) {
      console.log('  - Artifacts:', JSON.stringify(msg.metadata.artifacts, null, 4));
    }
  }
  console.log('');
}
