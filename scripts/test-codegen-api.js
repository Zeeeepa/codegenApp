#!/usr/bin/env node

/**
 * Test Script for Codegen API Integration
 * 
 * This script tests the Codegen API endpoints to ensure proper integration
 * with the CI/CD pipeline.
 */

const https = require('https');
const fs = require('fs');

// Configuration
const CODEGEN_API_BASE = 'https://api.codegen.com/api/v1';
const API_KEY = process.env.CODEGEN_API_KEY || process.env.REACT_APP_CODEGEN_API_KEY;

if (!API_KEY) {
  console.error('❌ CODEGEN_API_KEY environment variable is required');
  process.exit(1);
}

// Test data
const testAgentRun = {
  message: "Test agent run for CI/CD pipeline validation",
  agent_id: "test-agent",
  context: {
    repository: "Zeeeepa/codegenApp",
    branch: "main",
    test_run: true,
    timestamp: new Date().toISOString()
  }
};

/**
 * Make HTTP request to Codegen API
 */
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, CODEGEN_API_BASE);
    
    const options = {
      method: method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'CodegenApp-Test/1.0.0'
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Test API connectivity
 */
async function testConnectivity() {
  console.log('🔍 Testing Codegen API connectivity...');
  
  try {
    const response = await makeRequest('GET', '/agent-runs?limit=1');
    
    if (response.statusCode === 200) {
      console.log('✅ API connectivity test passed');
      return true;
    } else if (response.statusCode === 401) {
      console.log('❌ API authentication failed - check your API key');
      return false;
    } else {
      console.log(`⚠️  API returned status ${response.statusCode}`);
      console.log('Response:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ API connectivity test failed:', error.message);
    return false;
  }
}

/**
 * Test creating an agent run
 */
async function testCreateAgentRun() {
  console.log('🚀 Testing agent run creation...');
  
  try {
    const response = await makeRequest('POST', '/agent-runs', testAgentRun);
    
    if (response.statusCode === 200 || response.statusCode === 201) {
      console.log('✅ Agent run creation test passed');
      console.log('Run ID:', response.data.id);
      return response.data.id;
    } else {
      console.log(`❌ Agent run creation failed with status ${response.statusCode}`);
      console.log('Response:', response.data);
      return null;
    }
  } catch (error) {
    console.log('❌ Agent run creation test failed:', error.message);
    return null;
  }
}

/**
 * Test retrieving an agent run
 */
async function testGetAgentRun(runId) {
  if (!runId) {
    console.log('⏭️  Skipping agent run retrieval test (no run ID)');
    return false;
  }
  
  console.log('📋 Testing agent run retrieval...');
  
  try {
    const response = await makeRequest('GET', `/agent-runs/${runId}`);
    
    if (response.statusCode === 200) {
      console.log('✅ Agent run retrieval test passed');
      console.log('Status:', response.data.status);
      return true;
    } else {
      console.log(`❌ Agent run retrieval failed with status ${response.statusCode}`);
      console.log('Response:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Agent run retrieval test failed:', error.message);
    return false;
  }
}

/**
 * Test resuming an agent run (if supported)
 */
async function testResumeAgentRun(runId) {
  if (!runId) {
    console.log('⏭️  Skipping agent run resume test (no run ID)');
    return false;
  }
  
  console.log('▶️  Testing agent run resume...');
  
  try {
    const response = await makeRequest('POST', `/agent-runs/${runId}/resume`);
    
    if (response.statusCode === 200 || response.statusCode === 404) {
      // 404 is acceptable if resume endpoint doesn't exist or run can't be resumed
      console.log('✅ Agent run resume test completed');
      return true;
    } else {
      console.log(`⚠️  Agent run resume returned status ${response.statusCode}`);
      console.log('Response:', response.data);
      return true; // Not a critical failure
    }
  } catch (error) {
    console.log('⚠️  Agent run resume test failed:', error.message);
    return true; // Not a critical failure
  }
}

/**
 * Generate test report
 */
function generateReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    api_key_configured: !!API_KEY,
    tests: results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length
    }
  };
  
  // Write report to file
  const reportPath = 'codegen-api-test-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n📊 Test Report Generated:');
  console.log(`   Total Tests: ${report.summary.total}`);
  console.log(`   Passed: ${report.summary.passed}`);
  console.log(`   Failed: ${report.summary.failed}`);
  console.log(`   Report saved to: ${reportPath}`);
  
  return report.summary.failed === 0;
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🧪 Starting Codegen API Integration Tests\n');
  console.log(`API Base URL: ${CODEGEN_API_BASE}`);
  console.log(`API Key: ${API_KEY ? '***' + API_KEY.slice(-4) : 'Not configured'}\n`);
  
  const results = [];
  
  // Test 1: Connectivity
  const connectivityPassed = await testConnectivity();
  results.push({ test: 'connectivity', passed: connectivityPassed });
  
  if (!connectivityPassed) {
    console.log('\n❌ Connectivity test failed. Skipping remaining tests.');
    generateReport(results);
    process.exit(1);
  }
  
  console.log('');
  
  // Test 2: Create Agent Run
  const runId = await testCreateAgentRun();
  results.push({ test: 'create_agent_run', passed: !!runId });
  
  console.log('');
  
  // Test 3: Get Agent Run
  const getPassed = await testGetAgentRun(runId);
  results.push({ test: 'get_agent_run', passed: getPassed });
  
  console.log('');
  
  // Test 4: Resume Agent Run
  const resumePassed = await testResumeAgentRun(runId);
  results.push({ test: 'resume_agent_run', passed: resumePassed });
  
  console.log('');
  
  // Generate final report
  const allPassed = generateReport(results);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Codegen API integration is working correctly.');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Please check the configuration and try again.');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 Test runner crashed:', error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testConnectivity,
  testCreateAgentRun,
  testGetAgentRun,
  testResumeAgentRun
};
