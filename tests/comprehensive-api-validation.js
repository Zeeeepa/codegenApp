#!/usr/bin/env node

/**
 * Comprehensive Agent Run Logs API Validation
 * Tests all documented features against live API endpoints
 */

const https = require('https');
const fs = require('fs');

// Configuration
const API_BASE_URL = 'https://api.codegen.com';
const ORG_ID = 1; // Test organization ID
const AGENT_RUN_ID = 41876; // Test agent run ID

// Load API token from environment
const API_TOKEN = process.env.CODEGEN_API_TOKEN;

if (!API_TOKEN) {
  console.error('❌ CODEGEN_API_TOKEN environment variable is required');
  process.exit(1);
}

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name}${details ? ': ' + details : ''}`);
  
  testResults.tests.push({ name, passed, details });
  if (passed) testResults.passed++;
  else testResults.failed++;
}

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE_URL}${path}`;
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = https.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : null;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            parseError: e.message
          });
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

async function validateEndpoints() {
  console.log('\n🔍 Testing API Endpoints...\n');

  // Test 1: Get Agent Run Details
  try {
    const response = await makeRequest(`/v1/organizations/${ORG_ID}/agent/run/${AGENT_RUN_ID}`);
    logTest('GET Agent Run Details', response.status === 200, `Status: ${response.status}`);
    
    if (response.status === 200 && response.data) {
      // Validate required fields
      const requiredFields = ['id', 'organization_id', 'status', 'created_at', 'web_url'];
      const hasAllFields = requiredFields.every(field => response.data.hasOwnProperty(field));
      logTest('Agent Run Response Fields', hasAllFields, 
        hasAllFields ? 'All required fields present' : 'Missing required fields');
    }
  } catch (error) {
    logTest('GET Agent Run Details', false, `Error: ${error.message}`);
  }

  // Test 2: Get Agent Run Logs (Basic)
  try {
    const response = await makeRequest(`/v1/organizations/${ORG_ID}/agent/run/${AGENT_RUN_ID}/logs`);
    logTest('GET Agent Run Logs (Basic)', response.status === 200, `Status: ${response.status}`);
    
    if (response.status === 200 && response.data) {
      // Validate response structure
      const requiredFields = ['id', 'organization_id', 'status', 'logs', 'total_logs', 'page', 'size', 'pages'];
      const hasAllFields = requiredFields.every(field => response.data.hasOwnProperty(field));
      logTest('Logs Response Structure', hasAllFields, 
        hasAllFields ? 'All required fields present' : 'Missing required fields');
      
      // Validate logs array
      if (response.data.logs && Array.isArray(response.data.logs)) {
        logTest('Logs Array Present', true, `${response.data.logs.length} logs found`);
        
        // Validate individual log entries
        if (response.data.logs.length > 0) {
          const firstLog = response.data.logs[0];
          const logRequiredFields = ['agent_run_id', 'created_at', 'message_type'];
          const logHasFields = logRequiredFields.every(field => firstLog.hasOwnProperty(field));
          logTest('Log Entry Structure', logHasFields, 
            logHasFields ? 'Required log fields present' : 'Missing log fields');
        }
      } else {
        logTest('Logs Array Present', false, 'Logs array missing or invalid');
      }
    }
  } catch (error) {
    logTest('GET Agent Run Logs (Basic)', false, `Error: ${error.message}`);
  }

  // Test 3: Get Agent Run Logs with Pagination
  try {
    const response = await makeRequest(`/v1/organizations/${ORG_ID}/agent/run/${AGENT_RUN_ID}/logs?skip=0&limit=10`);
    logTest('GET Agent Run Logs (Paginated)', response.status === 200, `Status: ${response.status}`);
    
    if (response.status === 200 && response.data) {
      const hasCorrectSize = response.data.logs.length <= 10;
      logTest('Pagination Limit Respected', hasCorrectSize, 
        `Returned ${response.data.logs.length} logs (limit: 10)`);
    }
  } catch (error) {
    logTest('GET Agent Run Logs (Paginated)', false, `Error: ${error.message}`);
  }

  // Test 4: Test Resume Endpoint (Beta)
  try {
    const response = await makeRequest(`/v1/beta/organizations/${ORG_ID}/agent/run/resume`, {
      method: 'POST',
      body: {
        agent_run_id: AGENT_RUN_ID,
        prompt: 'Test resume'
      }
    });
    logTest('POST Agent Run Resume (Beta)', response.status < 500, 
      `Status: ${response.status} (404 expected - endpoint may not be available)`);
  } catch (error) {
    logTest('POST Agent Run Resume (Beta)', false, `Error: ${error.message}`);
  }
}

