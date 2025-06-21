const https = require('https');

// Test different variations of the logs endpoint
const API_TOKEN = 'sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99';
const ORG_ID = '323';
const AGENT_RUN_ID = '41908'; // From previous test

function makeRequest(options) {
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
        req.end();
    });
}

async function testLogsEndpointVariations() {
    console.log('🔍 Testing different logs endpoint variations...\n');
    
    const variations = [
        `/v1/organizations/${ORG_ID}/agent/run/${AGENT_RUN_ID}/logs`,
        `/v1/organizations/${ORG_ID}/agent/runs/${AGENT_RUN_ID}/logs`,
        `/v1/organizations/${ORG_ID}/agents/run/${AGENT_RUN_ID}/logs`,
        `/v1/organizations/${ORG_ID}/agents/runs/${AGENT_RUN_ID}/logs`,
        `/v1/organizations/${ORG_ID}/agent-run/${AGENT_RUN_ID}/logs`,
        `/v1/organizations/${ORG_ID}/agent-runs/${AGENT_RUN_ID}/logs`,
        `/v1/beta/organizations/${ORG_ID}/agent/run/${AGENT_RUN_ID}/logs`,
        `/v1/alpha/organizations/${ORG_ID}/agent/run/${AGENT_RUN_ID}/logs`,
    ];
    
    for (const path of variations) {
        console.log(`Testing: ${path}`);
        
        const options = {
            hostname: 'api.codegen.com',
            port: 443,
            path: path,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`
            }
        };
        
        try {
            const response = await makeRequest(options);
            
            if (response.status === 200) {
                console.log(`✅ SUCCESS: ${path}`);
                console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
                return path; // Return the working path
            } else if (response.status === 404) {
                console.log(`❌ 404: ${path}`);
            } else {
                console.log(`⚠️  ${response.status}: ${path}`);
                console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
            }
        } catch (error) {
            console.log(`❌ ERROR: ${path} - ${error.message}`);
        }
    }
    
    return null;
}

// Also test if the agent run needs to be completed first
async function checkAgentRunStatus() {
    console.log('\n🔍 Checking current agent run status...');
    
    const options = {
        hostname: 'api.codegen.com',
        port: 443,
        path: `/v1/organizations/${ORG_ID}/agent/run/${AGENT_RUN_ID}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${API_TOKEN}`
        }
    };
    
    try {
        const response = await makeRequest(options);
        
        if (response.status === 200) {
            console.log(`Status: ${response.data.status}`);
            console.log(`Created: ${response.data.created_at}`);
            console.log(`Updated: ${response.data.updated_at || 'N/A'}`);
            
            if (response.data.status === 'ACTIVE') {
                console.log('⏳ Agent run is still active - logs might not be available until completion');
            } else {
                console.log('✅ Agent run completed - logs should be available');
            }
        }
    } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
    }
}

async function runTests() {
    await checkAgentRunStatus();
    const workingPath = await testLogsEndpointVariations();
    
    if (!workingPath) {
        console.log('\n❌ CONCLUSION: No working logs endpoint found');
        console.log('This suggests the logs endpoint is not yet implemented on the server side.');
        console.log('The documentation shows it should be at: /v1/organizations/{org_id}/agent/run/{agent_run_id}/logs');
        console.log('But the server returns 404 for this endpoint.');
    } else {
        console.log(`\n✅ CONCLUSION: Working logs endpoint found at: ${workingPath}`);
    }
}

runTests().catch(console.error);

