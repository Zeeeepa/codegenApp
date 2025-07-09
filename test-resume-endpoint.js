#!/usr/bin/env node

const API_BASE = 'http://localhost:3001/api';
const TOKEN = 'sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99';
const ORG_ID = '323';

async function testResumeEndpoint() {
  console.log('🧪 Testing Resume Agent Run endpoint...\n');

  // First, let's create a new agent run to test with
  console.log('🚀 1. Creating a new agent run for testing...');
  let testAgentRunId = null;
  
  try {
    const createResponse = await fetch(`${API_BASE}/v1/organizations/${ORG_ID}/agent/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: "This is a test agent run for testing the resume endpoint. Please respond with a simple message and then stop."
      })
    });
    
    if (createResponse.ok) {
      const createData = await createResponse.json();
      testAgentRunId = createData.id;
      console.log(`✅ Agent run created successfully: #${testAgentRunId}`);
      console.log(`   Status: ${createData.status}`);
      
      // Wait a moment for the agent run to process
      console.log('⏳ Waiting 5 seconds for agent run to process...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } else {
      const errorText = await createResponse.text();
      console.log(`❌ Failed to create agent run: ${createResponse.status} ${createResponse.statusText}`);
      console.log(`   Response: ${errorText}`);
      return;
    }
  } catch (error) {
    console.log('❌ Error creating agent run:', error.message);
    return;
  }

  if (testAgentRunId) {
    // Test the NEW resume endpoint
    console.log('\n🔄 2. Testing NEW resume endpoint...');
    await testNewResumeEndpoint(testAgentRunId);
    
    // Test the OLD resume endpoint for comparison
    console.log('\n🔄 3. Testing OLD resume endpoint for comparison...');
    await testOldResumeEndpoint(testAgentRunId);
  }
}

async function testNewResumeEndpoint(agentRunId) {
  const newEndpoint = `${API_BASE}/v1/organizations/${ORG_ID}/agent/run/${agentRunId}/resume`;
  const requestBody = {
    prompt: "Continue with the previous task - this is a test of the NEW RESTful endpoint"
  };
  
  console.log(`   📡 NEW Endpoint: ${newEndpoint}`);
  console.log(`   📝 Request body: ${JSON.stringify(requestBody, null, 2)}`);
  
  try {
    const response = await fetch(newEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const responseText = await response.text();
    console.log(`   📊 Response status: ${response.status} ${response.statusText}`);
    console.log(`   📄 Response body: ${responseText}`);
    
    if (response.ok) {
      console.log('   ✅ NEW endpoint working correctly!');
      try {
        const responseData = JSON.parse(responseText);
        console.log(`   🆔 Resumed agent run ID: ${responseData.id}`);
        console.log(`   📊 Status: ${responseData.status}`);
      } catch (e) {
        // Response might not be JSON
      }
    } else {
      console.log('   ❌ NEW endpoint failed');
    }
  } catch (error) {
    console.log('   ❌ NEW endpoint error:', error.message);
  }
}

async function testOldResumeEndpoint(agentRunId) {
  const oldEndpoint = `${API_BASE}/v1/beta/organizations/${ORG_ID}/agent/run/resume`;
  const requestBody = {
    agent_run_id: parseInt(agentRunId),
    prompt: "Continue with the previous task - this is a test of the OLD endpoint"
  };
  
  console.log(`   📡 OLD Endpoint: ${oldEndpoint}`);
  console.log(`   📝 Request body: ${JSON.stringify(requestBody, null, 2)}`);
  
  try {
    const response = await fetch(oldEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const responseText = await response.text();
    console.log(`   📊 Response status: ${response.status} ${response.statusText}`);
    console.log(`   📄 Response body: ${responseText}`);
    
    if (response.ok) {
      console.log('   ✅ OLD endpoint still working');
      try {
        const responseData = JSON.parse(responseText);
        console.log(`   🆔 Resumed agent run ID: ${responseData.id}`);
        console.log(`   📊 Status: ${responseData.status}`);
      } catch (e) {
        // Response might not be JSON
      }
    } else {
      console.log('   ❌ OLD endpoint failed');
    }
  } catch (error) {
    console.log('   ❌ OLD endpoint error:', error.message);
  }
}

// Import fetch for Node.js
import('node-fetch').then(({ default: fetch }) => {
  global.fetch = fetch;
  testResumeEndpoint();
}).catch(() => {
  // Fallback for environments without node-fetch
  console.log('⚠️ Using built-in fetch or curl fallback');
  testResumeEndpoint();
});

