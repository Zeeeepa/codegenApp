import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CODEGEN_API_BASE = process.env.CODEGEN_API_BASE || 'https://api.codegen.com';

// CORS configuration with credentials support
app.use(cors({
  origin: [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'https://localhost:8000',
    // Add your production domain here
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ]
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mock implementation for message endpoint
app.post('/api/v1/beta/organizations/:orgId/agent/run/message', async (req, res) => {
  try {
    const { orgId } = req.params;
    const { agent_run_id, prompt } = req.body;
    
    console.log(`💬 Mock MESSAGE endpoint for org ${orgId}, run ${agent_run_id}`);
    console.log(`🔑 Authorization: ${req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : 'MISSING'}`);
    console.log(`📝 Prompt: ${prompt?.substring(0, 100)}...`);
    
    // Since the API doesn't have this endpoint, we'll create a new agent run
    // with the message as a prompt, simulating the messaging functionality
    const createResponse = await fetch(`${CODEGEN_API_BASE}/v1/organizations/${orgId}/agent/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization,
        'User-Agent': 'Agent-Run-Manager-Proxy/1.0',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        prompt: `[Follow-up to agent run #${agent_run_id}] ${prompt}`,
        images: []
      })
    });

    if (createResponse.ok) {
      const createData = await createResponse.json();
      console.log(`✅ Created follow-up agent run: ${createData.id}`);
      
      // Return a response that matches what the UI expects
      res.json({
        id: createData.id,
        status: createData.status,
        original_run_id: agent_run_id,
        message: 'Message sent as new agent run',
        created_at: createData.created_at
      });
    } else {
      const errorText = await createResponse.text();
      console.log('❌ Failed to create follow-up run:', createResponse.status, errorText);
      res.status(createResponse.status).json({
        error: 'Failed to send message',
        message: errorText
      });
    }

  } catch (error) {
    console.error('❌ Message endpoint mock error:', error);
    res.status(500).json({
      error: 'Message endpoint mock server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Mock implementation for resume endpoint
app.post('/api/v1/beta/organizations/:orgId/agent/run/resume', async (req, res) => {
  try {
    const { orgId } = req.params;
    const { agent_run_id, prompt } = req.body;
    
    console.log(`▶️ Mock RESUME endpoint for org ${orgId}, run ${agent_run_id}`);
    console.log(`🔑 Authorization: ${req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : 'MISSING'}`);
    console.log(`📝 Resume prompt: ${prompt?.substring(0, 100)}...`);
    
    // Since the API doesn't have this endpoint, we'll create a new agent run
    // with the resume prompt, simulating the resume functionality
    const createResponse = await fetch(`${CODEGEN_API_BASE}/v1/organizations/${orgId}/agent/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization,
        'User-Agent': 'Agent-Run-Manager-Proxy/1.0',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        prompt: `[Resume agent run #${agent_run_id}] ${prompt}`,
        images: []
      })
    });

    if (createResponse.ok) {
      const createData = await createResponse.json();
      console.log(`✅ Created resume agent run: ${createData.id}`);
      
      // Return a response that matches what the UI expects
      res.json({
        id: createData.id,
        status: createData.status,
        original_run_id: agent_run_id,
        message: 'Agent run resumed as new run',
        created_at: createData.created_at
      });
    } else {
      const errorText = await createResponse.text();
      console.log('❌ Failed to create resume run:', createResponse.status, errorText);
      res.status(createResponse.status).json({
        error: 'Failed to resume agent run',
        message: errorText
      });
    }

  } catch (error) {
    console.error('❌ Resume endpoint mock error:', error);
    res.status(500).json({
      error: 'Resume endpoint mock server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Fallback for other beta endpoints - proxy to API
app.use('/api/v1/beta', async (req, res) => {
  try {
    const targetUrl = `${CODEGEN_API_BASE}/v1/beta${req.path}`;
    
    console.log(`🔄 Proxying BETA ${req.method} ${req.path} to ${targetUrl}`);
    console.log(`🔑 Authorization: ${req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : 'MISSING'}`);
    
    // Forward the request to Codegen API
    const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
    const fullUrl = targetUrl + (queryString ? '?' + queryString : '');
    
    const response = await fetch(fullUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization,
        'User-Agent': 'Agent-Run-Manager-Proxy/1.0',
        'Accept': 'application/json',
        'Accept-Encoding': 'identity',
        ...Object.fromEntries(
          Object.entries(req.headers).filter(([key]) => 
            !['host', 'connection', 'content-length', 'accept-encoding'].includes(key.toLowerCase())
          )
        )
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
    });

    // Forward response headers
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });

    res.set(responseHeaders);
    res.status(response.status);

    // Handle different content types
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        const data = await response.json();
        res.json(data);
      } catch (jsonError) {
        console.error('❌ JSON parsing error:', jsonError);
        const text = await response.text();
        console.log('📄 Raw response:', text.substring(0, 200) + '...');
        res.status(response.status).send(text);
      }
    } else {
      const text = await response.text();
      res.send(text);
    }

  } catch (error) {
    console.error('❌ Beta proxy error:', error);
    res.status(500).json({
      error: 'Beta proxy server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Mock implementation for agent runs list endpoint
app.get('/api/v1/organizations/:orgId/agent/runs', async (req, res) => {
  try {
    const { orgId } = req.params;
    const { page = 1, size = 50, limit = 50 } = req.query;
    
    console.log(`📋 Mock AGENT RUNS LIST for org ${orgId} (page: ${page}, size: ${size || limit})`);
    console.log(`🔑 Authorization: ${req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : 'MISSING'}`);
    
    // Since the API doesn't have a list endpoint, we'll create a mock response
    // that fetches recent individual runs by trying sequential IDs
    const mockRuns = [];
    const maxRuns = parseInt(size || limit);
    
    // Try to fetch the last few runs by ID (this is a workaround)
    // We'll start from a recent ID and work backwards
    const startId = 41852; // Latest known ID from our tests
    const promises = [];
    
    for (let i = 0; i < Math.min(maxRuns, 20); i++) {
      const runId = startId - i;
      promises.push(
        fetch(`${CODEGEN_API_BASE}/v1/organizations/${orgId}/agent/run/${runId}`, {
          headers: {
            'Authorization': req.headers.authorization,
            'Accept': 'application/json'
          }
        }).then(async response => {
          if (response.ok) {
            const data = await response.json();
            return data;
          }
          return null;
        }).catch(() => null)
      );
    }
    
    const results = await Promise.all(promises);
    const validRuns = results.filter(run => run !== null);
    
    // Sort by creation date (newest first)
    validRuns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    const response = {
      items: validRuns,
      pagination: {
        page: parseInt(page),
        size: validRuns.length,
        total: validRuns.length,
        has_more: false
      }
    };
    
    console.log(`✅ Returning ${validRuns.length} agent runs`);
    res.json(response);

  } catch (error) {
    console.error('❌ Agent runs list mock error:', error);
    res.status(500).json({
      error: 'Agent runs list mock server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Proxy all other API requests to Codegen API
app.use('/api/v1', async (req, res) => {
  try {
    const targetUrl = `${CODEGEN_API_BASE}/v1${req.path}`;
    
    console.log(`🔄 Proxying ${req.method} ${req.path} to ${targetUrl}`);
    console.log(`🔑 Authorization: ${req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : 'MISSING'}`);
    
    // Forward the request to Codegen API
    const response = await fetch(targetUrl + (req.url.includes('?') ? '&' + req.url.split('?')[1] : ''), {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization,
        'User-Agent': 'Agent-Run-Manager-Proxy/1.0',
        'Accept': 'application/json',
        'Accept-Encoding': 'identity', // Disable compression to avoid parsing issues
        ...Object.fromEntries(
          Object.entries(req.headers).filter(([key]) => 
            !['host', 'connection', 'content-length', 'accept-encoding'].includes(key.toLowerCase())
          )
        )
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
    });

    // Forward response headers
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });

    res.set(responseHeaders);
    res.status(response.status);

    // Handle different content types
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        const data = await response.json();
        res.json(data);
      } catch (jsonError) {
        console.error('❌ JSON parsing error:', jsonError);
        // If JSON parsing fails, try to get raw text
        const text = await response.text();
        console.log('📄 Raw response:', text.substring(0, 200) + '...');
        res.status(response.status).send(text);
      }
    } else {
      const text = await response.text();
      res.send(text);
    }

  } catch (error) {
    console.error('❌ Proxy error:', error);
    res.status(500).json({
      error: 'Proxy server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Catch-all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /health',
      'GET /api/v1/organizations/:orgId/agent/runs',
      'ALL /api/v1/beta/*',
      'ALL /api/v1/*'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on port ${PORT}`);
  console.log(`🎯 Proxying to: ${CODEGEN_API_BASE}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});
