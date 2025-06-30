#!/usr/bin/env node

const crypto = require('crypto');
const https = require('https');

// Configuration
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/github';
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'your-webhook-secret-here';

// Sample webhook payload
const samplePayload = {
  action: 'opened',
  number: 1,
  pull_request: {
    id: 1,
    number: 1,
    title: 'Test PR',
    body: 'This is a test pull request',
    state: 'open',
    user: {
      login: 'testuser',
      id: 1,
    },
    head: {
      ref: 'feature-branch',
      sha: 'abc123',
    },
    base: {
      ref: 'main',
      sha: 'def456',
    },
  },
  repository: {
    id: 1,
    name: 'test-repo',
    full_name: 'testuser/test-repo',
    owner: {
      login: 'testuser',
      id: 1,
    },
  },
  sender: {
    login: 'testuser',
    id: 1,
  },
};

// Generate webhook signature
function generateSignature(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return `sha256=${hmac.digest('hex')}`;
}

// Send test webhook
async function sendTestWebhook() {
  const payloadString = JSON.stringify(samplePayload);
  const signature = generateSignature(payloadString, WEBHOOK_SECRET);

  console.log('🚀 Sending test webhook...');
  console.log(`URL: ${WEBHOOK_URL}`);
  console.log(`Event: pull_request`);
  console.log(`Signature: ${signature}`);

  const url = new URL(WEBHOOK_URL);
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payloadString),
      'X-GitHub-Event': 'pull_request',
      'X-GitHub-Delivery': crypto.randomUUID(),
      'X-Hub-Signature-256': signature,
      'User-Agent': 'GitHub-Hookshot/test',
    },
  };

  return new Promise((resolve, reject) => {
    const req = (url.protocol === 'https:' ? https : require('http')).request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`✅ Response Status: ${res.statusCode}`);
        console.log(`📄 Response Body: ${data}`);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('🎉 Webhook test successful!');
          resolve({ status: res.statusCode, body: data });
        } else {
          console.log('❌ Webhook test failed!');
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      reject(error);
    });

    req.write(payloadString);
    req.end();
  });
}

// Main execution
async function main() {
  try {
    console.log('🧪 GitHub Webhook Test Script');
    console.log('================================');
    
    if (!WEBHOOK_SECRET || WEBHOOK_SECRET === 'your-webhook-secret-here') {
      console.warn('⚠️  Warning: Using default webhook secret. Set GITHUB_WEBHOOK_SECRET environment variable.');
    }
    
    await sendTestWebhook();
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { sendTestWebhook, generateSignature };

