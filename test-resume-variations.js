#!/usr/bin/env node

const CODEGEN_ORG_ID = '323';
const CODEGEN_TOKEN = 'sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99';
const API_BASE = 'https://api.codegen.com';

async function testEndpoint(url, method = 'POST', body = null) {
  console.log(`\n🧪 Testing ${method} ${url}`);
  
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${CODEGEN_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Resume-Endpoint-Tester/1.0'
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
    console.log(`📄 Response: ${responseText.substring(0, 300)}${responseText.length > 300 ? '...' : ''}`);
    
    return { success: response.ok, status: response.status, response: responseText };
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
    return { success: false, status: 0, error: error.message };
  }
}

async function testResumeVariations() {
  console.log('🔍 Testing Resume Endpoint Variations');
  console.log(`🏢 Organization ID: ${CODEGEN_ORG_ID}`);
  console.log(`🔑 Token: ${CODEGEN_TOKEN.substring(0, 10)}...`);
  
  // First, let's get an existing agent run to test with
  console.log('\n=== Getting existing agent runs ===');
  const listResponse = await testEndpoint(`${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/runs`, 'GET');
  
  let testRunId = null;
  if (listResponse.success) {
    try {
      const data = JSON.parse(listResponse.response);
      if (data.items && data.items.length > 0) {
        // Find a completed run to test resume with
        const completedRun = data.items.find(run => run.status === 'COMPLETE');
        if (completedRun) {
          testRunId = completedRun.id;
          console.log(`✅ Found completed run to test with: ${testRunId}`);
        } else {
          testRunId = data.items[0].id;
          console.log(`⚠️ Using first available run: ${testRunId} (status: ${data.items[0].status})`);
        }
      }
    } catch (e) {
      console.log('❌ Could not parse agent runs response');
    }
  }
  
  if (!testRunId) {
    console.log('❌ No agent run found to test with');
    return;
  }
  
  const resumePayload = {
    prompt: "Continue with this task - testing resume functionality"
  };
  
  const betaPayload = {
    agent_run_id: parseInt(testRunId),
    prompt: "Continue with this task - testing beta resume functionality"
  };
  
  console.log('\n=== Testing Resume Endpoint Variations ===');
  
  // Test various endpoint formats
  const endpointsToTest = [
    // RESTful variations
    {
      name: 'RESTful v1 (current app)',
      url: `${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/run/${testRunId}/resume`,
      payload: resumePayload
    },
    {
      name: 'RESTful v1 with runs plural',
      url: `${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/runs/${testRunId}/resume`,
      payload: resumePayload
    },
    {
      name: 'RESTful v1 with continue',
      url: `${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/run/${testRunId}/continue`,
      payload: resumePayload
    },
    {
      name: 'RESTful v1 with restart',
      url: `${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/run/${testRunId}/restart`,
      payload: resumePayload
    },
    // Beta variations
    {
      name: 'Beta endpoint (current)',
      url: `${API_BASE}/v1/beta/organizations/${CODEGEN_ORG_ID}/agent/run/resume`,
      payload: betaPayload
    },
    {
      name: 'Beta with runs plural',
      url: `${API_BASE}/v1/beta/organizations/${CODEGEN_ORG_ID}/agent/runs/resume`,
      payload: betaPayload
    },
    // Alpha variations
    {
      name: 'Alpha endpoint',
      url: `${API_BASE}/v1/alpha/organizations/${CODEGEN_ORG_ID}/agent/run/resume`,
      payload: betaPayload
    },
    // Direct variations
    {
      name: 'Direct agent resume',
      url: `${API_BASE}/v1/agent/run/${testRunId}/resume`,
      payload: resumePayload
    },
    {
      name: 'Direct agent resume with org in body',
      url: `${API_BASE}/v1/agent/run/resume`,
      payload: { ...resumePayload, organization_id: parseInt(CODEGEN_ORG_ID), agent_run_id: parseInt(testRunId) }
    }
  ];
  
  const results = [];
  
  for (const endpoint of endpointsToTest) {
    console.log(`\n--- ${endpoint.name} ---`);
    const result = await testEndpoint(endpoint.url, 'POST', endpoint.payload);
    results.push({
      name: endpoint.name,
      url: endpoint.url,
      ...result
    });
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESUME ENDPOINT TESTING SUMMARY');
  console.log('='.repeat(80));
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.status}`);
    if (result.success) {
      console.log(`   URL: ${result.url}`);
    }
  });
  
  const workingEndpoints = results.filter(r => r.success);
  if (workingEndpoints.length > 0) {
    console.log('\n🎉 WORKING ENDPOINTS FOUND:');
    workingEndpoints.forEach(endpoint => {
      console.log(`✅ ${endpoint.name}: ${endpoint.url}`);
    });
  } else {
    console.log('\n❌ NO WORKING RESUME ENDPOINTS FOUND');
    console.log('This suggests that resume functionality might:');
    console.log('1. Not be available for this organization');
    console.log('2. Require different authentication');
    console.log('3. Have a different endpoint format not tested');
    console.log('4. Only work with specific agent run statuses');
  }
}

// Setup and run
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

setupFetch().then(() => {
  testResumeVariations().catch(error => {
    console.error('❌ Testing failed:', error);
    process.exit(1);
  });
});

