#!/usr/bin/env node

const API_BASE = 'http://localhost:3001';
const TOKEN = 'sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99';

async function testAPI() {
  console.log('🧪 Testing API endpoints...\n');

  // Test health endpoint
  try {
    const healthResponse = await fetch(`${API_BASE}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health Check:', JSON.stringify(healthData, null, 2));
  } catch (error) {
    console.log('❌ Health Check failed:', error.message);
  }

  // Test user endpoint
  try {
    const userResponse = await fetch(`${API_BASE}/api/v1/users/me`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });
    const userData = await userResponse.json();
    console.log('\n✅ User Data:', JSON.stringify(userData, null, 2));
  } catch (error) {
    console.log('\n❌ User endpoint failed:', error.message);
  }

  // Test organizations endpoint
  try {
    const orgResponse = await fetch(`${API_BASE}/api/v1/organizations`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });
    
    if (orgResponse.ok) {
      const orgData = await orgResponse.json();
      console.log('\n✅ Organizations:', JSON.stringify(orgData, null, 2));
    } else {
      console.log('\n⚠️ Organizations endpoint returned:', orgResponse.status, orgResponse.statusText);
    }
  } catch (error) {
    console.log('\n❌ Organizations endpoint failed:', error.message);
  }

  // Test agent runs endpoint
  try {
    const runsResponse = await fetch(`${API_BASE}/api/v1/organizations/323/agent_runs?limit=3`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });
    
    if (runsResponse.ok) {
      const runsData = await runsResponse.json();
      console.log('\n✅ Agent Runs:', JSON.stringify(runsData, null, 2));
    } else {
      console.log('\n⚠️ Agent runs endpoint returned:', runsResponse.status, runsResponse.statusText);
    }
  } catch (error) {
    console.log('\n❌ Agent runs endpoint failed:', error.message);
  }
}

// Import fetch for Node.js
import('node-fetch').then(({ default: fetch }) => {
  global.fetch = fetch;
  testAPI();
}).catch(() => {
  // Fallback for environments without node-fetch
  console.log('⚠️ Using built-in fetch or curl fallback');
  testAPI();
});

