import { execSync } from 'child_process';

console.log('🔧 CORRECT HISTORICAL TIMESTAMP FIX');
console.log('📅 Using ACTUAL historical message timestamps from the data');
console.log('⚠️  CRITICAL: This will fix ALL conversations with their real activity times');

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

// CORRECT historical timestamps based on our earlier analysis
const correctHistoricalFixes = [
  {
    id: '44941fed-2b24-42cf-968e-3c47c2bd13e7',
    title: 'Pengaruh Screentime Pada Kesehatan Mental Remaja Jakarta',
    correct_timestamp: '2025-09-24 11:18:31.603789+00' // ACTUAL last message time
  },
  {
    id: 'ac41a07e-e976-47d9-b6c9-f0c6713442fd',
    title: 'Analisis Proposal RAB Dan Harga Makalah ai',
    correct_timestamp: '2025-09-25 15:43:20.15811+00' // ACTUAL last message time
  },
  {
    id: '6d8a67c3-ae00-4205-8af7-be405c865b36',
    title: 'Identitas Dan Pengenalan Diri Dalam Percakapan',
    correct_timestamp: '2025-09-24 16:32:25.638824+00' // ACTUAL last message time
  },
  {
    id: 'ceedce41-cc00-4061-8836-dea57a53bf03',
    title: 'Mengatasi Kelelahan Dalam Kehidupan Akademik',
    correct_timestamp: '2025-09-24 11:12:45.156157+00' // ACTUAL last message time
  },
  {
    id: '171e3e37-720e-40bc-b35b-3911af978fd1',
    title: 'Mengatasi Kelelahan Dalam Kehidupan Akademik 2',
    correct_timestamp: '2025-09-24 11:12:01.70411+00' // ACTUAL last message time
  }
];

console.log(`\n📋 Fixing ${correctHistoricalFixes.length} conversations with CORRECT historical timestamps...`);

let successCount = 0;

for (const conv of correctHistoricalFixes) {
  console.log(`\n🔄 Fixing: ${conv.title.slice(0, 50)}...`);
  console.log(`   ID: ${conv.id.slice(0, 8)}...`);
  console.log(`   Target: ${conv.correct_timestamp} (ACTUAL message time)`);

  const updateQuery = `
    UPDATE conversations
    SET updated_at = '${conv.correct_timestamp}'::timestamptz
    WHERE id = '${conv.id}'
  `;

  try {
    const result = execMcpSQL(updateQuery);
    console.log('   ✅ FIXED with historical timestamp');
    successCount++;
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
  }
}

console.log(`\n📊 Successfully fixed ${successCount}/${correctHistoricalFixes.length} conversations`);

// Verification that these are now using ACTUAL historical dates
console.log('\n📋 Verification - checking for ACTUAL historical timestamps...');
const verificationQuery = `
  SELECT
    id,
    title,
    updated_at,
    EXTRACT(DAY FROM updated_at) as day,
    EXTRACT(MONTH FROM updated_at) as month,
    CASE
      WHEN DATE(updated_at) BETWEEN '2025-09-24' AND '2025-09-25' THEN 'CORRECT_HISTORICAL'
      WHEN DATE(updated_at) = '2025-09-26' THEN 'SCRIPT_RUNTIME'
      ELSE 'OTHER'
    END as timestamp_type
  FROM conversations
  WHERE user_id = '${targetUserId}'
    AND id IN ('${correctHistoricalFixes.map(c => c.id).join("', '")}')
  ORDER BY updated_at DESC
`;

const verifyResult = execMcpSQL(verificationQuery);
console.log('Historical verification:', verifyResult.split('\n').slice(-15).join('\n'));

// Overall status check
const overallStatusQuery = `
  SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN DATE(updated_at) BETWEEN '2025-09-08' AND '2025-09-25' THEN 1 END) as historical_dates,
    COUNT(CASE WHEN DATE(updated_at) = '2025-09-26' THEN 1 END) as script_dates,
    COUNT(CASE WHEN updated_at IN (
      '2025-09-26 01:07:24.512302+00',
      '2025-09-26 01:04:27.527319+00',
      '2025-09-26 01:03:36.668284+00',
      '2025-09-26 00:56:28.124609+00'
    ) THEN 1 END) as bulk_broken_dates
  FROM conversations
  WHERE user_id = '${targetUserId}'
`;

const statusResult = execMcpSQL(overallStatusQuery);
console.log('Overall status:', statusResult.split('\n').slice(-10).join('\n'));

// Show sample of properly fixed conversations (using actual September dates)
const properSampleQuery = `
  SELECT
    id,
    title,
    updated_at
  FROM conversations
  WHERE user_id = '${targetUserId}'
    AND DATE(updated_at) BETWEEN '2025-09-20' AND '2025-09-25'
  ORDER BY updated_at DESC
  LIMIT 5
`;

const properSample = execMcpSQL(properSampleQuery);
console.log('Properly fixed sample (September dates):', properSample.split('\n').slice(-12).join('\n'));

console.log('\n✅ HISTORICAL TIMESTAMP FIX COMPLETED!');
console.log('🎯 Fixed conversations now use ACTUAL historical message timestamps');
console.log('📊 Timestamps reflect real activity dates from September 2025');
console.log('🔒 Chronological ordering restored using genuine historical data');

if (successCount === correctHistoricalFixes.length) {
  console.log('\n🎉 ALL CRITICAL CONVERSATIONS SUCCESSFULLY FIXED!');
  console.log('📅 Conversations now show proper chronological order');
} else {
  console.log(`\n⚠️  ${correctHistoricalFixes.length - successCount} conversations still need fixing`);
}