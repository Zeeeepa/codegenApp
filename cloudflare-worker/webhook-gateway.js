/**
 * Cloudflare Worker - GitHub Webhook Gateway
 * Processes GitHub webhooks and triggers grainchain validation flows
 */

// Environment variables (set in Cloudflare Workers dashboard)
// GITHUB_WEBHOOK_SECRET - GitHub webhook secret for signature verification
// GRAINCHAIN_API_URL - URL of grainchain validation service
// BACKEND_API_URL - URL of backend API service

/**
 * Verify GitHub webhook signature using HMAC-SHA256
 */
async function verifyGitHubSignature(payload, signature, secret) {
  if (!signature || !signature.startsWith('sha256=')) {
    return false;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const expectedSignature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expectedHex = Array.from(new Uint8Array(expectedSignature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const actualHex = signature.slice(7); // Remove 'sha256=' prefix
  return expectedHex === actualHex;
}

/**
 * Trigger grainchain validation for PR events
 */
async function triggerGrainchainValidation(eventData, env) {
  const grainchainUrl = env.GRAINCHAIN_API_URL || env.BACKEND_API_URL;
  
  if (!grainchainUrl) {
    console.log('No grainchain URL configured');
    return { error: 'No grainchain URL configured' };
  }

  try {
    const response = await fetch(`${grainchainUrl}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error triggering grainchain validation:', error);
    return { error: error.message };
  }
}

/**
 * Forward event to backend API
 */
async function forwardToBackend(eventType, payload, env) {
  const backendUrl = env.BACKEND_API_URL;
  
  if (!backendUrl) {
    console.log('No backend URL configured');
    return { error: 'No backend URL configured' };
  }

  try {
    const response = await fetch(`${backendUrl}/webhook/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': eventType,
        'X-Forwarded-From': 'cloudflare-worker',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error forwarding to backend:', error);
    return { error: error.message };
  }
}

/**
 * Main request handler
 */
export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-GitHub-Event, X-Hub-Signature-256',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Only handle POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'text/plain',
        },
      });
    }

    try {
      // Get headers
      const signature = request.headers.get('X-Hub-Signature-256');
      const eventType = request.headers.get('X-GitHub-Event');
      const contentType = request.headers.get('Content-Type');

      // Validate headers
      if (!eventType) {
        return new Response('Missing X-GitHub-Event header', { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'text/plain',
          },
        });
      }

      if (!contentType || !contentType.includes('application/json')) {
        return new Response('Invalid Content-Type', { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'text/plain',
          },
        });
      }

      // Get request body
      const body = await request.text();
      
      // Verify signature if secret is configured
      const webhookSecret = env.GITHUB_WEBHOOK_SECRET;
      if (webhookSecret && signature) {
        const isValid = await verifyGitHubSignature(body, signature, webhookSecret);
        if (!isValid) {
          return new Response('Invalid signature', { 
            status: 401,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'text/plain',
            },
          });
        }
      }

      // Parse JSON payload
      let payload;
      try {
        payload = JSON.parse(body);
      } catch (error) {
        return new Response('Invalid JSON payload', { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'text/plain',
          },
        });
      }

      console.log(`Processing ${eventType} event`);

      // Process different event types
      const results = {};

      // Handle PR events - trigger grainchain validation
      if (eventType === 'pull_request') {
        const action = payload.action;
        if (['opened', 'synchronize', 'reopened'].includes(action)) {
          console.log(`Triggering grainchain validation for PR ${action}`);
          
          const eventData = {
            event_type: eventType,
            action: action,
            pull_request: payload.pull_request || {},
            repository: payload.repository || {},
            timestamp: new Date().toISOString(),
          };

          results.grainchain = await triggerGrainchainValidation(eventData, env);
        }
      }

      // Forward all events to backend for additional processing
      results.backend = await forwardToBackend(eventType, payload, env);

      // Return success response
      return new Response(JSON.stringify({
        status: 'processed',
        event_type: eventType,
        action: payload.action || 'unknown',
        results: results,
        timestamp: new Date().toISOString(),
      }), {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });

    } catch (error) {
      console.error('Error processing webhook:', error);
      
      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString(),
      }), {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }
  },
};

