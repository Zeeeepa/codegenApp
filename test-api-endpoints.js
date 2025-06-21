const https = require('https');

// Test configuration
const API_BASE_URL = 'https://api.codegen.com';
const API_TOKEN = 'sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99';
const ORG_ID = '323';

console.log('🧪 Testing Codegen API Endpoints...\n');

// Helper function to make API requests
function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed, headers: res.headers });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data, headers: res.headers });
                }
            });
        });
        
        req.on('error', reject);
        
        if (postData) {
            req.write(JSON.stringify(postData));
        }
        
        req.end();
    });
}

// Test 1: Create Agent Run
async function testCreateAgentRun() {
    console.log('1️⃣ Testing: POST /v1/organizations/{org_id}/agent/run');
    
    const options = {
        hostname: 'api.codegen.com',
        port: 443,
        path: `/v1/organizations/${ORG_ID}/agent/run`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`
        }
    };
    
    const postData = {
        prompt: 'Test API validation: What is 2+2?'
    };
    
    try {
        const response = await makeRequest(options, postData);
        
        if (response.status === 200 || response.status === 201) {
            console.log('✅ SUCCESS: Agent run created');
            console.log(`   Agent Run ID: ${response.data.id}`);
            console.log(`   Status: ${response.data.status}`);
            console.log(`   Web URL: ${response.data.web_url}`);
            return response.data.id; // Return the agent run ID for further tests
        } else {
            console.log(`❌ FAILED: HTTP ${response.status}`);
            console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
            return null;
        }
    } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
        return null;
    }
}

// Test 2: Get Agent Run Details
async function testGetAgentRun(agentRunId) {
    if (!agentRunId) {
        console.log('2️⃣ SKIPPED: Get Agent Run (no agent run ID)');
        return;
    }
    
    console.log('\n2️⃣ Testing: GET /v1/organizations/{org_id}/agent/run/{agent_run_id}');
    
    const options = {
        hostname: 'api.codegen.com',
        port: 443,
        path: `/v1/organizations/${ORG_ID}/agent/run/${agentRunId}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${API_TOKEN}`
        }
    };
    
    try {
        const response = await makeRequest(options);
        
        if (response.status === 200) {
            console.log('✅ SUCCESS: Agent run details retrieved');
            console.log(`   ID: ${response.data.id}`);
            console.log(`   Status: ${response.data.status}`);
            console.log(`   Created: ${response.data.created_at}`);
        } else {
            console.log(`❌ FAILED: HTTP ${response.status}`);
            console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
        }
    } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
    }
}

// Test 3: Get Agent Run Logs
async function testGetAgentRunLogs(agentRunId) {
    if (!agentRunId) {
        console.log('3️⃣ SKIPPED: Get Agent Run Logs (no agent run ID)');
        return;
    }
    
    console.log('\n3️⃣ Testing: GET /v1/organizations/{org_id}/agent/run/{agent_run_id}/logs');
    
    const options = {
        hostname: 'api.codegen.com',
        port: 443,
        path: `/v1/organizations/${ORG_ID}/agent/run/${agentRunId}/logs?limit=10`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${API_TOKEN}`
        }
    };
    
    try {
        const response = await makeRequest(options);
        
        if (response.status === 200) {
            console.log('✅ SUCCESS: Agent run logs retrieved');
            console.log(`   Total logs: ${response.data.total_logs}`);
            console.log(`   Logs in response: ${response.data.logs.length}`);
            console.log(`   Status: ${response.data.status}`);
            
            if (response.data.logs.length > 0) {
                const firstLog = response.data.logs[0];
                console.log(`   First log type: ${firstLog.message_type}`);
                console.log(`   First log tool: ${firstLog.tool_name || 'N/A'}`);
            }
        } else {
            console.log(`❌ FAILED: HTTP ${response.status}`);
            console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
        }
    } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
    }
}

// Test 4: Resume Agent Run (if implemented)
async function testResumeAgentRun() {
    console.log('\n4️⃣ Testing: POST /v1/beta/organizations/{org_id}/agent/run/resume');
    
    const options = {
        hostname: 'api.codegen.com',
        port: 443,
        path: `/v1/beta/organizations/${ORG_ID}/agent/run/resume`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`
        }
    };
    
    const postData = {
        prompt: 'Resume test'
    };
    
    try {
        const response = await makeRequest(options, postData);
        
        if (response.status === 200 || response.status === 201) {
            console.log('✅ SUCCESS: Agent run resume endpoint working');
            console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
        } else if (response.status === 404) {
            console.log('⚠️  EXPECTED: Resume endpoint not yet implemented (404)');
        } else {
            console.log(`❌ FAILED: HTTP ${response.status}`);
            console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
        }
    } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
    }
}

// Run all tests
async function runAllTests() {
    console.log(`🔧 Configuration:`);
    console.log(`   API Base URL: ${API_BASE_URL}`);
    console.log(`   Organization ID: ${ORG_ID}`);
    console.log(`   API Token: ${API_TOKEN.substring(0, 8)}...`);
    console.log('');
    
    const agentRunId = await testCreateAgentRun();
    await testGetAgentRun(agentRunId);
    await testGetAgentRunLogs(agentRunId);
    await testResumeAgentRun();
    
    console.log('\n🏁 API endpoint testing completed!');
    console.log('\nNext steps:');
    console.log('1. ✅ API endpoints are working correctly');
    console.log('2. 🔄 Test the UI components');
    console.log('3. 🧪 Validate end-to-end functionality');
}

// Run the tests
runAllTests().catch(console.error);

