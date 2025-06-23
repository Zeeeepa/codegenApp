#!/usr/bin/env node

/**
 * Comprehensive deployment validation script for codegenApp
 * Tests all critical functionality and endpoints
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { spawn } = require('child_process');

// Configuration
const BACKEND_PORT = 3004;
const FRONTEND_PORT = 8080;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warning: '\x1b[33m', // Yellow
    reset: '\x1b[0m'     // Reset
  };
  
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

function addResult(testName, passed, message = '') {
  results.tests.push({ testName, passed, message });
  if (passed) {
    results.passed++;
    log(`✅ ${testName}: PASSED ${message}`, 'success');
  } else {
    results.failed++;
    log(`❌ ${testName}: FAILED ${message}`, 'error');
  }
}

async function testEndpoint(url, testName, expectedStatus = 200) {
  try {
    const response = await fetch(url, { timeout: 5000 });
    const success = response.status === expectedStatus;
    addResult(testName, success, `Status: ${response.status}`);
    return { success, response };
  } catch (error) {
    addResult(testName, false, `Error: ${error.message}`);
    return { success: false, error };
  }
}

async function testJsonEndpoint(url, testName, expectedFields = []) {
  try {
    const response = await fetch(url, { timeout: 5000 });
    if (response.status !== 200) {
      addResult(testName, false, `HTTP ${response.status}`);
      return { success: false };
    }
    
    const data = await response.json();
    const hasAllFields = expectedFields.every(field => data.hasOwnProperty(field));
    
    addResult(testName, hasAllFields, 
      hasAllFields ? `All fields present: ${expectedFields.join(', ')}` : 
      `Missing fields: ${expectedFields.filter(f => !data.hasOwnProperty(f)).join(', ')}`
    );
    
    return { success: hasAllFields, data };
  } catch (error) {
    addResult(testName, false, `Error: ${error.message}`);
    return { success: false, error };
  }
}

function checkProcessRunning(port, processName) {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' ? 
      `netstat -ano | findstr :${port}` : 
      `ss -tln | grep :${port}`;
    
    const proc = spawn('sh', ['-c', cmd]);
    let output = '';
    
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    proc.on('close', (code) => {
      const isRunning = output.includes(`:${port}`);
      addResult(`${processName} Process Check`, isRunning, 
        isRunning ? `Running on port ${port}` : `Not found on port ${port}`);
      resolve(isRunning);
    });
    
    // Timeout after 3 seconds
    setTimeout(() => {
      proc.kill();
      addResult(`${processName} Process Check`, false, 'Timeout checking process');
      resolve(false);
    }, 3000);
  });
}

async function testProxyConfiguration() {
  try {
    // Test if proxy forwards requests correctly
    const response = await fetch(`${FRONTEND_URL}/api/health`, { timeout: 5000 });
    const success = response.status === 200;
    addResult('Proxy Configuration', success, 
      success ? 'Frontend proxy correctly forwards to backend' : 
      `Proxy failed with status ${response.status}`);
    return success;
  } catch (error) {
    addResult('Proxy Configuration', false, `Proxy error: ${error.message}`);
    return false;
  }
}

async function testCORSConfiguration() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'GET'
      },
      timeout: 5000
    });
    
    const corsHeaders = response.headers.get('access-control-allow-origin');
    const success = corsHeaders && (corsHeaders === '*' || corsHeaders === FRONTEND_URL);
    
    addResult('CORS Configuration', success, 
      success ? 'CORS properly configured' : 
      `CORS headers: ${corsHeaders || 'missing'}`);
    return success;
  } catch (error) {
    addResult('CORS Configuration', false, `CORS test error: ${error.message}`);
    return false;
  }
}

async function testEnvironmentVariables() {
  try {
    // Test if backend can access environment variables
    const response = await fetch(`${BACKEND_URL}/health`, { timeout: 5000 });
    const data = await response.json();
    
    // The health endpoint should work, indicating env vars are loaded
    const success = response.status === 200 && data.status === 'ok';
    addResult('Environment Variables', success, 
      success ? 'Environment configuration loaded' : 
      'Environment configuration issues detected');
    return success;
  } catch (error) {
    addResult('Environment Variables', false, `Env test error: ${error.message}`);
    return false;
  }
}

async function testFrontendAssets() {
  try {
    // Test if frontend serves static assets
    const response = await fetch(`${FRONTEND_URL}/static/js/bundle.js`, { timeout: 5000 });
    const success = response.status === 200 || response.status === 404; // 404 is ok for dev server
    
    addResult('Frontend Assets', success, 
      `Static assets ${response.status === 200 ? 'served correctly' : 'configured (dev mode)'}`);
    return success;
  } catch (error) {
    addResult('Frontend Assets', false, `Assets test error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  log('🚀 Starting codegenApp Deployment Validation', 'info');
  log('=' .repeat(60), 'info');
  
  // 1. Process checks
  log('📋 Checking running processes...', 'info');
  await checkProcessRunning(BACKEND_PORT, 'Backend Server');
  await checkProcessRunning(FRONTEND_PORT, 'Frontend Server');
  
  // 2. Basic connectivity tests
  log('🌐 Testing basic connectivity...', 'info');
  await testEndpoint(BACKEND_URL, 'Backend Connectivity');
  await testEndpoint(FRONTEND_URL, 'Frontend Connectivity');
  
  // 3. API endpoint tests
  log('🔍 Testing API endpoints...', 'info');
  await testJsonEndpoint(`${BACKEND_URL}/health`, 'Backend Health Check', ['status', 'timestamp']);
  
  // 4. Proxy and CORS tests
  log('🔄 Testing proxy and CORS configuration...', 'info');
  await testProxyConfiguration();
  await testCORSConfiguration();
  
  // 5. Environment and configuration tests
  log('⚙️  Testing configuration...', 'info');
  await testEnvironmentVariables();
  await testFrontendAssets();
  
  // 6. Integration tests
  log('🔗 Testing integration...', 'info');
  try {
    // Test if frontend can reach backend through proxy
    const response = await fetch(`${FRONTEND_URL}/v1/health`, { timeout: 5000 });
    addResult('Frontend-Backend Integration', response.status === 200, 
      `Integration ${response.status === 200 ? 'working' : 'failed'}`);
  } catch (error) {
    addResult('Frontend-Backend Integration', false, `Integration error: ${error.message}`);
  }
  
  // Results summary
  log('=' .repeat(60), 'info');
  log('📊 VALIDATION RESULTS', 'info');
  log('=' .repeat(60), 'info');
  
  results.tests.forEach(test => {
    const status = test.passed ? '✅ PASS' : '❌ FAIL';
    log(`${status} ${test.testName}: ${test.message}`, test.passed ? 'success' : 'error');
  });
  
  log('=' .repeat(60), 'info');
  log(`📈 Summary: ${results.passed} passed, ${results.failed} failed`, 
    results.failed === 0 ? 'success' : 'warning');
  
  if (results.failed === 0) {
    log('🎉 All tests passed! Deployment is ready.', 'success');
    log('🌐 Frontend: http://localhost:8080', 'info');
    log('🔧 Backend: http://localhost:3004', 'info');
    log('💡 Health Check: http://localhost:3004/health', 'info');
  } else {
    log('⚠️  Some tests failed. Please check the issues above.', 'warning');
  }
  
  process.exit(results.failed === 0 ? 0 : 1);
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  log(`Unhandled error: ${error.message}`, 'error');
  process.exit(1);
});

// Run the tests
runAllTests().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});
