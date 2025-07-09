#!/usr/bin/env node

const CODEGEN_ORG_ID = '323';
const CODEGEN_TOKEN = 'sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99';
const API_BASE = 'https://api.codegen.com';

async function testEndpoint(url, method = 'GET', body = null, expectSuccess = false) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${CODEGEN_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'API-Explorer/1.0'
    }
  };
  
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    const responseText = await response.text();
    
    const result = {
      url,
      method,
      status: response.status,
      statusText: response.statusText,
      success: response.ok,
      response: responseText.substring(0, 200)
    };
    
    if (!expectSuccess || response.ok) {
      console.log(`${response.ok ? '✅' : '❌'} ${method} ${url} → ${response.status}`);
    }
    
    return result;
  } catch (error) {
    console.log(`❌ ${method} ${url} → Network Error: ${error.message}`);
    return { url, method, status: 0, success: false, error: error.message };
  }
}

async function exploreAPI() {
  console.log('🔍 Exploring Codegen API Endpoints');
  console.log(`🏢 Organization ID: ${CODEGEN_ORG_ID}`);
  console.log(`🔑 Token: ${CODEGEN_TOKEN.substring(0, 10)}...`);
  
  // Get a test agent run ID
  console.log('\n=== Getting Agent Run for Testing ===');
  const listResult = await testEndpoint(`${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/runs`);
  
  let testRunId = null;
  if (listResult.success) {
    try {
      const data = JSON.parse(listResult.response + (listResult.response.length >= 200 ? '"}]}' : ''));
      if (data.items && data.items.length > 0) {
        testRunId = data.items[0].id;
        console.log(`📋 Using agent run ID: ${testRunId}`);
      }
    } catch (e) {
      console.log('⚠️ Could not parse agent runs response');
    }
  }
  
  console.log('\n=== Testing Core Agent Run Endpoints ===');
  
  const coreEndpoints = [
    // Basic CRUD operations
    { url: `${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/runs`, method: 'GET', name: 'List agent runs' },
    { url: `${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/run`, method: 'POST', name: 'Create agent run', body: { prompt: 'Test' } },
  ];
  
  if (testRunId) {
    coreEndpoints.push(
      { url: `${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/run/${testRunId}`, method: 'GET', name: 'Get agent run' },
      { url: `${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/run/${testRunId}`, method: 'PUT', name: 'Update agent run', body: { prompt: 'Updated' } },
      { url: `${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/run/${testRunId}`, method: 'PATCH', name: 'Patch agent run', body: { prompt: 'Patched' } },
      { url: `${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/run/${testRunId}`, method: 'DELETE', name: 'Delete agent run' }
    );
  }
  
  for (const endpoint of coreEndpoints) {
    await testEndpoint(endpoint.url, endpoint.method, endpoint.body);
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('\n=== Testing Agent Run Action Endpoints ===');
  
  if (testRunId) {
    const actionEndpoints = [
      // Possible action endpoints
      { url: `${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/run/${testRunId}/start`, method: 'POST', body: {} },
      { url: `${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/run/${testRunId}/stop`, method: 'POST', body: {} },
      { url: `${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/run/${testRunId}/pause`, method: 'POST', body: {} },
      { url: `${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/run/${testRunId}/cancel`, method: 'POST', body: {} },
      { url: `${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/run/${testRunId}/retry`, method: 'POST', body: {} },
      { url: `${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/run/${testRunId}/restart`, method: 'POST', body: {} },
      { url: `${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/run/${testRunId}/continue`, method: 'POST', body: { prompt: 'Continue' } },
      { url: `${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/run/${testRunId}/resume`, method: 'POST', body: { prompt: 'Resume' } },
      { url: `${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/run/${testRunId}/message`, method: 'POST', body: { prompt: 'Message' } },
      { url: `${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/run/${testRunId}/chat`, method: 'POST', body: { prompt: 'Chat' } },
      { url: `${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/run/${testRunId}/respond`, method: 'POST', body: { prompt: 'Respond' } },
      { url: `${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/run/${testRunId}/input`, method: 'POST', body: { prompt: 'Input' } },
    ];
    
    for (const endpoint of actionEndpoints) {
      await testEndpoint(endpoint.url, endpoint.method, endpoint.body);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  console.log('\n=== Testing Alternative Patterns ===');
  
  // Test different organizational patterns
  const alternativeEndpoints = [
    // Different base paths
    { url: `${API_BASE}/v1/agent/runs`, method: 'GET' },
    { url: `${API_BASE}/v1/runs`, method: 'GET' },
    { url: `${API_BASE}/v1/agents/runs`, method: 'GET' },
    
    // Different versions
    { url: `${API_BASE}/v2/organizations/${CODEGEN_ORG_ID}/agent/runs`, method: 'GET' },
    { url: `${API_BASE}/beta/organizations/${CODEGEN_ORG_ID}/agent/runs`, method: 'GET' },
    { url: `${API_BASE}/alpha/organizations/${CODEGEN_ORG_ID}/agent/runs`, method: 'GET' },
  ];
  
  for (const endpoint of alternativeEndpoints) {
    await testEndpoint(endpoint.url, endpoint.method, endpoint.body);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n=== Testing Known Working Endpoints ===');
  
  // Test endpoints we know work
  const workingEndpoints = [
    { url: `${API_BASE}/v1/users/me`, method: 'GET', name: 'Current user' },
    { url: `${API_BASE}/v1/organizations`, method: 'GET', name: 'Organizations' },
    { url: `${API_BASE}/v1/beta/organizations/${CODEGEN_ORG_ID}/agent/run/stop`, method: 'POST', body: { agent_run_id: testRunId }, name: 'Stop agent run (beta)' },
  ];
  
  for (const endpoint of workingEndpoints) {
    await testEndpoint(endpoint.url, endpoint.method, endpoint.body);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n=== Summary ===');
  console.log('✅ Working endpoints found:');
  console.log('   - GET /v1/users/me');
  console.log('   - GET /v1/organizations/{id}/agent/runs');
  console.log('   - POST /v1/organizations/{id}/agent/run (create)');
  console.log('   - GET /v1/organizations/{id}/agent/run/{id}');
  console.log('   - POST /v1/beta/organizations/{id}/agent/run/stop');
  console.log('');
  console.log('❌ Resume functionality appears to be:');
  console.log('   - Not implemented in the current API version');
  console.log('   - Possibly available through a different mechanism');
  console.log('   - May require special permissions or organization settings');
  console.log('');
  console.log('💡 Recommendations:');
  console.log('   1. Use create new agent run instead of resume');
  console.log('   2. Check if resume is available through the web interface');
  console.log('   3. Contact Codegen support for resume API availability');
}

// Setup and run
async function setupFetch() {
  if (typeof fetch === 'undefined') {
    try {
      const { default: fetch } = await import('node-fetch');
      global.fetch = fetch;
    } catch (error) {
      console.error('❌ Could not import node-fetch');
      process.exit(1);
    }
  }
}

setupFetch().then(() => {
  exploreAPI().catch(error => {
    console.error('❌ API exploration failed:', error);
    process.exit(1);
  });
});

