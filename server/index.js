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

// API discovery endpoint - test common endpoint patterns
app.get('/api-discovery', async (req, res) => {
  const { organizationId = 323 } = req.query;
  const testEndpoints = [
    // Agent run endpoints to test
    { method: 'GET', path: `/v1/organizations/${organizationId}/agent/runs` },
    { method: 'GET', path: `/v1/organizations/${organizationId}/agent-runs` },
    { method: 'POST', path: `/v1/organizations/${organizationId}/agent/run` },
    { method: 'POST', path: `/v1/organizations/${organizationId}/agent-runs` },
    { method: 'POST', path: `/v1/beta/organizations/${organizationId}/agent/run/resume` },
    { method: 'POST', path: `/v1/organizations/${organizationId}/agent/run/resume` },
    { method: 'PUT', path: `/v1/organizations/${organizationId}/agent/run/resume` },
    { method: 'POST', path: `/v1/organizations/${organizationId}/agent-runs/resume` },
    // Organization endpoints
    { method: 'GET', path: '/v1/organizations' },
    { method: 'GET', path: `/v1/organizations/${organizationId}` },
    // User endpoints
    { method: 'GET', path: '/v1/users/me' },
    { method: 'GET', path: `/v1/organizations/${organizationId}/users` },
  ];

  const results = [];
  const authHeader = req.headers.authorization || 'Bearer sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99';

  for (const endpoint of testEndpoints) {
    try {
      const testUrl = `${CODEGEN_API_BASE}${endpoint.path}`;
      console.log(`🔍 Testing ${endpoint.method} ${endpoint.path}`);
      
      const testResponse = await fetch(testUrl, {
        method: endpoint.method,
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'User-Agent': 'Agent-Run-Manager-Discovery/1.0'
        },
        // Add minimal body for POST requests
        body: endpoint.method === 'POST' ? JSON.stringify({}) : undefined
      });

      results.push({
        method: endpoint.method,
        path: endpoint.path,
        status: testResponse.status,
        statusText: testResponse.statusText,
        available: testResponse.status < 500 && testResponse.status !== 404
      });

    } catch (error) {
      results.push({
        method: endpoint.method,
        path: endpoint.path,
        status: 'ERROR',
        statusText: error.message,
        available: false
      });
    }
  }

  res.json({
    discoveryResults: results,
    workingEndpoints: results.filter(r => r.available),
    notFoundEndpoints: results.filter(r => r.status === 404),
    timestamp: new Date().toISOString()
  });
});

// API endpoint logging for discovery
const logAPICall = (method, path, status, targetUrl, requestBody = null) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    method,
    path,
    status,
    targetUrl,
    requestBody: requestBody ? JSON.stringify(requestBody).substring(0, 200) : null
  };
  
  console.log(`📊 API Call Log:`, JSON.stringify(logEntry, null, 2));
  
  // Store successful endpoints for documentation
  if (status >= 200 && status < 300) {
    console.log(`✅ WORKING ENDPOINT: ${method} ${path}`);
  } else if (status === 404) {
    console.log(`❌ 404 ENDPOINT: ${method} ${path} - Endpoint not found`);
  }
};

// Proxy all API requests to Codegen API
app.use('/api/v1', async (req, res) => {
  try {
    const targetUrl = `${CODEGEN_API_BASE}/v1${req.path}`;
    
    console.log(`🔄 Proxying ${req.method} ${req.path} to ${targetUrl}`);
    console.log(`🔑 Authorization: ${req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : 'MISSING'}`);
    if (req.body && Object.keys(req.body).length > 0) {
      console.log(`📦 Request Body:`, JSON.stringify(req.body, null, 2));
    }
    
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

    // Log the API call for discovery
    logAPICall(req.method, req.path, response.status, targetUrl, req.body);

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
      'GET /api-discovery',
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
