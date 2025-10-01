#!/usr/bin/env node
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing env vars:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertPrompts() {
  try {
    // Admin user ID (makalah.app@gmail.com)
    const ADMIN_USER_ID = '38967a42-3fdb-4d08-8768-bce6f97e3f0b';

    // Read enhanced prompts
    const openaiPrompt = readFileSync('__references__/OPENAI_SYSTEM_PROMPT.md', 'utf-8');
    const geminiPrompt = readFileSync('__references__/GEMINI_SYSTEM_PROMPT.md', 'utf-8');

    console.log('📄 Prompts loaded:');
    console.log('  OpenAI:', openaiPrompt.length, 'chars');
    console.log('  Gemini:', geminiPrompt.length, 'chars');

    // Deactivate old prompts
    console.log('\n🔄 Deactivating old prompts...');
    const { error: deactivateError } = await supabase
      .from('system_prompts')
      .update({ is_active: false })
      .eq('is_active', true);

    if (deactivateError) {
      console.error('❌ Deactivate error:', deactivateError);
    } else {
      console.log('✅ Old prompts deactivated');
    }

    // Insert OpenAI prompt
    console.log('\n💾 Inserting OpenAI prompt (version 30 - Enhanced Verbosity)...');
    const { data: openaiData, error: openaiError } = await supabase
      .from('system_prompts')
      .insert({
        name: 'OpenAI GPT-4o - Enhanced Verbosity v3.0',
        content: openaiPrompt,
        phase: 'system_instructions',
        version: 30,
        priority_order: 1,
        is_active: true,
        created_by: ADMIN_USER_ID,
        updated_by: ADMIN_USER_ID
      })
      .select('id, name, phase, version')
      .single();

    if (openaiError) {
      console.error('❌ OpenAI insert error:', openaiError);
    } else {
      console.log('✅ OpenAI prompt inserted:', openaiData);
    }

    // Insert Gemini prompt (also system_instructions phase, differentiated by priority)
    console.log('\n💾 Inserting Gemini prompt (version 30 - Enhanced Verbosity)...');
    const { data: geminiData, error: geminiError } = await supabase
      .from('system_prompts')
      .insert({
        name: 'OpenRouter Gemini 2.5 - Enhanced Verbosity v3.0',
        content: geminiPrompt,
        phase: 'system_instructions',
        version: 30,
        priority_order: 2,
        is_active: true,
        created_by: ADMIN_USER_ID,
        updated_by: ADMIN_USER_ID
      })
      .select('id, name, phase, version')
      .single();

    if (geminiError) {
      console.error('❌ Gemini insert error:', geminiError);
    } else {
      console.log('✅ Gemini prompt inserted:', geminiData);
    }

    console.log('\n🎉 Done! Enhanced prompts with verbosity requirements deployed.');

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

insertPrompts();
