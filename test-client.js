// Test the API client directly
const API_BASE = 'https://api.codegen.com';
const ORG_ID = 323;
const API_TOKEN = 'sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99';

// Test function to create an agent run
async function testCreateAgentRun() {
    console.log('Testing agent run creation...');
    
    try {
        const response = await fetch(`${API_BASE}/v1/organizations/${ORG_ID}/agent/run`, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_TOKEN}`
            },
            body: JSON.stringify({
                prompt: 'Test from client.js: What is 5+5?'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Agent run created successfully:', data);
        return data;
        
    } catch (error) {
        console.error('❌ Failed to create agent run:', error);
        throw error;
    }
}

// Test function to get agent run logs
async function testGetAgentRunLogs(agentRunId) {
    console.log(`Testing agent run logs for ID: ${agentRunId}...`);
    
    try {
        const response = await fetch(`${API_BASE}/v1/alpha/organizations/${ORG_ID}/agent/run/${agentRunId}/logs`, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Agent run logs retrieved successfully:', data);
        return data;
        
    } catch (error) {
        console.error('❌ Failed to get agent run logs:', error);
        throw error;
    }
}

// Run the tests
async function runTests() {
    console.log('🚀 Starting API client tests...');
    
    try {
        // Test 1: Create agent run
        const agentRun = await testCreateAgentRun();
        
        // Wait a bit for the agent run to complete
        console.log('⏳ Waiting for agent run to complete...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        // Test 2: Get agent run logs
        await testGetAgentRunLogs(agentRun.id);
        
        console.log('🎉 All tests passed!');
        
    } catch (error) {
        console.error('💥 Test suite failed:', error);
    }
}

// Export for use in browser
if (typeof window !== 'undefined') {
    window.testCreateAgentRun = testCreateAgentRun;
    window.testGetAgentRunLogs = testGetAgentRunLogs;
    window.runTests = runTests;
}

// Run tests if in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    runTests();
}
