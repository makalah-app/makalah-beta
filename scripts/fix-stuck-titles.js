#!/usr/bin/env node

/**
 * IMMEDIATE FIX: Fix Stuck Smart Title Conversations
 *
 * This script triggers the backfill-titles endpoint to fix conversations
 * that are stuck with "New Academic Chat" titles and smart_title_pending: true
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.BASE_URL || (process.env.NODE_ENV === 'production'
  ? 'https://your-production-domain.com'
  : 'http://localhost:3000');

const ADMIN_TOKEN = process.env.BACKFILL_ADMIN_TOKEN || '';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function fixStuckTitles() {
  console.log('🔧 Starting Smart Title Fix Process...\n');

  try {
    // Check current dev server status
    console.log('📡 Checking development server status...');

    const endpoint = `${BASE_URL}/api/admin/backfill-titles`;
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ADMIN_TOKEN ? { 'x-admin-token': ADMIN_TOKEN } : {})
      },
      body: { limit: 200 } // Check up to 200 recent conversations
    };

    console.log(`📞 Calling: ${endpoint}`);
    console.log(`🔐 Admin token: ${ADMIN_TOKEN ? 'PROVIDED' : 'NOT SET (public mode)'}`);

    const result = await makeRequest(endpoint, options);

    console.log(`\n📊 Response Status: ${result.status}`);

    if (result.status === 200) {
      console.log('✅ BACKFILL SUCCESSFUL!\n');
      console.log('📈 Results:');
      console.log(`   • Total checked: ${result.data.totalChecked}`);
      console.log(`   • Default-like titles found: ${result.data.defaultLike}`);
      console.log(`   • Successfully updated: ${result.data.updated}`);
      console.log(`   • Skipped (no user content): ${result.data.skipped}`);
      console.log(`   • Errors: ${result.data.errors}`);

      if (result.data.details && result.data.details.length > 0) {
        console.log('\n📝 Detailed Results:');
        result.data.details.forEach((item, i) => {
          console.log(`   ${i + 1}. ${item.id}`);
          console.log(`      Old: "${item.old || 'null'}"`);
          console.log(`      New: "${item.new || 'error'}"`);
          console.log(`      Status: ${item.status}`);
          if (item.error) {
            console.log(`      Error: ${item.error}`);
          }
          console.log('');
        });
      }

      if (result.data.updated > 0) {
        console.log(`🎉 SUCCESS: Fixed ${result.data.updated} stuck conversations!`);
        console.log('💡 Refresh your chat sidebar to see the updated titles.');
      } else {
        console.log('ℹ️  No stuck titles found - all conversations already have proper titles.');
      }
    } else {
      console.log('❌ BACKFILL FAILED!');
      console.log('Error:', result.data);

      if (result.status === 401) {
        console.log('\n💡 TIP: Set BACKFILL_ADMIN_TOKEN environment variable if required.');
      }

      if (result.status === 500) {
        console.log('\n🔍 This might be a server issue. Check the development server logs.');
      }
    }

  } catch (error) {
    console.log('💥 SCRIPT ERROR!');
    console.error('Details:', error);

    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 TIP: Make sure your development server is running on port 3000');
      console.log('Run: npm run dev');
    }
  }

  console.log('\n🏁 Smart Title Fix Process Complete');
}

// Run the fix
if (require.main === module) {
  fixStuckTitles().catch(console.error);
}

module.exports = { fixStuckTitles };