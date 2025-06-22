#!/usr/bin/env node

// Simple test script to validate database functionality
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001/api';

async function testDatabase() {
  console.log('🧪 Testing Database Functionality...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health check...');
    const healthResponse = await fetch(`${API_BASE}/database/health`);
    const health = await healthResponse.json();
    console.log('   Health status:', health.status);
    
    if (health.status !== 'connected') {
      console.log('   ⚠️  Database not connected - make sure PostgreSQL is running and configured');
      console.log('   Set environment variables: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD');
      return;
    }
    console.log('   ✅ Database connected\n');

    // Test 2: Save agent run
    console.log('2. Testing agent run storage...');
    const testAgentRun = {
      id: 12345,
      organization_id: 323,
      status: 'COMPLETE',
      prompt: 'Test prompt for database validation',
      result: 'Test completed successfully',
      web_url: 'https://app.codegen.com/agent/12345',
      data: { test: true, timestamp: new Date().toISOString() }
    };

    const saveResponse = await fetch(`${API_BASE}/database/agent-runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testAgentRun)
    });

    if (saveResponse.ok) {
      const saved = await saveResponse.json();
      console.log('   ✅ Agent run saved with ID:', saved.id);
    } else {
      console.log('   ❌ Failed to save agent run');
      return;
    }

    // Test 3: Retrieve agent runs
    console.log('3. Testing agent run retrieval...');
    const getResponse = await fetch(`${API_BASE}/database/agent-runs/323`);
    if (getResponse.ok) {
      const agentRuns = await getResponse.json();
      console.log(`   ✅ Retrieved ${agentRuns.length} agent runs`);
    } else {
      console.log('   ❌ Failed to retrieve agent runs');
      return;
    }

    // Test 4: Save message
    console.log('4. Testing message storage...');
    const messageResponse = await fetch(`${API_BASE}/database/agent-runs/12345/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Test message for agent run',
        messageType: 'user',
        data: { test: true }
      })
    });

    if (messageResponse.ok) {
      const message = await messageResponse.json();
      console.log('   ✅ Message saved with ID:', message.id);
    } else {
      console.log('   ❌ Failed to save message');
      return;
    }

    // Test 5: Retrieve messages
    console.log('5. Testing message retrieval...');
    const messagesResponse = await fetch(`${API_BASE}/database/agent-runs/12345/messages`);
    if (messagesResponse.ok) {
      const messages = await messagesResponse.json();
      console.log(`   ✅ Retrieved ${messages.length} messages`);
    } else {
      console.log('   ❌ Failed to retrieve messages');
      return;
    }

    console.log('\n🎉 All database tests passed!');
    console.log('\n📋 Summary:');
    console.log('   - Database connection: ✅');
    console.log('   - Agent run storage: ✅');
    console.log('   - Agent run retrieval: ✅');
    console.log('   - Message storage: ✅');
    console.log('   - Message retrieval: ✅');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure the server is running: npm run server:dev');
    console.log('   2. Check PostgreSQL is running and accessible');
    console.log('   3. Verify environment variables in server/.env');
  }
}

// Run tests
testDatabase();
