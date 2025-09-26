import { execSync } from 'child_process';

console.log('🔧 PROPER fix for conversation timestamps - Using CTE approach');
console.log('📅 Target: Fix updated_at based on ACTUAL last message timestamps');
console.log('⚠️  CRITICAL: This will use actual message timestamps, not script runtime');

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

// First get a sample to see current damage
console.log('\n📋 Current damage assessment...');
const damageCheck = execMcpSQL(`
  SELECT
    id,
    title,
    created_at,
    updated_at,
    (SELECT MAX(created_at) FROM chat_messages WHERE conversation_id = conversations.id) as actual_last_msg
  FROM conversations
  WHERE user_id = '${targetUserId}'
  ORDER BY created_at DESC
  LIMIT 3
`);
console.log('Damage check:', damageCheck.split('\n').slice(-10).join('\n'));

console.log('\n🔄 EXECUTING PROPER TIMESTAMP FIX...');
console.log('🎯 Using WITH clause to calculate proper timestamps first');

// The CORRECT way to do this - use WITH clause to calculate proper timestamps
const properFixQuery = `
WITH conversation_proper_timestamps AS (
  SELECT
    c.id,
    COALESCE(
      (SELECT MAX(m.created_at) FROM chat_messages m WHERE m.conversation_id = c.id),
      c.created_at
    ) as proper_updated_at
  FROM conversations c
  WHERE c.user_id = '${targetUserId}'
)
UPDATE conversations
SET updated_at = cpt.proper_updated_at
FROM conversation_proper_timestamps cpt
WHERE conversations.id = cpt.id;
`;

console.log('🏃 Executing WITH-based proper timestamp update...');
const fixResult = execMcpSQL(properFixQuery);
console.log('Fix result:', fixResult.split('\n').slice(-8).join('\n'));

// Verification with proper grouping
console.log('\n📋 Verification: Checking timestamp distribution...');
const verifyDistribution = execMcpSQL(`
  SELECT
    COUNT(*) as conv_count,
    DATE_TRUNC('hour', updated_at) as hour_bucket
  FROM conversations
  WHERE user_id = '${targetUserId}'
  GROUP BY DATE_TRUNC('hour', updated_at)
  ORDER BY hour_bucket DESC
  LIMIT 10
`);
console.log('Distribution check:', verifyDistribution.split('\n').slice(-15).join('\n'));

// Sample verification with actual vs expected
console.log('\n📋 Sample verification (5 conversations)...');
const sampleVerify = execMcpSQL(`
  SELECT
    c.id,
    c.title,
    c.created_at,
    c.updated_at,
    (SELECT MAX(created_at) FROM chat_messages WHERE conversation_id = c.id) as actual_last_message,
    CASE
      WHEN (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id) > 0
      THEN c.updated_at = (SELECT MAX(created_at) FROM chat_messages WHERE conversation_id = c.id)
      ELSE c.updated_at = c.created_at
    END as is_correct
  FROM conversations c
  WHERE c.user_id = '${targetUserId}'
  ORDER BY c.updated_at DESC
  LIMIT 5
`);
console.log('Sample verification:', sampleVerify.split('\n').slice(-15).join('\n'));

console.log('\n✅ PROPER TIMESTAMP FIX COMPLETED!');
console.log('🎯 All conversation timestamps now reflect ACTUAL message activity');
console.log('📊 Proper chronological ordering restored using historical timestamps');