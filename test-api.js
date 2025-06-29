const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testAPI() {
  console.log('🧪 Testing Agent Run API Endpoints...');
  
  const baseUrl = 'localhost';
  const port = 3001;
  const orgId = 323;
  
  // Test 1: Health check
  console.log('\n1️⃣ Testing health endpoint...');
  try {
    const health = await makeRequest({
      hostname: baseUrl,
      port: port,
      path: '/health',
      method: 'GET'
    });
    console.log(`✅ Health check: ${health.status} - ${health.data.status}`);
  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}`);
  }
  
  // Test 2: List agent runs (new endpoint)
  console.log('\n2️⃣ Testing list agent runs endpoint...');
  try {
    const listRuns = await makeRequest({
      hostname: baseUrl,
      port: port,
      path: `/api/v1/organizations/${orgId}/agent/runs?page=1&size=5`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log(`📋 List runs: ${listRuns.status}`);
    if (listRuns.status === 200) {
      console.log(`✅ List endpoint works! Found ${listRuns.data.items?.length || 0} runs`);
      console.log(`📊 Total: ${listRuns.data.total}, Page: ${listRuns.data.page}, Has more: ${listRuns.data.has_more}`);
    } else {
      console.log(`❌ List endpoint failed: ${JSON.stringify(listRuns.data).substring(0, 200)}`);
    }
  } catch (error) {
    console.log(`❌ List runs failed: ${error.message}`);
  }
  
  // Test 3: Create agent run
  console.log('\n3️⃣ Testing create agent run endpoint...');
  try {
    const createRun = await makeRequest({
      hostname: baseUrl,
      port: port,
      path: `/api/v1/organizations/${orgId}/agent/run`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      prompt: 'Test run for API validation - please respond with a simple hello message'
    });
    
    console.log(`🚀 Create run: ${createRun.status}`);
    if (createRun.status === 200 || createRun.status === 201) {
      console.log(`✅ Create endpoint works! Run ID: ${createRun.data.id}`);
      
      // Test 4: Get the created run
      console.log('\n4️⃣ Testing get agent run endpoint...');
      const getRun = await makeRequest({
        hostname: baseUrl,
        port: port,
        path: `/api/v1/organizations/${orgId}/agent/run/${createRun.data.id}`,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`📖 Get run: ${getRun.status}`);
      if (getRun.status === 200) {
        console.log(`✅ Get endpoint works! Status: ${getRun.data.status}`);
        
        // Test 5: Stop the run
        console.log('\n5️⃣ Testing stop agent run endpoint...');
        const stopRun = await makeRequest({
          hostname: baseUrl,
          port: port,
          path: `/api/v1/beta/organizations/${orgId}/agent/run/stop`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }, {
          agent_run_id: createRun.data.id
        });
        
        console.log(`⏹️ Stop run: ${stopRun.status}`);
        if (stopRun.status === 200) {
          console.log(`✅ Stop endpoint works!`);
          
          // Test 6: Resume the run
          console.log('\n6️⃣ Testing resume agent run endpoint...');
          const resumeRun = await makeRequest({
            hostname: baseUrl,
            port: port,
            path: `/api/v1/alpha/organizations/${orgId}/agent/run/${createRun.data.id}/resume`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          }, {
            prompt: 'Continue with the test - please confirm you received this resume message'
          });
          
          console.log(`▶️ Resume run: ${resumeRun.status}`);
          if (resumeRun.status === 200) {
            console.log(`✅ Resume endpoint works!`);
          } else {
            console.log(`❌ Resume failed: ${JSON.stringify(resumeRun.data).substring(0, 200)}`);
          }
        } else {
          console.log(`❌ Stop failed: ${JSON.stringify(stopRun.data).substring(0, 200)}`);
        }
      } else {
        console.log(`❌ Get failed: ${JSON.stringify(getRun.data).substring(0, 200)}`);
      }
    } else {
      console.log(`❌ Create failed: ${JSON.stringify(createRun.data).substring(0, 200)}`);
    }
  } catch (error) {
    console.log(`❌ Create run failed: ${error.message}`);
  }
  
  console.log('\n🏁 API test completed!');
}

testAPI().catch(console.error);
