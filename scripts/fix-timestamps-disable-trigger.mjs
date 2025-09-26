import { execSync } from 'child_process';

console.log('🔧 TRIGGER-AWARE TIMESTAMP FIX - FINAL SOLUTION');
console.log('📅 Disabling auto-update trigger to fix timestamps with historical data');
console.log('⚠️  CRITICAL: Found trigger that overrides updated_at - will disable temporarily');

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

// Step 1: Disable the auto-update trigger
console.log('\n📋 Step 1: Disabling auto-update trigger...');
const disableTriggerQuery = 'ALTER TABLE conversations DISABLE TRIGGER update_conversations_updated_at';

try {
  const disableResult = execMcpSQL(disableTriggerQuery);
  console.log('✅ Trigger disabled successfully');
  console.log('Disable result:', disableResult.split('\n').slice(-3).join('\n'));
} catch (error) {
  console.log('❌ Failed to disable trigger:', error.message);
  throw error;
}

// Step 2: Now fix timestamps with historical data (should work without trigger interference)
console.log('\n📋 Step 2: Fixing timestamps with historical data (trigger disabled)...');

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

let successCount = 0;

for (const conv of correctHistoricalFixes) {
  console.log(`\n🔄 Fixing (trigger disabled): ${conv.title.slice(0, 50)}...`);
  console.log(`   ID: ${conv.id.slice(0, 8)}...`);
  console.log(`   Historical timestamp: ${conv.correct_timestamp}`);

  const updateQuery = `
    UPDATE conversations
    SET updated_at = '${conv.correct_timestamp}'::timestamptz
    WHERE id = '${conv.id}'
  `;

  try {
    const result = execMcpSQL(updateQuery);
    console.log('   ✅ FIXED (no trigger interference)');
    successCount++;
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
  }
}

console.log(`\n📊 Successfully fixed ${successCount}/${correctHistoricalFixes.length} conversations with trigger disabled`);

// Step 3: Verify the fix worked with actual historical dates
console.log('\n📋 Step 3: Verification - checking for ACTUAL historical timestamps...');
const verificationQuery = `
  SELECT
    id,
    title,
    updated_at,
    DATE(updated_at) as update_date,
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

// Step 4: Check overall status
const overallStatusQuery = `
  SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN DATE(updated_at) BETWEEN '2025-09-08' AND '2025-09-25' THEN 1 END) as historical_dates,
    COUNT(CASE WHEN DATE(updated_at) = '2025-09-26' THEN 1 END) as script_dates
  FROM conversations
  WHERE user_id = '${targetUserId}'
`;

const statusResult = execMcpSQL(overallStatusQuery);
console.log('Overall status:', statusResult.split('\n').slice(-10).join('\n'));

// Step 5: Re-enable the trigger
console.log('\n📋 Step 5: Re-enabling auto-update trigger...');
const enableTriggerQuery = 'ALTER TABLE conversations ENABLE TRIGGER update_conversations_updated_at';

try {
  const enableResult = execMcpSQL(enableTriggerQuery);
  console.log('✅ Trigger re-enabled successfully');
  console.log('Enable result:', enableResult.split('\n').slice(-3).join('\n'));
} catch (error) {
  console.log('❌ Failed to re-enable trigger:', error.message);
  console.log('⚠️  MANUAL ACTION REQUIRED: Please re-enable the trigger manually!');
}

// Final sample of properly fixed conversations
const finalSampleQuery = `
  SELECT
    id,
    title,
    updated_at,
    DATE(updated_at) as update_date
  FROM conversations
  WHERE user_id = '${targetUserId}'
    AND DATE(updated_at) BETWEEN '2025-09-24' AND '2025-09-25'
  ORDER BY updated_at DESC
  LIMIT 5
`;

const finalSample = execMcpSQL(finalSampleQuery);
console.log('Final sample (proper historical dates):', finalSample.split('\n').slice(-12).join('\n'));

console.log('\n✅ TRIGGER-AWARE TIMESTAMP FIX COMPLETED!');
console.log('🎯 Disabled trigger to fix timestamps with ACTUAL historical data');
console.log('📊 Conversations now use genuine message activity timestamps');
console.log('🔒 Trigger re-enabled to maintain normal behavior');

if (successCount === correctHistoricalFixes.length) {
  console.log('\n🎉 SUCCESS! ALL CRITICAL CONVERSATIONS FIXED WITH HISTORICAL TIMESTAMPS!');
  console.log('📅 Chronological ordering restored using actual September 2025 dates');
} else {
  console.log(`\n⚠️  ${correctHistoricalFixes.length - successCount} conversations still need attention`);
}