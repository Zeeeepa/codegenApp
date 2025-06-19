#!/usr/bin/env node

const API_BASE = 'http://localhost:3001';
const TOKEN = 'sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99';
const ORG_ID = 323;

async function testMathQuery() {
  console.log('🧮 Testing Math Query: "what is 50/2"');
  console.log('=====================================\n');

  try {
    // Send the query
    console.log('📤 Sending query...');
    const createResponse = await fetch(`${API_BASE}/api/v1/organizations/${ORG_ID}/agent/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({
        prompt: 'what is 50/2'
      })
    });

    if (!createResponse.ok) {
      throw new Error(`HTTP ${createResponse.status}: ${createResponse.statusText}`);
    }

    const createData = await createResponse.json();
    console.log('✅ Query sent successfully!');
    console.log(`🆔 Agent Run ID: ${createData.id}`);
    console.log(`🔗 Web URL: ${createData.web_url}`);
    console.log(`📊 Status: ${createData.status}\n`);

    // Wait for completion and get result
    console.log('⏳ Waiting for AI response...');
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max wait

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      attempts++;

      const statusResponse = await fetch(`${API_BASE}/api/v1/organizations/${ORG_ID}/agent/run/${createData.id}`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`
        }
      });

      if (!statusResponse.ok) {
        throw new Error(`Status check failed: HTTP ${statusResponse.status}`);
      }

      const statusData = await statusResponse.json();
      
      if (statusData.status === 'COMPLETE') {
        console.log('🎉 Query completed successfully!\n');
        console.log('📥 RESPONSE:');
        console.log('============');
        console.log(`Result: ${statusData.result}`);
        console.log(`Status: ${statusData.status}`);
        console.log(`Created: ${statusData.created_at}`);
        console.log(`Web URL: ${statusData.web_url}\n`);
        
        // Check if the answer is correct
        if (statusData.result && statusData.result.includes('25')) {
          console.log('✅ SUCCESS: AI correctly answered 25! 🎯');
        } else {
          console.log('⚠️  Unexpected result format, but query completed');
        }
        return;
      } else if (statusData.status === 'FAILED') {
        console.log('❌ Query failed:', statusData.result || 'Unknown error');
        return;
      }

      process.stdout.write('.');
    }

    console.log('\n⏰ Timeout waiting for response');

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// Import fetch for Node.js
import('node-fetch').then(({ default: fetch }) => {
  global.fetch = fetch;
  testMathQuery();
}).catch(() => {
  // Fallback for environments without node-fetch
  console.log('⚠️ Using built-in fetch');
  testMathQuery();
});

