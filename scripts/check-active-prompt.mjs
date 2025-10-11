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

console.log('Checking active system prompt...\n');

const { data, error } = await supabase
  .from('system_prompts')
  .select('id, title, content, is_active, priority_order, created_at, updated_at')
  .eq('is_active', true)
  .order('priority_order')
  .limit(1)
  .maybeSingle();

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

if (!data) {
  console.log('❌ NO ACTIVE SYSTEM PROMPT FOUND');
  process.exit(0);
}

console.log('✅ Active System Prompt:');
console.log('  Title:', data.title);
console.log('  ID:', data.id);
console.log('  Priority:', data.priority_order);
console.log('  Created:', data.created_at);
console.log('  Updated:', data.updated_at);
console.log('  Length:', data.content.length, 'characters');
console.log('');
console.log('--- CONTENT (first 1000 chars) ---');
console.log(data.content.substring(0, 1000));
console.log('...');
console.log('');
console.log('--- CONTENT (last 500 chars) ---');
console.log(data.content.substring(data.content.length - 500));
