// Test script to verify API connectivity with real credentials
const fetch = require('node-fetch');

const API_TOKEN = 'sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99';
const ORG_ID = '323';
const BASE_URL = 'http://localhost:3001/api';

async function testAPI() {
  console.log('🧪 Testing Codegen API with real credentials...');
  
  try {
    // Test user endpoint
    console.log('\n1️⃣ Testing /users/me endpoint...');
    const userResponse = await fetch(`${BASE_URL}/v1/users/me`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('✅ User data retrieved successfully:');
      console.log(`   - ID: ${userData.id}`);
      console.log(`   - Email: ${userData.email}`);
      console.log(`   - GitHub: @${userData.github_username}`);
      console.log(`   - Full Name: ${userData.full_name || 'Not set'}`);
    } else {
      console.log(`❌ User endpoint failed: ${userResponse.status} ${userResponse.statusText}`);
      const errorText = await userResponse.text();
      console.log(`   Error: ${errorText}`);
    }
    
    // Test organizations endpoint
    console.log('\n2️⃣ Testing /organizations endpoint...');
    const orgsResponse = await fetch(`${BASE_URL}/v1/organizations`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (orgsResponse.ok) {
      const orgsData = await orgsResponse.json();
      console.log('✅ Organizations data retrieved successfully:');
      console.log(`   - Found ${orgsData.length} organizations`);
      orgsData.forEach(org => {
        console.log(`   - ${org.name} (ID: ${org.id})`);
      });
    } else {
      console.log(`❌ Organizations endpoint failed: ${orgsResponse.status} ${orgsResponse.statusText}`);
      const errorText = await orgsResponse.text();
      console.log(`   Error: ${errorText}`);
    }
    
    // Test agent runs endpoint for specific org
    console.log('\n3️⃣ Testing /agent-runs endpoint...');
    const runsResponse = await fetch(`${BASE_URL}/v1/agent-runs?organization_id=${ORG_ID}&limit=5`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (runsResponse.ok) {
      const runsData = await runsResponse.json();
      console.log('✅ Agent runs data retrieved successfully:');
      console.log(`   - Found ${runsData.length} recent agent runs`);
      if (runsData.length > 0) {
        console.log(`   - Latest run: ${runsData[0].id} (${runsData[0].status})`);
      }
    } else {
      console.log(`❌ Agent runs endpoint failed: ${runsResponse.status} ${runsResponse.statusText}`);
      const errorText = await runsResponse.text();
      console.log(`   Error: ${errorText}`);
    }
    
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
  
  console.log('\n🎯 API Test Complete!');
}

testAPI();
