const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const automationService = require('./automation-service');
const logger = require('./logger');

// Import AI Agent Routes
const pmAgentRoutes = require('./routes/pm-agent');
const schemaAgentRoutes = require('./routes/schema-agent');
const qaAgentRoutes = require('./routes/qa-agent');
const orchestratorRoutes = require('./routes/orchestrator');

const app = express();
const PORT = process.env.PORT || 3500;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'codegen-automation-backend',
    features: {
      automation: true,
      aiAgents: true,
      geminiApi: !!process.env.GOOGLE_API_KEY
    }
  });
});

// AI Agent Routes
app.use('/api/pm-agent', pmAgentRoutes);
app.use('/api/schema-agent', schemaAgentRoutes);
app.use('/api/qa-agent', qaAgentRoutes);
app.use('/api/orchestrator', orchestratorRoutes);

// AI Agents status endpoint
app.get('/api/agents/status', async (req, res) => {
  try {
    logger.info('AI Agents status request');

    const status = {
      geminiApi: {
        configured: !!process.env.GOOGLE_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
        safetySettings: process.env.GEMINI_SAFETY_SETTINGS || 'none'
      },
      agents: {
        pmAgent: { status: 'available', description: 'Project Manager Agent' },
        schemaAgent: { status: 'available', description: 'Database Schema Build Agent' },
        qaAgent: { status: 'available', description: 'QA DDL Generation Agent' }
      },
      orchestrator: { status: 'available', description: 'Multi-Agent Workflow Orchestrator' },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('AI Agents status failed', { error: error.message });
    res.status(500).json({
      error: 'Status retrieval failed',
      message: error.message
    });
  }
});

// Resume agent run endpoint
app.post('/api/resume-agent-run', async (req, res) => {
  try {
    const { agentRunId, organizationId, prompt, authContext } = req.body;

    // Validate required fields
    if (!agentRunId || !organizationId || !prompt) {
      return res.status(400).json({
        error: 'Missing required fields: agentRunId, organizationId, prompt'
      });
    }

    logger.info('Resume agent run request', {
      agentRunId,
      organizationId,
      promptLength: prompt.length,
      hasAuth: !!authContext
    });

    // Call automation service
    const result = await automationService.resumeAgentRun({
      agentRunId,
      organizationId,
      prompt,
      authContext
    });

    logger.info('Resume agent run completed', {
      agentRunId,
      success: result.success,
      duration: result.duration
    });

    res.json(result);

  } catch (error) {
    logger.error('Resume agent run failed', {
      error: error.message,
      stack: error.stack,
      agentRunId: req.body.agentRunId
    });

    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      success: false
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });

  res.status(500).json({
    error: 'Internal server error',
    success: false
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    success: false
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Codegen Automation Backend started on port ${PORT}`, {
    port: PORT,
    nodeEnv: process.env.NODE_ENV,
    frontendUrl: process.env.FRONTEND_URL,
    geminiConfigured: !!process.env.GOOGLE_API_KEY,
    features: ['automation', 'ai-agents', 'orchestrator']
  });
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
