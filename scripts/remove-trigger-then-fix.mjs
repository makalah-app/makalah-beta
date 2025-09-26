#!/usr/bin/env node

/**
 * FINAL SOLUTION: Remove trigger, fix timestamps, restore trigger
 * This script requires direct database access
 */

import { webcrypto } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Inject crypto polyfill
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

async function main() {
  console.log('=' .repeat(70));
  console.log('🚨 NUCLEAR OPTION: Direct database manipulation to fix timestamps');
  console.log('=' .repeat(70));
  console.log('');
  console.log('This script will:');
  console.log('  1. Show you SQL to temporarily drop the trigger');
  console.log('  2. Update all conversations with correct timestamps');
  console.log('  3. Recreate the trigger');
  console.log('');
  console.log('⚠️  IMPORTANT: Run these SQL commands via Supabase dashboard:');
  console.log('');
  console.log('=' .repeat(70));
  console.log('STEP 1: DROP THE TRIGGER (save this function definition first!)');
  console.log('=' .repeat(70));
  console.log(`
-- First, save the trigger function definition
-- Then drop the trigger:
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
`);

  console.log('=' .repeat(70));
  console.log('STEP 2: RUN UPDATE QUERY');
  console.log('=' .repeat(70));
  console.log(`
-- Update conversations with their actual last message times
WITH last_messages AS (
  SELECT
    conversation_id,
    MAX(created_at) as last_message_time
  FROM chat_messages
  GROUP BY conversation_id
)
UPDATE conversations c
SET updated_at = COALESCE(lm.last_message_time, c.created_at),
    metadata = COALESCE(c.metadata, '{}'::jsonb) ||
               '{"ordering_restored": true, "restored_at": "${new Date().toISOString()}"}'::jsonb
FROM last_messages lm
WHERE c.id = lm.conversation_id
  AND c.user_id = '38967a42-3fdb-4d08-8768-bce6f97e3f0b'
  AND c.archived = false;

-- Also update conversations without messages
UPDATE conversations
SET updated_at = created_at,
    metadata = COALESCE(metadata, '{}'::jsonb) ||
               '{"ordering_restored": true, "no_messages": true}'::jsonb
WHERE user_id = '38967a42-3fdb-4d08-8768-bce6f97e3f0b'
  AND archived = false
  AND id NOT IN (
    SELECT DISTINCT conversation_id
    FROM chat_messages
  );
`);

  console.log('=' .repeat(70));
  console.log('STEP 3: RECREATE THE TRIGGER');
  console.log('=' .repeat(70));
  console.log(`
-- Recreate the trigger
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
`);

  console.log('=' .repeat(70));
  console.log('STEP 4: VERIFY THE FIX');
  console.log('=' .repeat(70));
  console.log(`
-- Check the results
SELECT
  title,
  updated_at,
  DATE(updated_at) as date_only,
  CASE
    WHEN DATE(updated_at) = CURRENT_DATE THEN '❌ STILL WRONG'
    ELSE '✅ FIXED'
  END as status
FROM conversations
WHERE user_id = '38967a42-3fdb-4d08-8768-bce6f97e3f0b'
  AND archived = false
ORDER BY updated_at DESC
LIMIT 10;
`);

  console.log('');
  console.log('=' .repeat(70));
  console.log('📋 INSTRUCTIONS:');
  console.log('=' .repeat(70));
  console.log('');
  console.log('1. Go to Supabase Dashboard > SQL Editor');
  console.log('2. Run each SQL block above IN ORDER');
  console.log('3. The verification query should show dates OTHER than today');
  console.log('4. If all shows ✅ FIXED, the problem is solved');
  console.log('');
  console.log('⚠️  This is the ONLY way to bypass the trigger issue');
  console.log('');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});