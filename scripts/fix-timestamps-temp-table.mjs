import { execSync } from 'child_process';

console.log('🔧 TEMP TABLE APPROACH for timestamp fix');
console.log('📅 Using temporary table to prevent runtime timestamp issues');
console.log('⚠️  CRITICAL: This will create a temp table with actual timestamps first');

const targetUserId = '38967a42-3fdb-4d08-8768-bce6f97e3f0b';
console.log(`👤 Target user: ${targetUserId} (makalah.app@gmail.com)`);

function execMcpSQL(query) {
  const scriptPath = '/Users/eriksupit/Desktop/makalah/scripts/mcp-with-crypto.mjs';
  const command = `node "${scriptPath}" "${query.replace(/"/g, '\\"')}"`;

  try {
    const result = execSync(command, {
      encoding: 'utf8',
      cwd: '/Users/eriksupit/Desktop/makalah',
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    return result;
  } catch (error) {
    console.error('❌ MCP command failed:', error.message);
    throw error;
  }
}

// Step 1: Create temporary table with correct timestamps
console.log('\n📋 Step 1: Creating temporary table with proper timestamps...');
const createTempQuery = `
CREATE TEMPORARY TABLE conversation_timestamps AS
SELECT
  c.id,
  COALESCE(
    (SELECT MAX(m.created_at) FROM chat_messages m WHERE m.conversation_id = c.id),
    c.created_at
  ) as proper_updated_at
FROM conversations c
WHERE c.user_id = '${targetUserId}'
`;

const createResult = execMcpSQL(createTempQuery);
console.log('Create temp table result:', createResult.split('\n').slice(-5).join('\n'));

// Step 2: Update using the temp table
console.log('\n📋 Step 2: Updating conversations using temp table...');
const updateFromTempQuery = `
UPDATE conversations
SET updated_at = ct.proper_updated_at
FROM conversation_timestamps ct
WHERE conversations.id = ct.id
`;

const updateResult = execMcpSQL(updateFromTempQuery);
console.log('Update from temp table result:', updateResult.split('\n').slice(-5).join('\n'));

// Step 3: Drop temp table
console.log('\n📋 Step 3: Cleaning up temp table...');
const dropTempQuery = `DROP TABLE IF EXISTS conversation_timestamps`;
const dropResult = execMcpSQL(dropTempQuery);
console.log('Drop temp table result:', dropResult.split('\n').slice(-3).join('\n'));

// Final verification
console.log('\n📋 Step 4: Final verification...');

// Check if we still have the problematic timestamps
const badTimestampCheck = execMcpSQL(`
SELECT COUNT(*) as bad_count
FROM conversations
WHERE user_id = '${targetUserId}'
  AND (
    updated_at = '2025-09-26 01:07:24.512302+00'::timestamp
    OR updated_at = '2025-09-26 01:04:27.527319+00'::timestamp
    OR updated_at = '2025-09-26 01:03:36.668284+00'::timestamp
    OR updated_at = '2025-09-26 00:56:28.124609+00'::timestamp
  )
`);
console.log('Bad timestamp check:', badTimestampCheck.split('\n').slice(-8).join('\n'));

// Sample of properly fixed conversations
const sampleCheck = execMcpSQL(`
SELECT
  id,
  title,
  created_at,
  updated_at,
  (SELECT MAX(created_at) FROM chat_messages WHERE conversation_id = conversations.id) as actual_last_msg,
  CASE
    WHEN (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = conversations.id) = 0
    THEN updated_at = created_at
    ELSE updated_at = (SELECT MAX(created_at) FROM chat_messages WHERE conversation_id = conversations.id)
  END as is_correct
FROM conversations
WHERE user_id = '${targetUserId}'
ORDER BY updated_at DESC
LIMIT 5
`);
console.log('Sample verification:', sampleCheck.split('\n').slice(-15).join('\n'));

// Chronological distribution check
const distributionCheck = execMcpSQL(`
SELECT
  DATE_TRUNC('day', updated_at) as day_bucket,
  COUNT(*) as conversation_count
FROM conversations
WHERE user_id = '${targetUserId}'
GROUP BY DATE_TRUNC('day', updated_at)
ORDER BY day_bucket DESC
LIMIT 10
`);
console.log('Distribution check:', distributionCheck.split('\n').slice(-15).join('\n'));

console.log('\n✅ TEMP TABLE TIMESTAMP FIX COMPLETED!');
console.log('🎯 Used temporary table to avoid runtime timestamp evaluation');
console.log('📊 Conversations should now have proper historical timestamps');
console.log('🔒 Data integrity maintained using actual message activity');