#!/usr/bin/env node
/**
 * Script to update system prompts in database
 * Reads enhanced prompts from __references__ and updates database
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// Supabase config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updatePrompts() {
  try {
    // Read OpenAI system prompt
    const openaiPrompt = readFileSync('__references__/OPENAI_SYSTEM_PROMPT.md', 'utf-8');
    console.log(`📄 OpenAI prompt loaded: ${openaiPrompt.length} characters`);

    // Read Gemini/OpenRouter system prompt
    const geminiPrompt = readFileSync('__references__/GEMINI_SYSTEM_PROMPT.md', 'utf-8');
    console.log(`📄 Gemini prompt loaded: ${geminiPrompt.length} characters`);

    // Deactivate old prompts
    console.log('🔄 Deactivating old system prompts...');
    await supabase
      .from('system_prompts')
      .update({ is_active: false })
      .eq('is_active', true);

    // Insert new OpenAI prompt
    console.log('💾 Inserting new OpenAI system prompt...');
    const { data: openaiData, error: openaiError } = await supabase
      .from('system_prompts')
      .insert({
        content: openaiPrompt,
        phase: 'system_instructions',
        version: 'v3.0-verbose',
        priority_order: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, phase, version, is_active')
      .single();

    if (openaiError) {
      console.error('❌ OpenAI prompt insert failed:', openaiError);
    } else {
      console.log('✅ OpenAI prompt inserted:', openaiData);
    }

    // Insert new OpenRouter/Gemini prompt
    console.log('💾 Inserting new OpenRouter system prompt...');
    const { data: geminiData, error: geminiError } = await supabase
      .from('system_prompts')
      .insert({
        content: geminiPrompt,
        phase: 'openrouter_instructions',
        version: 'v3.0-verbose',
        priority_order: 2,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, phase, version, is_active')
      .single();

    if (geminiError) {
      console.error('❌ Gemini prompt insert failed:', geminiError);
    } else {
      console.log('✅ Gemini prompt inserted:', geminiData);
    }

    console.log('\n🎉 System prompts updated successfully!');
    console.log('📊 Summary:');
    console.log(`   - OpenAI prompt: ${openaiPrompt.length} chars (v3.0-verbose)`);
    console.log(`   - Gemini prompt: ${geminiPrompt.length} chars (v3.0-verbose)`);
    console.log(`   - Temperature: 0.40 (updated separately)`);

  } catch (error) {
    console.error('❌ Error updating prompts:', error);
    process.exit(1);
  }
}

updatePrompts();
