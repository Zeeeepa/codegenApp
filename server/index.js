import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import rateLimit from 'express-rate-limit';
import { resumeAgentRun, testAutomation } from './automation-service.js';
import logger from './logger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CODEGEN_API_BASE = process.env.CODEGEN_API_BASE || 'https://api.codegen.com';

// CORS configuration with credentials support
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'https://localhost:8080',
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

// Rate limiting for automation endpoints
const automationLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many automation requests',
    message: 'Please try again later'
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Automation endpoints
app.post('/api/resume-agent-run', automationLimiter, async (req, res) => {
  try {
    const { agentRunId, organizationId, prompt, authContext } = req.body;

    // Validate required fields
    if (!agentRunId || !organizationId || !prompt || !authContext) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: agentRunId, organizationId, prompt, authContext'
      });
    }

    logger.info('Received automation request', {
      agentRunId,
      organizationId,
      promptLength: prompt.length,
      hasAuth: !!authContext
    });

    // Call automation service
    const result = await resumeAgentRun({
      agentRunId,
      organizationId,
      prompt,
      authContext
    });

    res.json(result);

  } catch (error) {
    logger.error('Automation endpoint error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test automation endpoint
app.post('/api/test-automation', automationLimiter, async (req, res) => {
  try {
    const { agentRunId, authContext } = req.body;

    if (!agentRunId || !authContext) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: agentRunId, authContext'
      });
    }

    const result = await testAutomation({ agentRunId, authContext });
    res.json(result);

  } catch (error) {
    logger.error('Test automation endpoint error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Proxy all API requests to Codegen API
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
      'POST /api/resume-agent-run',
      'POST /api/test-automation',
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
