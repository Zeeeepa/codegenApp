/**
 * Test script for Codegen API integration
 * 
 * This script tests the real Codegen API endpoints with the provided credentials.
 */

const { default: fetch } = require('node-fetch');

// Real credentials from environment
const CODEGEN_API_KEY = 'sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99';
const CODEGEN_ORG_ID = '323';
const CODEGEN_API_BASE_URL = 'https://api.codegen.com';

async function testCodegenAPI() {
  console.log('🚀 Testing Codegen API Integration...\n');

  // Test 1: Health check
  console.log('1. Testing API health check...');
  try {
    const healthResponse = await fetch(`${CODEGEN_API_BASE_URL}/api/v1/health`, {
      headers: {
        'Authorization': `Bearer ${CODEGEN_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (healthResponse.ok) {
      console.log('✅ Health check passed');
    } else {
      console.log(`❌ Health check failed: ${healthResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ Health check error: ${error.message}`);
  }

  // Test 2: Create agent run
  console.log('\n2. Testing create agent run...');
  try {
    const createRequest = {
      message: 'Test message from codegenApp - please respond with a simple greeting',
      context: {
        repository: 'codegenApp',
        branch: 'main'
      },
      settings: {
        model: 'claude-3-sonnet',
        temperature: 0.7,
        max_tokens: 1000
      }
    };

    const createResponse = await fetch(`${CODEGEN_API_BASE_URL}/api/v1/agents/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CODEGEN_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Organization-ID': CODEGEN_ORG_ID,
      },
      body: JSON.stringify(createRequest),
    });

    if (createResponse.ok) {
      const runData = await createResponse.json();
      console.log('✅ Agent run created successfully');
      console.log(`   Run ID: ${runData.id}`);
      console.log(`   Status: ${runData.status}`);
      console.log(`   Message: ${runData.message}`);
      
      // Test 3: Get agent run status
      console.log('\n3. Testing get agent run status...');
      const statusResponse = await fetch(`${CODEGEN_API_BASE_URL}/api/v1/agents/runs/${runData.id}/status`, {
        headers: {
          'Authorization': `Bearer ${CODEGEN_API_KEY}`,
          'Content-Type': 'application/json',
          'X-Organization-ID': CODEGEN_ORG_ID,
        },
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log('✅ Status check successful');
        console.log(`   Status: ${statusData.status}`);
        console.log(`   Progress: ${statusData.progress || 'N/A'}`);
      } else {
        console.log(`❌ Status check failed: ${statusResponse.status}`);
      }

      // Test 4: List agent runs
      console.log('\n4. Testing list agent runs...');
      const listResponse = await fetch(`${CODEGEN_API_BASE_URL}/api/v1/agents/runs?limit=5`, {
        headers: {
          'Authorization': `Bearer ${CODEGEN_API_KEY}`,
          'Content-Type': 'application/json',
          'X-Organization-ID': CODEGEN_ORG_ID,
        },
      });

      if (listResponse.ok) {
        const listData = await listResponse.json();
        console.log('✅ List runs successful');
        console.log(`   Found ${listData.runs ? listData.runs.length : 0} runs`);
      } else {
        console.log(`❌ List runs failed: ${listResponse.status}`);
      }

    } else {
      const errorText = await createResponse.text();
      console.log(`❌ Create agent run failed: ${createResponse.status}`);
      console.log(`   Error: ${errorText}`);
    }
  } catch (error) {
    console.log(`❌ Create agent run error: ${error.message}`);
  }

  console.log('\n🏁 Codegen API test completed!');
}

// Test GitHub API
async function testGitHubAPI() {
  console.log('\n🐙 Testing GitHub API Integration...\n');

  const GITHUB_TOKEN = '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';

  try {
    // Test user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('✅ GitHub authentication successful');
      console.log(`   User: ${userData.login}`);
      console.log(`   Name: ${userData.name || 'N/A'}`);
    } else {
      console.log(`❌ GitHub authentication failed: ${userResponse.status}`);
    }

    // Test repositories
    const reposResponse = await fetch('https://api.github.com/user/repos?per_page=10', {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (reposResponse.ok) {
      const reposData = await reposResponse.json();
      console.log('✅ Repository access successful');
      console.log(`   Found ${reposData.length} repositories`);
      
      const targetRepos = reposData.filter(repo => 
        repo.name.toLowerCase().includes('grainchain') || 
        repo.name.toLowerCase().includes('codegenapp')
      );
      
      console.log(`   Target repos (grainchain/codegenApp): ${targetRepos.length}`);
      targetRepos.forEach(repo => {
        console.log(`     - ${repo.full_name}`);
      });
    } else {
      console.log(`❌ Repository access failed: ${reposResponse.status}`);
    }

  } catch (error) {
    console.log(`❌ GitHub API error: ${error.message}`);
  }
}

// Test Gemini API
async function testGeminiAPI() {
  console.log('\n🧠 Testing Gemini API Integration...\n');

  const GEMINI_API_KEY = 'AIzaSyBXmhlHudrD4zXiv-5fjxi1gGG-_kdtaZ0';

  try {
    const requestBody = {
      contents: [{
        parts: [{
          text: 'Hello! This is a test from codegenApp. Please respond with a simple greeting and confirm you can receive this message.'
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 100,
      }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('✅ Gemini API successful');
      console.log(`   Response: ${generatedText.substring(0, 100)}...`);
    } else {
      const errorText = await response.text();
      console.log(`❌ Gemini API failed: ${response.status}`);
      console.log(`   Error: ${errorText}`);
    }

  } catch (error) {
    console.log(`❌ Gemini API error: ${error.message}`);
  }
}

// Run all tests
async function runAllTests() {
  await testCodegenAPI();
  await testGitHubAPI();
  await testGeminiAPI();
  
  console.log('\n🎉 All API integration tests completed!');
  console.log('\n📊 Summary:');
  console.log('   - Codegen API: Real agent run creation and management');
  console.log('   - GitHub API: Repository access for grainchain and codegenApp');
  console.log('   - Gemini API: AI-powered web evaluation capabilities');
  console.log('   - Grainchain: Local sandboxing (simulated)');
  console.log('   - Cloudflare: Webhook gateway (configured)');
}

runAllTests().catch(console.error);