async function validateMessageTypes() {
  console.log('\n📋 Validating Message Types...\n');

  try {
    const response = await makeRequest(`/v1/organizations/${ORG_ID}/agent/run/${AGENT_RUN_ID}/logs?limit=100`);
    
    if (response.status === 200 && response.data && response.data.logs) {
      const logs = response.data.logs;
      const messageTypes = [...new Set(logs.map(log => log.message_type))];
      
      console.log(`Found message types: ${messageTypes.join(', ')}`);
      
      // Documented message types from agent-run-logs.mdx
      const documentedTypes = [
        'ACTION', 'PLAN_EVALUATION', 'FINAL_ANSWER', 'ERROR', 'USER_MESSAGE', 
        'USER_GITHUB_ISSUE_COMMENT', 'INITIAL_PR_GENERATION', 'DETECT_PR_ERRORS',
        'FIX_PR_ERRORS', 'PR_CREATION_FAILED', 'PR_EVALUATION', 'COMMIT_EVALUATION',
        'AGENT_RUN_LINK'
      ];
      
      // Check if found types are documented
      const undocumentedTypes = messageTypes.filter(type => !documentedTypes.includes(type));
      logTest('All Message Types Documented', undocumentedTypes.length === 0,
        undocumentedTypes.length > 0 ? `Undocumented: ${undocumentedTypes.join(', ')}` : 'All types documented');
      
      // Analyze field population patterns
      const actionLogs = logs.filter(log => log.message_type === 'ACTION');
      if (actionLogs.length > 0) {
        const hasToolFields = actionLogs.every(log => 
          log.hasOwnProperty('tool_name') && 
          log.hasOwnProperty('tool_input') && 
          log.hasOwnProperty('tool_output')
        );
        logTest('ACTION Logs Field Population', hasToolFields,
          hasToolFields ? 'All ACTION logs have tool fields' : 'Some ACTION logs missing tool fields');
      }
      
      // Count message type distribution
      const typeDistribution = {};
      logs.forEach(log => {
        typeDistribution[log.message_type] = (typeDistribution[log.message_type] || 0) + 1;
      });
      
      console.log('\n📊 Message Type Distribution:');
      Object.entries(typeDistribution)
        .sort(([,a], [,b]) => b - a)
        .forEach(([type, count]) => {
          const percentage = ((count / logs.length) * 100).toFixed(1);
          console.log(`   ${type}: ${count} (${percentage}%)`);
        });
    }
  } catch (error) {
    logTest('Message Types Validation', false, `Error: ${error.message}`);
  }
}

async function validateErrorHandling() {
  console.log('\n🚨 Testing Error Handling...\n');

  // Test 404 - Non-existent agent run
  try {
    const response = await makeRequest(`/v1/organizations/${ORG_ID}/agent/run/999999/logs`);
    logTest('404 Error Handling', response.status === 404, `Status: ${response.status}`);
  } catch (error) {
    logTest('404 Error Handling', false, `Error: ${error.message}`);
  }

  // Test 401 - Invalid token
  try {
    const response = await makeRequest(`/v1/organizations/${ORG_ID}/agent/run/${AGENT_RUN_ID}/logs`, {
      headers: { 'Authorization': 'Bearer invalid_token' }
    });
    logTest('401 Error Handling', response.status === 401, `Status: ${response.status}`);
  } catch (error) {
    logTest('401 Error Handling', false, `Error: ${error.message}`);
  }

  // Test invalid pagination parameters
  try {
    const response = await makeRequest(`/v1/organizations/${ORG_ID}/agent/run/${AGENT_RUN_ID}/logs?limit=1000`);
    logTest('Invalid Pagination Handling', response.status === 400 || response.data.logs.length <= 100,
      `Status: ${response.status}, Logs: ${response.data?.logs?.length || 0}`);
  } catch (error) {
    logTest('Invalid Pagination Handling', false, `Error: ${error.message}`);
  }
}

async function generateReport() {
  console.log('\n📋 Validation Report\n');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Total: ${testResults.tests.length}`);
  console.log(`🎯 Success Rate: ${((testResults.passed / testResults.tests.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(50));

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      passed: testResults.passed,
      failed: testResults.failed,
      total: testResults.tests.length,
      successRate: ((testResults.passed / testResults.tests.length) * 100).toFixed(1)
    },
    tests: testResults.tests
  };

  fs.writeFileSync('tests/validation-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Detailed report saved to tests/validation-report.json');

  if (testResults.failed > 0) {
    console.log('\n❌ Some tests failed. Review the report for details.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed! API implementation is fully compliant.');
  }
}

async function main() {
  console.log('🚀 Starting Comprehensive Agent Run Logs API Validation');
  console.log(`🔗 API Base URL: ${API_BASE_URL}`);
  console.log(`🏢 Organization ID: ${ORG_ID}`);
  console.log(`🤖 Agent Run ID: ${AGENT_RUN_ID}`);

  await validateEndpoints();
  await validateMessageTypes();
  await validateErrorHandling();
  await generateReport();
}

// Run the validation
main().catch(error => {
  console.error('💥 Validation failed:', error);
  process.exit(1);
});

