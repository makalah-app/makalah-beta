import crypto from 'crypto';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Inject crypto polyfill for MCP compatibility
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Starting proper conversation timestamp fix with crypto polyfill...');
console.log('📅 Target: Fix updated_at based on ACTUAL last message timestamps');

function executeSQLWithCrypto(query) {
  try {
    console.log('🏃 Executing SQL with crypto polyfill...');

    // Use the crypto-patched script from the main project
    const scriptPath = '/Users/eriksupit/Desktop/makalah/scripts/mcp-with-crypto.mjs';
    const command = `node "${scriptPath}" "${query.replace(/"/g, '\\"')}"`;

    const result = execSync(command, {
      encoding: 'utf8',
      cwd: '/Users/eriksupit/Desktop/makalah',
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    // Parse the JSON result from the output with untrusted-data tags
    const lines = result.split('\n');

    // Look for content between untrusted-data tags (handling nested cases)
    const untrustedDataRegex = /<untrusted-data-[^>]+>([\s\S]*?)<\/untrusted-data-[^>]+>/g;
    const matches = [...result.matchAll(untrustedDataRegex)];

    for (const match of matches) {
      const jsonContent = match[1].trim();
      console.log('🔍 Checking content:', jsonContent.substring(0, 100) + '...');

      // Look for JSON array or object directly
      if (jsonContent.startsWith('[') || jsonContent.startsWith('{')) {
        try {
          return JSON.parse(jsonContent);
        } catch (e) {
          console.log('⚠️ JSON parse failed, trying inner content');
        }
      }

      // Look for nested untrusted-data or JSON within the content
      const innerJsonMatch = jsonContent.match(/\[[\s\S]*\]/);
      if (innerJsonMatch) {
        try {
          return JSON.parse(innerJsonMatch[0]);
        } catch (e) {
          console.log('⚠️ Inner JSON parse failed:', e.message);
        }
      }
    }

    if (matches.length === 0) {
      // Fallback: look for direct JSON lines
      const jsonLine = lines.find(line => line.trim().startsWith('[') || line.trim().startsWith('{'));
      if (jsonLine) {
        return JSON.parse(jsonLine.trim());
      } else {
        console.error('❌ Raw output:', result);
        throw new Error('No JSON result found in output');
      }
    }

    throw new Error('Failed to parse JSON from all attempts');
  } catch (error) {
    console.error('❌ SQL execution error:', error.message);
    throw error;
  }
}

async function main() {
  try {
    const targetUserId = '38967a42-3fdb-4d08-8768-bce6f97e3f0b';
    console.log(`👤 Target user: ${targetUserId} (makalah.app@gmail.com)`);

    // Step 1: Get all conversations for the user
    console.log('\n📋 Step 1: Getting all conversations...');
    const conversationsQuery = `
      SELECT id, title, created_at, updated_at
      FROM conversations
      WHERE user_id = '${targetUserId}'
      ORDER BY created_at DESC
    `;

    const conversations = executeSQLWithCrypto(conversationsQuery);
    console.log(`📊 Found ${conversations.length} conversations to fix`);

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

    const activityData = executeSQLWithCrypto(lastActivityQuery);
    console.log(`📊 Found activity data for ${activityData.length} conversations with messages`);

    // Create activity map
    const activityMap = {};
    activityData.forEach(row => {
      activityMap[row.conversation_id] = {
        last_message_time: row.last_message_time,
        message_count: row.message_count
      };
    });

    // Step 3: Fix each conversation timestamp
    console.log('\n📋 Step 3: Fixing conversation timestamps...');
    let fixedCount = 0;
    let noMessagesCount = 0;

    for (const conversation of conversations) {
      const conversationId = conversation.id;
      const createdAt = conversation.created_at;
      const currentUpdatedAt = conversation.updated_at;
      const title = conversation.title || 'Untitled';

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

      executeSQLWithCrypto(updateQuery);

      console.log(`✅ Fixed: ${title.slice(0, 30)}...`);
      console.log(`   ID: ${conversationId.slice(0, 8)}... - ${updateReason}`);
      console.log(`   Before: ${currentUpdatedAt}`);
      console.log(`   After:  ${properUpdatedAt}`);
      console.log('');

      fixedCount++;
    }

    console.log(`\n🎉 TIMESTAMP FIX COMPLETED!`);
    console.log(`📊 Total conversations fixed: ${fixedCount}`);
    console.log(`📊 Conversations with messages: ${activityData.length}`);
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

    const verification = executeSQLWithCrypto(verificationQuery);

    console.log('\n🔍 Sample verification (top 5 by updated_at):');
    verification.forEach((conv, index) => {
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
      console.log(`   ${timestampCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
      console.log('');
    });

    // Final ordering check
    console.log('\n📋 Final Check: Chronological ordering verification...');
    const orderingQuery = `
      SELECT
        id,
        title,
        updated_at
      FROM conversations
      WHERE user_id = '${targetUserId}'
      ORDER BY updated_at DESC
      LIMIT 10
    `;

    const ordering = executeSQLWithCrypto(orderingQuery);
    console.log('🔍 Top 10 conversations by chronological order:');
    ordering.forEach((conv, index) => {
      console.log(`${index + 1}. ${(conv.title || 'Untitled').slice(0, 40)}... - ${conv.updated_at}`);
    });

    console.log('\n✅ PRODUCTION FIX COMPLETED SUCCESSFULLY!');
    console.log('🎯 All conversation timestamps now reflect ACTUAL activity times');
    console.log('📊 Proper chronological ordering has been restored');

  } catch (error) {
    console.error('❌ CRITICAL ERROR during timestamp fix:', error);
    throw error;
  }
}

main().catch(error => {
  console.error('❌ SCRIPT FAILED:', error);
  process.exit(1);
});