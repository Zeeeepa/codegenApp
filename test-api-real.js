#!/usr/bin/env node

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

const API_BASE = 'http://localhost:3001/api/v1';
const ORG_ID = process.env.CODEGEN_ORG_ID || '323';
const API_TOKEN = process.env.CODEGEN_API_TOKEN || 'sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99';

console.log('🧪 Testing API endpoints with REAL credentials...\n');
console.log(`🏢 Organization ID: ${ORG_ID}`);
console.log(`🔑 API Token: ${API_TOKEN.substring(0, 15)}...`);
console.log(`🌐 API Base: ${API_BASE}\n`);

async function testEndpoint(name, url, options = {}) {
  try {
    console.log(`🔄 Testing ${name}...`);
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      },
      ...options
    });

    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (response.ok) {
      console.log(`✅ ${name}: SUCCESS (${response.status})`);
      if (typeof data === 'object') {
        console.log(`📊 Response:`, JSON.stringify(data, null, 2).substring(0, 500) + (JSON.stringify(data).length > 500 ? '...' : ''));
      } else {
        console.log(`📄 Response:`, data.substring(0, 200) + (data.length > 200 ? '...' : ''));
      }
    } else {
      console.log(`❌ ${name}: FAILED (${response.status})`);
      console.log(`📄 Error:`, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
    }
    
    console.log(''); // Empty line for readability
    return { success: response.ok, status: response.status, data };
    
  } catch (error) {
    console.log(`💥 ${name}: ERROR`);
    console.log(`📄 Error:`, error.message);
    console.log(''); // Empty line for readability
    return { success: false, error: error.message };
  }
}

async function runTests() {
  const results = {};
  
  // Test 1: Health Check (no auth needed)
  results.health = await testEndpoint(
    'Health Check', 
    'http://localhost:3001/health'
  );

  // Test 2: User Info
  results.user = await testEndpoint(
    'User Info', 
    `${API_BASE}/user`
  );

  // Test 3: Organizations
  results.organizations = await testEndpoint(
    'Organizations', 
    `${API_BASE}/organizations`
  );

  // Test 4: Specific Organization
  results.organization = await testEndpoint(
    `Organization ${ORG_ID}`, 
    `${API_BASE}/organizations/${ORG_ID}`
  );

  // Test 5: Agent Runs for Organization
  results.agentRuns = await testEndpoint(
    'Agent Runs', 
    `${API_BASE}/organizations/${ORG_ID}/agent_runs?limit=5`
  );

  // Test 6: Agent Run Details (if we have any runs)
  if (results.agentRuns.success && results.agentRuns.data && results.agentRuns.data.data && results.agentRuns.data.data.length > 0) {
    const firstRunId = results.agentRuns.data.data[0].id;
    results.agentRunDetails = await testEndpoint(
      `Agent Run Details`, 
      `${API_BASE}/organizations/${ORG_ID}/agent_runs/${firstRunId}`
    );
  }

  // Summary
  console.log('📋 TEST SUMMARY:');
  console.log('================');
  
  const successCount = Object.values(results).filter(r => r.success).length;
  const totalCount = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, result]) => {
    const status = result.success ? '✅' : '❌';
    const statusCode = result.status ? ` (${result.status})` : '';
    console.log(`${status} ${test}${statusCode}`);
  });
  
  console.log(`\n🎯 Success Rate: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`);
  
  if (successCount === totalCount) {
    console.log('\n🎉 ALL TESTS PASSED! API is fully functional with real credentials! 🚀');
  } else if (successCount > 0) {
    console.log('\n⚠️  Some tests passed. API is partially functional.');
  } else {
    console.log('\n💥 All tests failed. Check credentials and server status.');
  }
  
  return results;
}

// Run the tests
runTests().catch(console.error);
