#!/usr/bin/env node

const API_BASE = 'http://localhost:3001';
const TOKEN = 'sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99';
const ORG_ID = 323;

// Import fetch for Node.js
import('node-fetch').then(({ default: fetch }) => {
  global.fetch = fetch;
  runTests();
}).catch(() => {
  console.log('⚠️ Using built-in fetch');
  runTests();
});

async function runTests() {
  console.log('🧪 Testing Agent Run Functionality...\n');

  // Step 1: Test basic connectivity
  console.log('📡 Step 1: Testing basic connectivity...');
  try {
    const healthResponse = await fetch(`${API_BASE}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health Check:', healthData.status);
  } catch (error) {
    console.log('❌ Health Check failed:', error.message);
    return;
  }

  // Step 2: Test user authentication
  console.log('\n👤 Step 2: Testing user authentication...');
  try {
    const userResponse = await fetch(`${API_BASE}/api/v1/users/me`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const userData = await userResponse.json();
    console.log('✅ User authenticated:', userData.email);
  } catch (error) {
    console.log('❌ User authentication failed:', error.message);
    return;
  }

  // Step 3: Create a test agent run
  console.log('\n🚀 Step 3: Creating test agent run...');
  let agentRunId = null;
  try {
    const createResponse = await fetch(`${API_BASE}/api/v1/organizations/${ORG_ID}/agent/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'Test agent run - please respond with a simple "Hello, this is a test response!"',
        images: []
      })
    });

    if (createResponse.ok) {
      const createData = await createResponse.json();
      agentRunId = createData.id;
      console.log('✅ Agent run created:', {
        id: createData.id,
        status: createData.status,
        created_at: createData.created_at
      });
    } else {
      const errorText = await createResponse.text();
      console.log('❌ Failed to create agent run:', createResponse.status, errorText);
      return;
    }
  } catch (error) {
    console.log('❌ Agent run creation failed:', error.message);
    return;
  }

  // Step 4: Monitor the agent run status
  console.log('\n📊 Step 4: Monitoring agent run status...');
  let attempts = 0;
  const maxAttempts = 10;
  let currentStatus = 'unknown';

  while (attempts < maxAttempts) {
    try {
      const statusResponse = await fetch(`${API_BASE}/api/v1/organizations/${ORG_ID}/agent/run/${agentRunId}`, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        const newStatus = statusData.status;
        
        if (newStatus !== currentStatus) {
          console.log(`📈 Status changed: ${currentStatus} → ${newStatus}`);
          currentStatus = newStatus;
        }

        // Check if run is complete
        if (['complete', 'completed', 'failed', 'cancelled'].includes(newStatus.toLowerCase())) {
          console.log('✅ Agent run finished with status:', newStatus);
          if (statusData.result) {
            console.log('📝 Result:', statusData.result.substring(0, 200) + '...');
          }
          break;
        }

        // If still active, wait and check again
        if (['active', 'running', 'pending'].includes(newStatus.toLowerCase())) {
          console.log(`⏳ Still ${newStatus}, waiting...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } else {
        console.log('⚠️ Status check failed:', statusResponse.status);
      }
    } catch (error) {
      console.log('❌ Status monitoring error:', error.message);
    }

    attempts++;
  }

  // Step 5: Test messaging functionality
  console.log('\n💬 Step 5: Testing messaging functionality...');
  try {
    const messageEndpoint = currentStatus.toLowerCase() === 'paused' 
      ? `${API_BASE}/api/v1/beta/organizations/${ORG_ID}/agent/run/resume`
      : `${API_BASE}/api/v1/beta/organizations/${ORG_ID}/agent/run/message`;

    const messageResponse = await fetch(messageEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_run_id: agentRunId,
        prompt: 'This is a test message to verify the messaging functionality works correctly.'
      })
    });

    if (messageResponse.ok) {
      const messageData = await messageResponse.json();
      console.log('✅ Message sent successfully:', {
        id: messageData.id,
        status: messageData.status
      });
    } else {
      const errorText = await messageResponse.text();
      console.log('❌ Message sending failed:', messageResponse.status, errorText);
    }
  } catch (error) {
    console.log('❌ Message sending error:', error.message);
  }

  // Step 6: List recent agent runs
  console.log('\n📋 Step 6: Listing recent agent runs...');
  try {
    const listResponse = await fetch(`${API_BASE}/api/v1/organizations/${ORG_ID}/agent_runs?limit=5`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });

    if (listResponse.ok) {
      const listData = await listResponse.json();
      console.log('✅ Recent agent runs:');
      if (listData.items && listData.items.length > 0) {
        listData.items.forEach((run, index) => {
          console.log(`  ${index + 1}. ID: ${run.id}, Status: ${run.status}, Created: ${run.created_at}`);
        });
      } else {
        console.log('  No agent runs found');
      }
    } else {
      console.log('❌ Failed to list agent runs:', listResponse.status);
    }
  } catch (error) {
    console.log('❌ Listing error:', error.message);
  }

  console.log('\n🎉 Test completed! Check the UI to verify that:');
  console.log('   1. The new agent run appears in the dashboard');
  console.log('   2. Status changes are reflected in real-time');
  console.log('   3. The "Respond to agent run" button works');
  console.log('   4. No infinite loop warnings appear in console');
  console.log('   5. The monitoring dashboard shows updated stats');
}

