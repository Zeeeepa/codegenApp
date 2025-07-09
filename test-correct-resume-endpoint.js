#!/usr/bin/env node

const CODEGEN_ORG_ID = '323';
const CODEGEN_TOKEN = 'sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99';
const API_BASE = 'https://api.codegen.com';

async function testCorrectResumeEndpoint() {
  console.log('🧪 Testing CORRECT Resume Endpoint from Documentation');
  console.log(`🏢 Organization ID: ${CODEGEN_ORG_ID}`);
  console.log(`🔑 Token: ${CODEGEN_TOKEN.substring(0, 10)}...`);
  
  // First, get an existing agent run to test with
  console.log('\n=== Getting existing agent runs ===');
  const listResponse = await fetch(`${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/runs`, {
    headers: {
      'Authorization': `Bearer ${CODEGEN_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  
  let testRunId = null;
  if (listResponse.ok) {
    const data = await listResponse.json();
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
  }
  
  if (!testRunId) {
    console.log('❌ No agent run found to test with');
    return;
  }
  
  // Test the CORRECT endpoint format from documentation
  console.log('\n=== Testing CORRECT Resume Endpoint ===');
  console.log('📖 From docs: POST /v1/organizations/{org_id}/agent/run/resume');
  
  const correctEndpoint = `${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/run/resume`;
  const correctPayload = {
    agent_run_id: parseInt(testRunId),
    prompt: "Continue with this task - testing the CORRECT resume endpoint from documentation"
  };
  
  console.log(`🎯 Endpoint: ${correctEndpoint}`);
  console.log(`📝 Payload: ${JSON.stringify(correctPayload, null, 2)}`);
  
  try {
    const response = await fetch(correctEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CODEGEN_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(correctPayload)
    });
    
    const responseText = await response.text();
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📄 Response: ${responseText}`);
    
    if (response.ok) {
      console.log('🎉 SUCCESS! The correct resume endpoint is working!');
      try {
        const responseData = JSON.parse(responseText);
        console.log(`🆔 Resumed agent run ID: ${responseData.id}`);
        console.log(`📊 Status: ${responseData.status}`);
        console.log(`🌐 Web URL: ${responseData.web_url}`);
      } catch (e) {
        console.log('⚠️ Response is not JSON, but request succeeded');
      }
    } else {
      console.log('❌ Resume endpoint failed');
      
      // Let's also test if we need to create a paused run first
      if (response.status === 404 || response.status === 422) {
        console.log('\n🔄 Maybe we need a PAUSED run? Let me create one...');
        
        // Create a new run
        const createResponse = await fetch(`${API_BASE}/v1/organizations/${CODEGEN_ORG_ID}/agent/run`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CODEGEN_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: "This is a test run that we will pause and then resume"
          })
        });
        
        if (createResponse.ok) {
          const newRun = await createResponse.json();
          console.log(`✅ Created new run: ${newRun.id}`);
          
          // Wait a moment
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Try to stop it first (to potentially pause it)
          const stopResponse = await fetch(`${API_BASE}/v1/beta/organizations/${CODEGEN_ORG_ID}/agent/run/stop`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${CODEGEN_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              agent_run_id: newRun.id
            })
          });
          
          if (stopResponse.ok) {
            console.log(`✅ Stopped run: ${newRun.id}`);
            
            // Now try to resume the stopped run
            const resumeStoppedPayload = {
              agent_run_id: newRun.id,
              prompt: "Resume this stopped run"
            };
            
            console.log('\n🔄 Testing resume on stopped run...');
            const resumeStoppedResponse = await fetch(correctEndpoint, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${CODEGEN_TOKEN}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(resumeStoppedPayload)
            });
            
            const resumeStoppedText = await resumeStoppedResponse.text();
            console.log(`📊 Resume stopped run status: ${resumeStoppedResponse.status}`);
            console.log(`📄 Resume stopped run response: ${resumeStoppedText}`);
            
            if (resumeStoppedResponse.ok) {
              console.log('🎉 SUCCESS! Resume works on stopped runs!');
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
  
  console.log('\n=== Summary ===');
  console.log('📖 Documentation shows: POST /v1/organizations/{org_id}/agent/run/resume');
  console.log('🔧 Current app uses: POST /v1/organizations/{org_id}/agent/run/{id}/resume');
  console.log('');
  console.log('💡 The issue is the endpoint format difference:');
  console.log('   ✅ Correct: /agent/run/resume (with agent_run_id in body)');
  console.log('   ❌ App uses: /agent/run/{id}/resume (with id in URL)');
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
  testCorrectResumeEndpoint().catch(error => {
    console.error('❌ Testing failed:', error);
    process.exit(1);
  });
});

