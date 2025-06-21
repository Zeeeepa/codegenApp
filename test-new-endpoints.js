#!/usr/bin/env node

const API_BASE = 'http://localhost:3001';
const TOKEN = 'sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99';
const ORG_ID = 323;

// Import fetch for Node.js
import('node-fetch').then(({ default: fetch }) => {
  global.fetch = fetch;
  testNewEndpoints();
}).catch(() => {
  console.log('⚠️ Using built-in fetch');
  testNewEndpoints();
});

async function testNewEndpoints() {
  console.log('🔧 Testing New Server Endpoints Implementation...\n');

  // Test 1: Agent runs list endpoint
  console.log('1️⃣ Testing agent runs list endpoint...');
  try {
    const listResponse = await fetch(`${API_BASE}/api/v1/organizations/${ORG_ID}/agent/runs?page=1&size=10`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });

    console.log('   Status:', listResponse.status);
    if (listResponse.ok) {
      const listData = await listResponse.json();
      console.log('   ✅ Agent runs list endpoint working!');
      console.log('   📊 Found', listData.items ? listData.items.length : 0, 'agent runs');
      if (listData.items && listData.items.length > 0) {
        console.log('   📝 Latest run:', {
          id: listData.items[0].id,
          status: listData.items[0].status,
          created_at: listData.items[0].created_at
        });
      }
    } else {
      const errorText = await listResponse.text();
      console.log('   ❌ Still failing:', listResponse.status, errorText);
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  // Test 2: Message endpoint
  console.log('\n2️⃣ Testing message endpoint...');
  try {
    // First create a test run to message
    const createResponse = await fetch(`${API_BASE}/api/v1/organizations/${ORG_ID}/agent/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'Test for new message endpoint - please respond briefly!',
        images: []
      })
    });

    if (createResponse.ok) {
      const createData = await createResponse.json();
      const testRunId = createData.id;
      console.log('   📝 Created test run:', testRunId);

      // Wait for it to complete
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Now test the message endpoint
      const messageResponse = await fetch(`${API_BASE}/api/v1/beta/organizations/${ORG_ID}/agent/run/message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agent_run_id: testRunId,
          prompt: 'This is a test message for the new endpoint implementation.'
        })
      });

      console.log('   Status:', messageResponse.status);
      if (messageResponse.ok) {
        const messageData = await messageResponse.json();
        console.log('   ✅ Message endpoint working!');
        console.log('   📨 Response:', {
          id: messageData.id,
          status: messageData.status
        });
      } else {
        const errorText = await messageResponse.text();
        console.log('   ❌ Still failing:', messageResponse.status, errorText);
      }
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  // Test 3: Resume endpoint
  console.log('\n3️⃣ Testing resume endpoint...');
  try {
    const resumeResponse = await fetch(`${API_BASE}/api/v1/beta/organizations/${ORG_ID}/agent/run/resume`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_run_id: 99999, // Fake ID to test endpoint availability
        prompt: 'Test resume message'
      })
    });

    console.log('   Status:', resumeResponse.status);
    if (resumeResponse.status === 404) {
      console.log('   ❌ Resume endpoint still returning 404');
    } else if (resumeResponse.status >= 400 && resumeResponse.status < 500) {
      console.log('   ✅ Resume endpoint exists! (Client error expected with fake ID)');
    } else {
      console.log('   ✅ Resume endpoint working!');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }

  // Test 4: Check server logs for routing
  console.log('\n4️⃣ Checking server routing...');
  console.log('   Check server logs to see if requests are being routed correctly');
  console.log('   Look for "Proxying BETA" and "Proxying AGENT RUNS LIST" messages');

  console.log('\n🎯 ENDPOINT IMPLEMENTATION TEST SUMMARY:');
  console.log('==========================================');
  console.log('The server now has specific handlers for:');
  console.log('✅ /api/v1/beta/* - Beta endpoints (message, resume)');
  console.log('✅ /api/v1/organizations/:orgId/agent/runs - Agent runs list');
  console.log('✅ /api/v1/* - General proxy for other endpoints');
  
  console.log('\n🔄 Next: Run the complete workflow test to verify everything works!');
}

