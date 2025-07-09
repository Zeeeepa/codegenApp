#!/usr/bin/env node

const CODEGEN_ORG_ID = '323';
const CODEGEN_TOKEN = 'sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99';
const API_BASE = 'https://api.codegen.com';

async function testEndpoint(url, method = 'GET', body = null) {
  console.log(`\n🧪 Testing ${method} ${url}`);
  
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${CODEGEN_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Endpoint-Validator/1.0'
    }
  };
  
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
    console.log(`📝 Request body: ${JSON.stringify(body, null, 2)}`);
  }
  
  try {
    const response = await fetch(url, options);
    const responseText = await response.text();
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📄 Response: ${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`);
    
    if (response.ok) {
      console.log('✅ Endpoint is working');
      try {
        const data = JSON.parse(responseText);
        return { success: true, data, status: response.status };
      } catch (e) {
        return { success: true, data: responseText, status: response.status };
      }
    } else {
      console.log('❌ Endpoint failed');
      return { success: false, error: responseText, status: response.status };
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
    return { success: false, error: error.message, status: 0 };
  }
}

async function validateCodegenAPI() {
  console.log('🚀 Validating Codegen API Endpoints');
  console.log(`🏢 Organization ID: ${CODEGEN_ORG_ID}`);
  console.log(`🔑 Token: ${CODEGEN_TOKEN.substring(0, 10)}...`);
  console.log(`🌐 API Base: ${API_BASE}`);
  
  const results = {};
  
  // Test 1: Get current user info
  console.log('\n=== 1. Testing User Info Endpoint ===');
  results.userInfo = await testEndpoint(`${API_BASE}/v1/users/me`);
  
  // Test 2: List agent runs
  console.log('\n=== 2. Testing List Agent Runs ===');
  results.listRuns = await testEndpoint(`${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/runs`);
  
  // Test 3: Create agent run
  console.log('\n=== 3. Testing Create Agent Run ===');
  const createPayload = {
    prompt: "This is a test agent run for endpoint validation. Please respond with a simple message."
  };
  results.createRun = await testEndpoint(
    `${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/run`,
    'POST',
    createPayload
  );
  
  let testAgentRunId = null;
  if (results.createRun.success && results.createRun.data && results.createRun.data.id) {
    testAgentRunId = results.createRun.data.id;
    console.log(`🆔 Created agent run ID: ${testAgentRunId}`);
  }
  
  // Test 4: Get specific agent run (if we created one)
  if (testAgentRunId) {
    console.log('\n=== 4. Testing Get Agent Run ===');
    results.getRun = await testEndpoint(`${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/run/${testAgentRunId}`);
  }
  
  // Test 5: Resume agent run - NEW endpoint
  if (testAgentRunId) {
    console.log('\n=== 5. Testing Resume Agent Run (NEW endpoint) ===');
    const resumePayload = {
      prompt: "Continue with the test - this is testing the NEW RESTful endpoint"
    };
    results.resumeNew = await testEndpoint(
      `${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/run/${testAgentRunId}/resume`,
      'POST',
      resumePayload
    );
  }
  
  // Test 6: Resume agent run - BETA endpoint
  if (testAgentRunId) {
    console.log('\n=== 6. Testing Resume Agent Run (BETA endpoint) ===');
    const resumeBetaPayload = {
      agent_run_id: parseInt(testAgentRunId),
      prompt: "Continue with the test - this is testing the BETA endpoint"
    };
    results.resumeBeta = await testEndpoint(
      `${API_BASE}/v1/beta/organizations/${CODEGEN_ORG_ID}/agent/run/resume`,
      'POST',
      resumeBetaPayload
    );
  }
  
  // Test 7: Stop agent run
  if (testAgentRunId) {
    console.log('\n=== 7. Testing Stop Agent Run ===');
    const stopPayload = {
      agent_run_id: parseInt(testAgentRunId)
    };
    results.stopRun = await testEndpoint(
      `${API_BASE}/v1/beta/organizations/${CODEGEN_ORG_ID}/agent/run/stop`,
      'POST',
      stopPayload
    );
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 ENDPOINT VALIDATION SUMMARY');
  console.log('='.repeat(60));
  
  Object.entries(results).forEach(([test, result]) => {
    const status = result.success ? '✅' : '❌';
    const statusCode = result.status || 'N/A';
    console.log(`${status} ${test}: ${statusCode}`);
  });
  
  // Specific analysis for resume endpoints
  console.log('\n🔍 RESUME ENDPOINT ANALYSIS:');
  if (results.resumeNew) {
    console.log(`   NEW endpoint (/agent/run/{id}/resume): ${results.resumeNew.success ? '✅ Working' : '❌ Failed'} (${results.resumeNew.status})`);
  }
  if (results.resumeBeta) {
    console.log(`   BETA endpoint (/beta/.../resume): ${results.resumeBeta.success ? '✅ Working' : '❌ Failed'} (${results.resumeBeta.status})`);
  }
  
  return results;
}

// Import fetch for Node.js environments
async function setupFetch() {
  if (typeof fetch === 'undefined') {
    try {
      const { default: fetch } = await import('node-fetch');
      global.fetch = fetch;
    } catch (error) {
      console.error('❌ Could not import node-fetch. Please install it: npm install node-fetch');
      process.exit(1);
    }
  }
}

// Run the validation
setupFetch().then(() => {
  validateCodegenAPI().catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
});

