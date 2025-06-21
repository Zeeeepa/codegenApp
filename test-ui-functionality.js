#!/usr/bin/env node

const API_BASE = 'http://localhost:3001';
const TOKEN = 'sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99';
const ORG_ID = 323;

// Import fetch for Node.js
import('node-fetch').then(({ default: fetch }) => {
  global.fetch = fetch;
  testUIFunctionality();
}).catch(() => {
  console.log('⚠️ Using built-in fetch');
  testUIFunctionality();
});

async function testUIFunctionality() {
  console.log('🖥️  Testing UI Functionality and API Endpoints...\n');

  // Test the endpoints that the UI actually uses
  console.log('📡 Testing UI API endpoints...');

  // 1. Test the agent runs list endpoint (what the UI calls)
  console.log('\n1️⃣ Testing agent runs list endpoint...');
  try {
    // Try the endpoint that the UI actually uses
    const listResponse = await fetch(`${API_BASE}/api/v1/organizations/${ORG_ID}/agent/runs?page=1&size=50`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });

    if (listResponse.ok) {
      const listData = await listResponse.json();
      console.log('✅ Agent runs list endpoint works:', {
        total_items: listData.items ? listData.items.length : 0,
        has_pagination: !!listData.pagination
      });
      
      if (listData.items && listData.items.length > 0) {
        const latestRun = listData.items[0];
        console.log('📊 Latest run:', {
          id: latestRun.id,
          status: latestRun.status,
          created_at: latestRun.created_at
        });
      }
    } else {
      console.log('❌ Agent runs list failed:', listResponse.status, await listResponse.text());
    }
  } catch (error) {
    console.log('❌ Agent runs list error:', error.message);
  }

  // 2. Test the message endpoint (what the UI calls for messaging)
  console.log('\n2️⃣ Testing message endpoint...');
  try {
    // First, let's create a test run to message
    const createResponse = await fetch(`${API_BASE}/api/v1/organizations/${ORG_ID}/agent/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'Quick test for messaging - just say "Message received!"',
        images: []
      })
    });

    if (createResponse.ok) {
      const createData = await createResponse.json();
      const testRunId = createData.id;
      console.log('✅ Test run created for messaging:', testRunId);

      // Wait a moment for the run to complete
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Now test the message endpoint
      const messageResponse = await fetch(`${API_BASE}/api/v1/beta/organizations/${ORG_ID}/agent/run/message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agent_run_id: testRunId,
          prompt: 'This is a test message from the UI functionality test.'
        })
      });

      if (messageResponse.ok) {
        const messageData = await messageResponse.json();
        console.log('✅ Message endpoint works:', {
          id: messageData.id,
          status: messageData.status
        });
      } else {
        const errorText = await messageResponse.text();
        console.log('❌ Message endpoint failed:', messageResponse.status, errorText);
      }
    }
  } catch (error) {
    console.log('❌ Message endpoint test error:', error.message);
  }

  // 3. Test the resume endpoint (for paused runs)
  console.log('\n3️⃣ Testing resume endpoint...');
  try {
    const resumeResponse = await fetch(`${API_BASE}/api/v1/beta/organizations/${ORG_ID}/agent/run/resume`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_run_id: 99999, // Fake ID to test endpoint availability
        prompt: 'Test resume message'
      })
    });

    // We expect this to fail with a specific error, not 404
    if (resumeResponse.status === 404) {
      console.log('❌ Resume endpoint not found (404)');
    } else {
      console.log('✅ Resume endpoint exists (status:', resumeResponse.status, ')');
    }
  } catch (error) {
    console.log('❌ Resume endpoint test error:', error.message);
  }

  // 4. Test individual agent run fetch
  console.log('\n4️⃣ Testing individual agent run fetch...');
  try {
    // Use the run ID from our earlier test
    const runResponse = await fetch(`${API_BASE}/api/v1/organizations/${ORG_ID}/agent/run/41845`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });

    if (runResponse.ok) {
      const runData = await runResponse.json();
      console.log('✅ Individual run fetch works:', {
        id: runData.id,
        status: runData.status,
        has_result: !!runData.result
      });
    } else {
      console.log('❌ Individual run fetch failed:', runResponse.status);
    }
  } catch (error) {
    console.log('❌ Individual run fetch error:', error.message);
  }

  // 5. Test UI accessibility
  console.log('\n5️⃣ Testing UI accessibility...');
  try {
    const uiResponse = await fetch('http://localhost:8000');
    if (uiResponse.ok) {
      const htmlContent = await uiResponse.text();
      const hasReactRoot = htmlContent.includes('id="root"');
      const hasTitle = htmlContent.includes('Agent Run Manager');
      
      console.log('✅ UI is accessible:', {
        has_react_root: hasReactRoot,
        has_title: hasTitle,
        status: uiResponse.status
      });
    } else {
      console.log('❌ UI not accessible:', uiResponse.status);
    }
  } catch (error) {
    console.log('❌ UI accessibility error:', error.message);
  }

  console.log('\n📋 Summary of UI Functionality Test:');
  console.log('   🎯 The UI should now show:');
  console.log('     • Agent runs appearing immediately after creation');
  console.log('     • Real-time status updates');
  console.log('     • Working "Respond to agent run" buttons');
  console.log('     • No infinite loop warnings in browser console');
  console.log('     • Monitoring dashboard with live stats');
  console.log('\n   🌐 Access the UI at: http://localhost:8000');
  console.log('   🔧 Check browser console for any React warnings');
}

