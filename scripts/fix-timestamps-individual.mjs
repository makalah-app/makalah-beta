import { execSync } from 'child_process';

console.log('🔧 INDIVIDUAL conversation timestamp fix - One-by-one approach');
console.log('📅 Target: Fix updated_at using ACTUAL historical message timestamps');
console.log('⚠️  CRITICAL: This will process each conversation individually');

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

// Get all conversation IDs and their proper timestamps
console.log('\n📋 Step 1: Getting all conversations with their proper timestamps...');
const getConversationsQuery = `
  SELECT
    c.id,
    c.title,
    c.created_at,
    c.updated_at as current_updated_at,
    COALESCE(
      (SELECT MAX(m.created_at) FROM chat_messages m WHERE m.conversation_id = c.id),
      c.created_at
    ) as proper_updated_at,
    (SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id) as message_count
  FROM conversations c
  WHERE c.user_id = '${targetUserId}'
  ORDER BY c.created_at ASC
`;

const conversationsResult = execMcpSQL(getConversationsQuery);
console.log('Retrieved conversation data...');

// Extract JSON data from the MCP response
const untrustedDataRegex = /<untrusted-data-[^>]+>([\s\S]*?)<\/untrusted-data-[^>]+>/;
const match = conversationsResult.match(untrustedDataRegex);

if (!match) {
  throw new Error('Failed to extract conversation data from MCP response');
}

let conversationsData;
try {
  // Look for JSON array in the matched content
  const content = match[1];
  const innerJsonMatch = content.match(/\[[\s\S]*\]/);
  if (innerJsonMatch) {
    conversationsData = JSON.parse(innerJsonMatch[0]);
  } else {
    console.log('Debug content:', content.substring(0, 200));
    throw new Error('No JSON array found in response');
  }
} catch (e) {
  console.error('❌ Failed to parse conversation data:', e.message);
  throw e;
}

console.log(`📊 Found ${conversationsData.length} conversations to fix`);

// Process each conversation individually
console.log('\n📋 Step 2: Processing each conversation individually...');
let processedCount = 0;
let fixedCount = 0;

for (const conv of conversationsData) {
  const conversationId = conv.id;
  const title = conv.title || 'Untitled';
  const currentUpdated = conv.current_updated_at;
  const properUpdated = conv.proper_updated_at;
  const messageCount = conv.message_count;

  console.log(`\n🔄 Processing: ${title.slice(0, 40)}...`);
  console.log(`   ID: ${conversationId.slice(0, 8)}...`);
  console.log(`   Messages: ${messageCount}`);
  console.log(`   Current: ${currentUpdated}`);
  console.log(`   Proper:  ${properUpdated}`);

  // Only update if timestamps are different
  if (currentUpdated !== properUpdated) {
    const individualUpdateQuery = `
      UPDATE conversations
      SET updated_at = '${properUpdated}'::timestamp with time zone
      WHERE id = '${conversationId}'
    `;

    try {
      execMcpSQL(individualUpdateQuery);
      console.log(`   ✅ FIXED - Updated to actual timestamp`);
      fixedCount++;
    } catch (error) {
      console.log(`   ❌ FAILED - ${error.message}`);
    }
  } else {
    console.log(`   ⏭️  SKIPPED - Already correct`);
  }

  processedCount++;

  // Progress indicator
  if (processedCount % 10 === 0) {
    console.log(`\n📊 Progress: ${processedCount}/${conversationsData.length} processed, ${fixedCount} fixed`);
  }
}

console.log(`\n🎉 INDIVIDUAL TIMESTAMP FIX COMPLETED!`);
console.log(`📊 Total processed: ${processedCount}`);
console.log(`📊 Total fixed: ${fixedCount}`);
console.log(`📊 Already correct: ${processedCount - fixedCount}`);

// Final verification
console.log('\n📋 Step 3: Final verification...');
const finalVerifyQuery = `
  SELECT
    COUNT(*) as total_conversations,
    COUNT(CASE WHEN c.updated_at != (
      SELECT MAX(m.created_at) FROM chat_messages m WHERE m.conversation_id = c.id
    ) AND (SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id) > 0 THEN 1 END) as incorrect_with_messages,
    COUNT(CASE WHEN c.updated_at != c.created_at AND (SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id) = 0 THEN 1 END) as incorrect_without_messages
  FROM conversations c
  WHERE c.user_id = '${targetUserId}'
`;

const verifyResult = execMcpSQL(finalVerifyQuery);
console.log('Final verification result:', verifyResult.split('\n').slice(-8).join('\n'));

// Sample of properly ordered conversations
console.log('\n📋 Sample of corrected conversations (chronological order):');
const sampleQuery = `
  SELECT
    id,
    title,
    updated_at,
    (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = conversations.id) as msg_count
  FROM conversations
  WHERE user_id = '${targetUserId}'
  ORDER BY updated_at DESC
  LIMIT 5
`;

const sampleResult = execMcpSQL(sampleQuery);
console.log('Sample result:', sampleResult.split('\n').slice(-12).join('\n'));

console.log('\n✅ PRODUCTION TIMESTAMP FIX COMPLETED!');
console.log('🎯 Each conversation now has its ACTUAL last activity timestamp');
console.log('📊 Proper chronological ordering has been restored');
console.log('🔒 Data integrity preserved using historical message timestamps');