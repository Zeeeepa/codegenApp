import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import database from './database.js';

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
app.get('/health', async (req, res) => {
  const dbHealth = await database.healthCheck();
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: dbHealth
  });
});

// Database endpoints
app.get('/api/database/health', async (req, res) => {
  try {
    const health = await database.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save agent run to database
app.post('/api/database/agent-runs', async (req, res) => {
  try {
    const agentRun = await database.saveAgentRun(req.body);
    res.json(agentRun);
  } catch (error) {
    console.error('❌ Error saving agent run:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get agent runs from database
app.get('/api/database/agent-runs/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const agentRuns = await database.getAgentRuns(parseInt(organizationId), parseInt(limit), parseInt(offset));
    res.json(agentRuns);
  } catch (error) {
    console.error('❌ Error getting agent runs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single agent run
app.get('/api/database/agent-run/:id', async (req, res) => {
  try {
    const agentRun = await database.getAgentRun(parseInt(req.params.id));
    if (!agentRun) {
      return res.status(404).json({ error: 'Agent run not found' });
    }
    res.json(agentRun);
  } catch (error) {
    console.error('❌ Error getting agent run:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send message to agent run
app.post('/api/database/agent-runs/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { message, messageType = 'user', data = {} } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const savedMessage = await database.saveMessage(parseInt(id), message, messageType, data);
    res.json(savedMessage);
  } catch (error) {
    console.error('❌ Error saving message:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get messages for agent run
app.get('/api/database/agent-runs/:id/messages', async (req, res) => {
  try {
    const messages = await database.getMessages(parseInt(req.params.id));
    res.json(messages);
  } catch (error) {
    console.error('❌ Error getting messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// Database configuration endpoints
app.post('/api/database/config', async (req, res) => {
  try {
    const config = await database.saveDatabaseConfig(req.body);
    res.json(config);
  } catch (error) {
    console.error('❌ Error saving database config:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/database/configs', async (req, res) => {
  try {
    const configs = await database.getDatabaseConfigs();
    res.json(configs);
  } catch (error) {
    console.error('❌ Error getting database configs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test database connection with provided config
app.post('/api/database/test-connection', async (req, res) => {
  try {
    const { host, port, database_name, username, password } = req.body;
    
    // Create temporary connection to test
    const testConfig = {
      host,
      port: parseInt(port),
      database: database_name,
      user: username,
      password,
      connectionTimeoutMillis: 5000,
    };
    
    const { Pool } = await import('pg');
    const testPool = new Pool(testConfig);
    
    try {
      const client = await testPool.connect();
      await client.query('SELECT NOW()');
      client.release();
      await testPool.end();
      
      res.json({ success: true, message: 'Connection successful' });
    } catch (testError) {
      await testPool.end();
      throw testError;
    }
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    res.status(400).json({ success: false, error: error.message });
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

app.listen(PORT, async () => {
  console.log(`🚀 Proxy server running on port ${PORT}`);
  console.log(`🎯 Proxying to: ${CODEGEN_API_BASE}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  
  // Initialize database connection
  if (process.env.DB_HOST) {
    console.log('🔄 Initializing database connection...');
    const connected = await database.connect();
    if (connected) {
      console.log('✅ Database ready for use');
    } else {
      console.log('⚠️  Database connection failed - running without database features');
    }
  } else {
    console.log('ℹ️  No database configuration found - running without database features');
    console.log('ℹ️  Set DB_HOST, DB_NAME, DB_USER, DB_PASSWORD environment variables to enable database');
  }
});
