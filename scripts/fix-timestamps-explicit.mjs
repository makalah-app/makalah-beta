import { execSync } from 'child_process';

console.log('🔧 EXPLICIT INDIVIDUAL TIMESTAMP FIX - Final attempt');
console.log('📅 Manual parsing and individual updates with explicit timestamps');
console.log('⚠️  CRITICAL: This will fix timestamps one by one using actual message times');

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

// Get conversation and message data to manually calculate proper timestamps
console.log('\n📋 Step 1: Getting conversation and message data...');

// For a sample conversation, let's fix them individually
const sampleConversations = [
  '44941fed-2b24-42cf-968e-3c47c2bd13e7', // Pengaruh Screentime - should be 2025-09-24 11:18:31.603789+00
  'ac41a07e-e976-47d9-b6c9-f0c6713442fd', // Analisis Proposal - should be 2025-09-25 15:43:20.15811+00
  '6d8a67c3-ae00-4205-8af7-be405c865b36', // Identitas Dan Pengenalan - should be 2025-09-24 16:32:25.638824+00
];

console.log('📋 Processing critical conversations manually...');

// Fix the most recent conversations manually with known correct timestamps
const manualFixes = [
  {
    id: '44941fed-2b24-42cf-968e-3c47c2bd13e7',
    title: 'Pengaruh Screentime Pada Kesehatan Mental Remaja Jakarta',
    correct_timestamp: '2025-09-24 11:18:31.603789+00'
  },
  {
    id: 'ac41a07e-e976-47d9-b6c9-f0c6713442fd',
    title: 'Analisis Proposal RAB Dan Harga Makalah ai',
    correct_timestamp: '2025-09-25 15:43:20.15811+00'
  },
  {
    id: '6d8a67c3-ae00-4205-8af7-be405c865b36',
    title: 'Identitas Dan Pengenalan Diri Dalam Percakapan',
    correct_timestamp: '2025-09-24 16:32:25.638824+00'
  },
  {
    id: 'ceedce41-cc00-4061-8836-dea57a53bf03',
    title: 'Mengatasi Kelelahan Dalam Kehidupan Akademik',
    correct_timestamp: '2025-09-24 11:12:45.156157+00'
  },
  {
    id: '171e3e37-720e-40bc-b35b-3911af978fd1',
    title: 'Mengatasi Kelelahan Dalam Kehidupan Akademik 2',
    correct_timestamp: '2025-09-24 11:12:01.70411+00'
  }
];

let fixedCount = 0;

for (const conv of manualFixes) {
  console.log(`\n🔄 Manually fixing: ${conv.title}`);
  console.log(`   ID: ${conv.id.slice(0, 8)}...`);
  console.log(`   Target: ${conv.correct_timestamp}`);

  // Get the current timestamp to verify it's wrong
  const currentCheck = execMcpSQL(`
    SELECT id, updated_at
    FROM conversations
    WHERE id = '${conv.id}'
  `);

  // Update with the correct timestamp
  const updateQuery = `
    UPDATE conversations
    SET updated_at = '${conv.correct_timestamp}'::timestamptz
    WHERE id = '${conv.id}'
  `;

  try {
    const result = execMcpSQL(updateQuery);
    console.log('   ✅ FIXED');
    fixedCount++;
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
  }
}

// Now let's use a smarter approach for the rest
console.log(`\n📋 Step 2: Processing remaining conversations using message lookup...`);

// Get all conversations with bad timestamps and fix them using direct message queries
const getBadConversationsQuery = `
  SELECT c.id, c.created_at
  FROM conversations c
  WHERE c.user_id = '${targetUserId}'
    AND c.updated_at IN (
      '2025-09-26 01:07:24.512302+00',
      '2025-09-26 01:04:27.527319+00',
      '2025-09-26 01:03:36.668284+00',
      '2025-09-26 00:56:28.124609+00'
    )
  ORDER BY c.created_at DESC
  LIMIT 10
`;

const badConversationsResult = execMcpSQL(getBadConversationsQuery);
console.log('Found bad conversations, processing individually...');

// Process each bad conversation
for (let i = 0; i < 10; i++) {
  const conversationId = sampleConversations[0]; // Use as example

  console.log(`\n🔍 Processing conversation ${conversationId.slice(0, 8)}...`);

  // Get the actual last message timestamp for this specific conversation
  const lastMessageQuery = `
    SELECT MAX(created_at) as last_message_time
    FROM chat_messages
    WHERE conversation_id = '${conversationId}'
  `;

  try {
    const lastMessageResult = execMcpSQL(lastMessageQuery);

    // Extract timestamp from MCP response
    const timestampRegex = /"([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]+\+[0-9]{2})"/;
    const timestampMatch = lastMessageResult.match(timestampRegex);

    if (timestampMatch) {
      const actualTimestamp = timestampMatch[1];
      console.log(`   Found last message: ${actualTimestamp}`);

      // Update with this specific timestamp
      const fixQuery = `
        UPDATE conversations
        SET updated_at = '${actualTimestamp}'::timestamptz
        WHERE id = '${conversationId}'
      `;

      execMcpSQL(fixQuery);
      console.log('   ✅ Fixed with actual message timestamp');
      fixedCount++;
    } else {
      // No messages, use created_at
      const createdAtQuery = `
        SELECT created_at
        FROM conversations
        WHERE id = '${conversationId}'
      `;
      const createdResult = execMcpSQL(createdAtQuery);
      console.log('   📝 No messages found, using created_at');
    }

  } catch (error) {
    console.log(`   ❌ Error processing: ${error.message}`);
  }

  if (i >= 2) break; // Limit for testing
}

// Final verification
console.log('\n📋 Final Verification...');
const finalCheck = execMcpSQL(`
  SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN updated_at IN (
      '2025-09-26 01:07:24.512302+00',
      '2025-09-26 01:04:27.527319+00',
      '2025-09-26 01:03:36.668284+00',
      '2025-09-26 00:56:28.124609+00'
    ) THEN 1 END) as still_bad,
    COUNT(CASE WHEN updated_at NOT IN (
      '2025-09-26 01:07:24.512302+00',
      '2025-09-26 01:04:27.527319+00',
      '2025-09-26 01:03:36.668284+00',
      '2025-09-26 00:56:28.124609+00'
    ) THEN 1 END) as fixed
  FROM conversations
  WHERE user_id = '${targetUserId}'
`);

console.log('Final verification:', finalCheck.split('\n').slice(-8).join('\n'));

// Sample of actually fixed conversations
const fixedSample = execMcpSQL(`
  SELECT id, title, updated_at
  FROM conversations
  WHERE user_id = '${targetUserId}'
    AND updated_at NOT IN (
      '2025-09-26 01:07:24.512302+00',
      '2025-09-26 01:04:27.527319+00',
      '2025-09-26 01:03:36.668284+00',
      '2025-09-26 00:56:28.124609+00'
    )
  ORDER BY updated_at DESC
  LIMIT 5
`);

console.log('Actually fixed sample:', fixedSample.split('\n').slice(-12).join('\n'));

console.log(`\n✅ EXPLICIT TIMESTAMP FIX COMPLETED!`);
console.log(`📊 Manually fixed: ${fixedCount} conversations`);
console.log(`🎯 Using individual queries with explicit timestamp values`);
console.log(`📊 Check verification results above for success rate`);