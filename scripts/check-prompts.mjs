#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Checking system_prompts table...\n');

const { data: systemPrompts, error: error1 } = await supabase
  .from('system_prompts')
  .select('id, name, phase, content, is_active, priority_order, created_at, updated_at')
  .eq('is_active', true)
  .order('priority_order')
  .limit(1)
  .maybeSingle();

if (error1) {
  console.error('Error querying system_prompts:', error1);
} else if (systemPrompts) {
  console.log('✅ Active system_prompts entry:');
  console.log('  Name:', systemPrompts.name);
  console.log('  Phase:', systemPrompts.phase);
  console.log('  ID:', systemPrompts.id);
  console.log('  Length:', systemPrompts.content.length, 'chars');
  console.log('  Updated:', systemPrompts.updated_at);
  console.log('');
  console.log('--- FIRST 500 CHARS ---');
  console.log(systemPrompts.content.substring(0, 500));
  console.log('...\n');
} else {
  console.log('❌ No active system_prompts entry\n');
}

console.log('Checking fallback_system_prompts table...\n');

const { data: fallbackPrompts, error: error2 } = await supabase
  .from('fallback_system_prompts')
  .select('id, version, content, is_active, created_at, updated_at')
  .eq('is_active', true)
  .limit(1)
  .maybeSingle();

if (error2) {
  console.error('Error querying fallback_system_prompts:', error2);
} else if (fallbackPrompts) {
  console.log('✅ Active fallback_system_prompts entry:');
  console.log('  Version:', fallbackPrompts.version);
  console.log('  ID:', fallbackPrompts.id);
  console.log('  Length:', fallbackPrompts.content.length, 'chars');
  console.log('  Updated:', fallbackPrompts.updated_at);
  console.log('');
  console.log('--- FIRST 500 CHARS ---');
  console.log(fallbackPrompts.content.substring(0, 500));
  console.log('...\n');
} else {
  console.log('❌ No active fallback_system_prompts entry\n');
}
