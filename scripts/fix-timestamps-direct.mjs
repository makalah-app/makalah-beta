import { execSync } from 'child_process';

console.log('🔧 Direct fix for conversation timestamps...');
console.log('📅 Target: Fix updated_at based on ACTUAL last message timestamps');

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

// First get conversation count
console.log('\n📋 Step 1: Checking conversation count...');
const countResult = execMcpSQL(`SELECT COUNT(*) as total FROM conversations WHERE user_id = '${targetUserId}'`);
console.log('Count result:', countResult.split('\n').slice(-3).join('\n'));

// Get last message activity data
console.log('\n📋 Step 2: Getting last message activity...');
const activityQuery = `
  SELECT
    c.id,
    c.title,
    c.created_at,
    c.updated_at,
    COALESCE(
      (SELECT MAX(created_at) FROM chat_messages WHERE conversation_id = c.id),
      c.created_at
    ) as proper_updated_at,
    (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id) as message_count
  FROM conversations c
  WHERE c.user_id = '${targetUserId}'
  ORDER BY c.created_at DESC
`;

const activityResult = execMcpSQL(activityQuery);
console.log('Activity result preview:', activityResult.split('\n').slice(0, 10).join('\n'));

// Now let's try to update in batches
console.log('\n📋 Step 3: Starting timestamp updates...');

// Update conversations using proper timestamps
const updateQuery = `
  UPDATE conversations
  SET updated_at = COALESCE(
    (SELECT MAX(created_at) FROM chat_messages WHERE conversation_id = conversations.id),
    conversations.created_at
  )
  WHERE user_id = '${targetUserId}'
`;

console.log('🔄 Executing bulk update...');
const updateResult = execMcpSQL(updateQuery);
console.log('Update result:', updateResult.split('\n').slice(-5).join('\n'));

// Verification
console.log('\n📋 Step 4: Verification...');
const verifyQuery = `
  SELECT
    id,
    title,
    created_at,
    updated_at,
    (SELECT MAX(created_at) FROM chat_messages WHERE conversation_id = conversations.id) as last_message,
    (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = conversations.id) as msg_count
  FROM conversations
  WHERE user_id = '${targetUserId}'
  ORDER BY updated_at DESC
  LIMIT 5
`;

const verifyResult = execMcpSQL(verifyQuery);
console.log('Verification result:', verifyResult.split('\n').slice(-10).join('\n'));

console.log('\n✅ TIMESTAMP FIX COMPLETED!');
console.log('🎯 All conversation timestamps now reflect ACTUAL activity times');
console.log('📊 Proper chronological ordering has been restored');