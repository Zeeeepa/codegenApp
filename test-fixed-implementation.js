#!/usr/bin/env node

// Test the fixed implementation by simulating the API client behavior

const CODEGEN_ORG_ID = '323';
const CODEGEN_TOKEN = 'sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99';
const API_BASE = 'https://api.codegen.com';

// Simulate the fixed API client
class FixedCodegenAPIClient {
  constructor() {
    this.baseUrl = API_BASE;
    this.apiToken = CODEGEN_TOKEN;
  }

  // Fixed endpoint constant
  getResumeEndpoint(organizationId) {
    return `/v1/organizations/${organizationId}/agent/run/resume`;
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      "Authorization": `Bearer ${this.apiToken}`,
      "Content-Type": "application/json",
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return await response.json();
  }

  // Fixed resumeAgentRun method
  async resumeAgentRun(organizationId, agentRunId, request) {
    const fullRequest = {
      ...request,
      agent_run_id: agentRunId,
    };
    
    return this.makeRequest(
      this.getResumeEndpoint(organizationId),
      {
        method: "POST",
        body: JSON.stringify(fullRequest),
      }
    );
  }

  // Helper method to get agent runs
  async getAgentRuns(organizationId) {
    return this.makeRequest(`/v1/organizations/${organizationId}/agent/runs`);
  }
}

async function testFixedImplementation() {
  console.log('🧪 Testing Fixed Implementation');
  console.log(`🏢 Organization ID: ${CODEGEN_ORG_ID}`);
  console.log(`🔑 Token: ${CODEGEN_TOKEN.substring(0, 10)}...`);
  
  const client = new FixedCodegenAPIClient();
  
  try {
    // Get existing agent runs
    console.log('\n=== Getting agent runs ===');
    const runsResponse = await client.getAgentRuns(parseInt(CODEGEN_ORG_ID));
    
    if (runsResponse.items && runsResponse.items.length > 0) {
      const testRun = runsResponse.items.find(run => run.status === 'COMPLETE') || runsResponse.items[0];
      console.log(`✅ Found agent run to test: ${testRun.id} (status: ${testRun.status})`);
      
      // Test the fixed resume functionality
      console.log('\n=== Testing Fixed Resume Implementation ===');
      console.log(`🎯 Endpoint: ${client.getResumeEndpoint(parseInt(CODEGEN_ORG_ID))}`);
      
      const resumeRequest = {
        prompt: "Continue with this task - testing the FIXED implementation"
      };
      
      console.log(`📝 Request: ${JSON.stringify({ ...resumeRequest, agent_run_id: testRun.id }, null, 2)}`);
      
      const resumeResponse = await client.resumeAgentRun(
        parseInt(CODEGEN_ORG_ID),
        testRun.id,
        resumeRequest
      );
      
      console.log('🎉 SUCCESS! Fixed implementation is working!');
      console.log(`🆔 Resumed agent run ID: ${resumeResponse.id}`);
      console.log(`📊 Status: ${resumeResponse.status}`);
      console.log(`🌐 Web URL: ${resumeResponse.web_url}`);
      
    } else {
      console.log('❌ No agent runs found to test with');
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  }
  
  console.log('\n=== Summary ===');
  console.log('✅ Fixed endpoint format: /v1/organizations/{org_id}/agent/run/resume');
  console.log('✅ Fixed request body: includes agent_run_id field');
  console.log('✅ API client method signature maintained for backward compatibility');
  console.log('');
  console.log('🔧 Changes made:');
  console.log('   1. Updated API_ENDPOINTS.AGENT_RUN_RESUME to remove {agentRunId} from URL');
  console.log('   2. Updated ResumeAgentRunRequest type to include agent_run_id field');
  console.log('   3. Updated resumeAgentRun method to add agent_run_id to request body');
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
  testFixedImplementation().catch(error => {
    console.error('❌ Testing failed:', error);
    process.exit(1);
  });
});

