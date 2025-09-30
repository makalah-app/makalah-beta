#!/usr/bin/env ts-node
/**
 * Database Cleanup Script - Remove Web Search Provider Settings
 *
 * This script removes the deprecated 'web_search_provider' setting from the database
 * since we now use auto-pairing logic instead of manual configuration.
 *
 * Features:
 * - Safe to run multiple times (idempotent)
 * - Comprehensive logging
 * - Error handling
 * - TypeScript support
 *
 * Usage:
 *   npx ts-node scripts/cleanup-websearch-provider.ts
 *   or
 *   node -r ts-node/register scripts/cleanup-websearch-provider.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

interface CleanupResult {
  success: boolean;
  message: string;
  deletedCount?: number;
  previousValue?: string;
  timestamp: string;
  error?: string;
}

async function main(): Promise<void> {
  console.log('🧹 Starting Database Cleanup: Web Search Provider Settings');
  console.log('='.repeat(60));

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:');
    console.error('  - NEXT_PUBLIC_SUPABASE_URL');
    console.error('  - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Step 1: Check if the setting exists
    console.log('🔍 Checking for existing web_search_provider setting...');

    const { data: existingSettings, error: selectError } = await supabase
      .from('admin_settings')
      .select('setting_key, setting_value, created_at, updated_at')
      .eq('setting_key', 'web_search_provider');

    if (selectError) {
      throw new Error(`Failed to query existing settings: ${selectError.message}`);
    }

    if (!existingSettings || existingSettings.length === 0) {
      console.log('✅ No web_search_provider setting found - cleanup not needed');
      console.log('📝 This is expected if cleanup was already run or auto-pairing was implemented from the start');
      return;
    }

    const existingSetting = existingSettings[0];
    console.log('📋 Found existing setting:');
    console.log(`   Setting Key: ${existingSetting.setting_key}`);
    console.log(`   Current Value: ${existingSetting.setting_value}`);
    console.log(`   Created: ${existingSetting.created_at}`);
    console.log(`   Updated: ${existingSetting.updated_at}`);

    // Step 2: Delete the setting
    console.log('🗑️  Deleting web_search_provider setting...');

    const { error: deleteError, count } = await supabase
      .from('admin_settings')
      .delete({ count: 'exact' })
      .eq('setting_key', 'web_search_provider');

    if (deleteError) {
      throw new Error(`Failed to delete setting: ${deleteError.message}`);
    }

    // Step 3: Verify deletion
    console.log('✅ Setting deleted successfully');
    console.log(`📊 Deleted ${count || 1} record(s)`);

    const { data: verifyData, error: verifyError } = await supabase
      .from('admin_settings')
      .select('setting_key')
      .eq('setting_key', 'web_search_provider');

    if (verifyError) {
      console.warn(`⚠️  Warning: Could not verify deletion: ${verifyError.message}`);
    } else if (verifyData && verifyData.length === 0) {
      console.log('✅ Deletion verified - setting no longer exists');
    } else {
      console.warn('⚠️  Warning: Setting may still exist after deletion');
    }

    // Step 4: Log the result
    const result: CleanupResult = {
      success: true,
      message: 'Web search provider setting successfully removed',
      deletedCount: count || 1,
      previousValue: existingSetting.setting_value,
      timestamp: new Date().toISOString()
    };

    console.log('');
    console.log('🎉 Cleanup completed successfully!');
    console.log('📋 Summary:');
    console.log(`   • Deleted: ${result.deletedCount} setting(s)`);
    console.log(`   • Previous value: ${result.previousValue}`);
    console.log(`   • Timestamp: ${result.timestamp}`);
    console.log('');
    console.log('💡 Auto-pairing is now active:');
    console.log('   • OpenAI models → OpenAI Native WebSearch');
    console.log('   • OpenRouter models → Perplexity Sonar Pro');

  } catch (error) {
    console.error('❌ Cleanup failed:', error instanceof Error ? error.message : String(error));

    const result: CleanupResult = {
      success: false,
      message: 'Cleanup failed',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };

    console.error('📋 Error details:', result);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run the script - ES module check
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  });
}

export { main as cleanupWebSearchProvider };