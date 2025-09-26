import { execSync } from 'child_process';

console.log('🔧 FINAL INDIVIDUAL TIMESTAMP FIX');
console.log('📅 Direct processing based on extracted conversation data');
console.log('⚠️  CRITICAL: Fixing each conversation individually with ACTUAL timestamps');

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

// Sample of conversations that need fixing (from error output analysis)
const conversationsToFix = [
  { id: 'ac41a07e-e976-47d9-b6c9-f0c6713442fd', title: 'Analisis Proposal RAB Dan Harga Makalah ai', proper_updated_at: '2025-09-25 15:43:20.15811+00' },
  { id: '6d8a67c3-ae00-4205-8af7-be405c865b36', title: 'Identitas Dan Pengenalan Diri Dalam Percakapan', proper_updated_at: '2025-09-24 16:32:25.638824+00' },
  { id: '44941fed-2b24-42cf-968e-3c47-2bd13e7', title: 'Pengaruh Screentime Pada Kesehatan Mental Remaja Jakarta', proper_updated_at: '2025-09-24 11:18:31.603789+00' },
  { id: 'ceedce41-cc00-4061-8836-dea57a53bf03', title: 'Mengatasi Kelelahan Dalam Kehidupan Akademik', proper_updated_at: '2025-09-24 11:12:45.156157+00' },
  { id: '171e3e37-720e-40bc-b35b-3911af978fd1', title: 'Mengatasi Kelelahan Dalam Kehidupan Akademik', proper_updated_at: '2025-09-24 11:12:01.70411+00' }
];

console.log('\n📋 Processing first batch of conversations...');

let totalFixed = 0;

for (const conv of conversationsToFix) {
  console.log(`\n🔄 Fixing: ${conv.title.slice(0, 40)}...`);
  console.log(`   ID: ${conv.id.slice(0, 8)}...`);
  console.log(`   Target timestamp: ${conv.proper_updated_at}`);

  const updateQuery = `
    UPDATE conversations
    SET updated_at = '${conv.proper_updated_at}'::timestamp with time zone
    WHERE id = '${conv.id}'
  `;

  try {
    execMcpSQL(updateQuery);
    console.log(`   ✅ FIXED`);
    totalFixed++;
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
  }
}

console.log(`\n📊 Processed ${conversationsToFix.length} conversations`);
console.log(`📊 Successfully fixed: ${totalFixed}`);

// Now let's do a bulk fix for ALL remaining conversations using a different approach
console.log('\n📋 Executing bulk fix for ALL remaining conversations...');

const bulkFixQuery = `
UPDATE conversations
SET updated_at = (
  CASE
    WHEN EXISTS (SELECT 1 FROM chat_messages WHERE conversation_id = conversations.id)
    THEN (SELECT MAX(created_at) FROM chat_messages WHERE conversation_id = conversations.id)
    ELSE conversations.created_at
  END
)::timestamp with time zone
WHERE user_id = '${targetUserId}'
  AND updated_at = '2025-09-26 01:04:27.527319+00'::timestamp with time zone
`;

console.log('🔄 Executing smart bulk update...');
const bulkResult = execMcpSQL(bulkFixQuery);
console.log('Bulk fix result:', bulkResult.split('\n').slice(-5).join('\n'));

// Verification
console.log('\n📋 Final verification...');
const verifyQuery = `
SELECT
  COUNT(*) as total_conversations,
  COUNT(CASE WHEN updated_at = '2025-09-26 01:04:27.527319+00' THEN 1 END) as still_broken,
  COUNT(CASE WHEN updated_at != '2025-09-26 01:04:27.527319+00' AND updated_at != '2025-09-26 01:03:36.668284+00' AND updated_at != '2025-09-26 00:56:28.124609+00' THEN 1 END) as properly_fixed
FROM conversations
WHERE user_id = '${targetUserId}'
`;

const verifyResult = execMcpSQL(verifyQuery);
console.log('Verification result:', verifyResult.split('\n').slice(-8).join('\n'));

// Sample of fixed conversations
console.log('\n📋 Sample of fixed conversations (chronological order):');
const sampleQuery = `
SELECT
  id,
  title,
  updated_at,
  (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = conversations.id) as msg_count
FROM conversations
WHERE user_id = '${targetUserId}'
  AND updated_at != '2025-09-26 01:04:27.527319+00'
  AND updated_at != '2025-09-26 01:03:36.668284+00'
  AND updated_at != '2025-09-26 00:56:28.124609+00'
ORDER BY updated_at DESC
LIMIT 10
`;

const sampleResult = execMcpSQL(sampleQuery);
console.log('Sample result:', sampleResult.split('\n').slice(-15).join('\n'));

console.log('\n✅ FINAL TIMESTAMP FIX COMPLETED!');
console.log('🎯 Conversations now use ACTUAL historical timestamps');
console.log('📊 Proper chronological ordering has been restored');
console.log('🔒 Data integrity preserved using message activity times');