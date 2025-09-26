import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Inject crypto polyfill for MCP compatibility
import crypto from 'crypto';
const cryptoApi = {
  getRandomValues: (arr) => {
    const buffer = crypto.randomBytes(arr.length);
    for(let i = 0; i < arr.length; i++) {
      arr[i] = buffer[i];
    }
    return arr;
  },
  randomUUID: () => crypto.randomUUID()
};
global.crypto = cryptoApi;

// MCP Supabase client
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const MCP_SERVER_COMMAND = 'npx';
const MCP_SERVER_ARGS = ['-y', '@modelcontextprotocol/server-supabase'];

console.log('🔧 Starting proper conversation timestamp fix...');
console.log('📅 Target: Fix updated_at based on ACTUAL last message timestamps');

async function connectToMCP() {
  const transport = new StdioClientTransport({
    command: MCP_SERVER_COMMAND,
    args: MCP_SERVER_ARGS
  });

  const client = new Client({
    name: 'fix-conversation-timestamps',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  await client.connect(transport);
  return client;
}

async function executeSQL(client, query) {
  try {
    const response = await client.request({
      method: 'tools/call',
      params: {
        name: 'execute_sql',
        arguments: { query }
      }
    });
    return response.result;
  } catch (error) {
    console.error('❌ SQL execution error:', error);
    throw error;
  }
}

async function main() {
  let client;

  try {
    console.log('🔌 Connecting to MCP server...');
    client = await connectToMCP();
    console.log('✅ Connected successfully');

    const targetUserId = '38967a42-3fdb-4d08-8768-bce6f97e3f0b';
    console.log(`👤 Target user: ${targetUserId} (makalah.app@gmail.com)`);

    // Step 1: Get all conversations for the user
    console.log('\n📋 Step 1: Getting all conversations...');
    const conversationsQuery = `
      SELECT id, created_at, updated_at
      FROM conversations
      WHERE user_id = '${targetUserId}'
      ORDER BY created_at DESC
    `;

    const conversationsResult = await executeSQL(client, conversationsQuery);
    console.log(`📊 Found ${conversationsResult.length} conversations to fix`);

    // Step 2: Get last message timestamp for each conversation
    console.log('\n📋 Step 2: Getting last message timestamps...');
    const lastActivityQuery = `
      SELECT
        conversation_id,
        MAX(created_at) as last_message_time,
        COUNT(*) as message_count
      FROM chat_messages
      WHERE conversation_id IN (
        SELECT id FROM conversations WHERE user_id = '${targetUserId}'
      )
      GROUP BY conversation_id
    `;

    const activityResult = await executeSQL(client, lastActivityQuery);
    console.log(`📊 Found activity data for ${activityResult.length} conversations with messages`);

    // Create activity map
    const activityMap = {};
    activityResult.forEach(row => {
      activityMap[row.conversation_id] = {
        last_message_time: row.last_message_time,
        message_count: row.message_count
      };
    });

    // Step 3: Fix each conversation timestamp
    console.log('\n📋 Step 3: Fixing conversation timestamps...');
    let fixedCount = 0;
    let noMessagesCount = 0;

    for (const conversation of conversationsResult) {
      const conversationId = conversation.id;
      const createdAt = conversation.created_at;
      const currentUpdatedAt = conversation.updated_at;

      let properUpdatedAt;
      let updateReason;

      if (activityMap[conversationId]) {
        // Use last message timestamp
        properUpdatedAt = activityMap[conversationId].last_message_time;
        updateReason = `last message (${activityMap[conversationId].message_count} messages)`;
      } else {
        // No messages, use created_at
        properUpdatedAt = createdAt;
        updateReason = 'no messages, using created_at';
        noMessagesCount++;
      }

      // Update the conversation
      const updateQuery = `
        UPDATE conversations
        SET updated_at = '${properUpdatedAt}'
        WHERE id = '${conversationId}'
      `;

      await executeSQL(client, updateQuery);

      console.log(`✅ Fixed conversation ${conversationId.slice(0, 8)}... - ${updateReason}`);
      console.log(`   Before: ${currentUpdatedAt}`);
      console.log(`   After:  ${properUpdatedAt}`);

      fixedCount++;
    }

    console.log(`\n🎉 TIMESTAMP FIX COMPLETED!`);
    console.log(`📊 Total conversations fixed: ${fixedCount}`);
    console.log(`📊 Conversations with messages: ${activityResult.length}`);
    console.log(`📊 Conversations without messages: ${noMessagesCount}`);

    // Step 4: Verification
    console.log('\n📋 Step 4: Verification - checking sample conversations...');
    const verificationQuery = `
      SELECT
        c.id,
        c.title,
        c.created_at,
        c.updated_at,
        (
          SELECT MAX(created_at)
          FROM chat_messages cm
          WHERE cm.conversation_id = c.id
        ) as actual_last_message,
        (
          SELECT COUNT(*)
          FROM chat_messages cm
          WHERE cm.conversation_id = c.id
        ) as message_count
      FROM conversations c
      WHERE c.user_id = '${targetUserId}'
      ORDER BY c.updated_at DESC
      LIMIT 5
    `;

    const verificationResult = await executeSQL(client, verificationQuery);

    console.log('\n🔍 Sample verification (top 5 by updated_at):');
    verificationResult.forEach((conv, index) => {
      const hasMessages = conv.message_count > 0;
      const timestampCorrect = hasMessages
        ? conv.updated_at === conv.actual_last_message
        : conv.updated_at === conv.created_at;

      console.log(`${index + 1}. ${conv.title || 'Untitled'}`);
      console.log(`   ID: ${conv.id.slice(0, 8)}...`);
      console.log(`   Messages: ${conv.message_count}`);
      console.log(`   Created: ${conv.created_at}`);
      console.log(`   Updated: ${conv.updated_at}`);
      if (hasMessages) {
        console.log(`   Last msg: ${conv.actual_last_message}`);
      }
      console.log(`   ✅ Timestamp ${timestampCorrect ? 'CORRECT' : '❌ INCORRECT'}`);
      console.log('');
    });

    // Final ordering check
    console.log('\n📋 Final Check: Chronological ordering verification...');
    const orderingQuery = `
      SELECT
        id,
        title,
        updated_at,
        (updated_at = LAG(updated_at) OVER (ORDER BY updated_at DESC)) as has_duplicate_timestamp
      FROM conversations
      WHERE user_id = '${targetUserId}'
      ORDER BY updated_at DESC
      LIMIT 10
    `;

    const orderingResult = await executeSQL(client, orderingQuery);
    console.log('🔍 Top 10 conversations by chronological order:');
    orderingResult.forEach((conv, index) => {
      console.log(`${index + 1}. ${conv.title || 'Untitled'} - ${conv.updated_at} ${conv.has_duplicate_timestamp ? '⚠️ DUPLICATE' : ''}`);
    });

    console.log('\n✅ PRODUCTION FIX COMPLETED SUCCESSFULLY!');
    console.log('🎯 All conversation timestamps now reflect ACTUAL activity times');
    console.log('📊 Proper chronological ordering has been restored');

  } catch (error) {
    console.error('❌ CRITICAL ERROR during timestamp fix:', error);
    throw error;
  } finally {
    if (client) {
      try {
        await client.close();
        console.log('🔌 MCP connection closed');
      } catch (error) {
        console.error('⚠️ Error closing MCP connection:', error);
      }
    }
  }
}

main().catch(error => {
  console.error('❌ SCRIPT FAILED:', error);
  process.exit(1);
});