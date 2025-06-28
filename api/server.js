/**
 * Backend automation server for Codegen app
 * Provides headless browser automation for resuming agent runs
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');
const logger = require('./logger');
const { resumeAgentRun, testAutomation } = require('./automation-service');
const healthMonitor = require('./health-monitor');
const metrics = require('./metrics');
const { 
  requestLoggingMiddleware, 
  errorLoggingMiddleware, 
  automationLoggingMiddleware 
} = require('./middleware/logging');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced logging and metrics middleware
app.use(requestLoggingMiddleware);
app.use(automationLoggingMiddleware);

// Metrics middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Record request in health monitor
  healthMonitor.recordRequest();
  
  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    metrics.recordRequest(req.path, req.method, res.statusCode, responseTime);
    
    if (res.statusCode >= 400) {
      healthMonitor.recordError();
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'automation-backend',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      'GET /health',
      'GET /ready',
      'GET /metrics',
      'POST /api/resume-agent-run',
      'POST /api/test-automation',
      'GET /api/auth-script',
      'ALL /api/v1/* (Codegen API Proxy)'
    ]
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  const healthStatus = healthMonitor.getHealthStatus();
  res.json({
    ...healthStatus,
    service: 'automation-backend',
    version: '1.0.0'
  });
});

// Readiness check endpoint
app.get('/ready', (req, res) => {
  const readinessStatus = healthMonitor.getReadinessStatus();
  const statusCode = readinessStatus.ready ? 200 : 503;
  res.status(statusCode).json(readinessStatus);
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  const allMetrics = metrics.getAllMetrics();
  res.json(allMetrics);
});

// Prometheus metrics endpoint
app.get('/metrics/prometheus', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(metrics.getPrometheusMetrics());
});

// Resume agent run endpoint
app.post('/api/resume-agent-run', async (req, res) => {
  try {
    const { agentRunId, organizationId, prompt, authContext } = req.body;

    // Validate required fields
    if (!agentRunId || !organizationId || !prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: agentRunId, organizationId, prompt'
      });
    }

    if (!authContext) {
      return res.status(400).json({
        success: false,
        error: 'Authentication context is required'
      });
    }

    logger.info('Resume agent run request received', {
      agentRunId,
      organizationId,
      promptLength: prompt.length,
      hasAuthContext: !!authContext
    });

    // Execute automation
    const automationStartTime = Date.now();
    const result = await resumeAgentRun({
      agentRunId,
      organizationId,
      prompt,
      authContext
    });
    const automationDuration = Date.now() - automationStartTime;

    // Record automation metrics
    metrics.recordAutomationAttempt(result.success, automationDuration, result.error);

    if (result.success) {
      logger.info('Agent run resumed successfully', {
        agentRunId,
        duration: result.duration,
        automationDuration
      });
      res.json({
        ...result,
        automationDuration
      });
    } else {
      logger.error('Agent run resume failed', {
        agentRunId,
        error: result.error
      });
      res.status(500).json(result);
    }

  } catch (error) {
    logger.error('Resume agent run endpoint error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Test automation endpoint
app.post('/api/test-automation', async (req, res) => {
  try {
    const { agentRunId, authContext } = req.body;

    if (!agentRunId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: agentRunId'
      });
    }

    if (!authContext) {
      return res.status(400).json({
        success: false,
        error: 'Authentication context is required'
      });
    }

    logger.info('Test automation request received', { agentRunId });

    const result = await testAutomation({ agentRunId, authContext });

    res.json(result);

  } catch (error) {
    logger.error('Test automation endpoint error', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get authentication extraction script endpoint
app.get('/api/auth-script', (req, res) => {
  const { getAuthExtractionScript } = require('./auth-handler');
  
  res.json({
    success: true,
    script: getAuthExtractionScript()
  });
});

// Codegen API Proxy Routes
const CODEGEN_API_BASE = process.env.CODEGEN_API_BASE || 'https://api.codegen.com';

// Proxy all API requests to Codegen API
app.use('/api/v1', async (req, res) => {
  try {
    const targetUrl = `${CODEGEN_API_BASE}/v1${req.path}`;
    
    logger.info(`Proxying ${req.method} ${req.path} to ${targetUrl}`);
    
    // Forward the request to Codegen API
    const response = await fetch(targetUrl + (req.url.includes('?') ? '&' + req.url.split('?')[1] : ''), {
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
        logger.error('JSON parsing error:', jsonError);
        const text = await response.text();
        res.status(response.status).send(text);
      }
    } else {
      const text = await response.text();
      res.send(text);
    }

  } catch (error) {
    logger.error('Proxy error:', error);
    res.status(500).json({
      error: 'Proxy server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Enhanced error handling middleware
app.use(errorLoggingMiddleware);

app.use((error, req, res, next) => {
  // This is a fallback error handler
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'POST /api/resume-agent-run',
      'POST /api/test-automation',
      'GET /api/auth-script',
      'ALL /api/v1/* (Codegen API Proxy)'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🤖 Automation backend server running on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8080'
  });

  console.log(`🤖 Automation backend server running on port ${PORT}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:8080'}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /health`);
  console.log(`   POST /api/resume-agent-run`);
  console.log(`   POST /api/test-automation`);
  console.log(`   GET  /api/auth-script`);
  console.log(`   ALL  /api/v1/* (Codegen API Proxy)`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;
