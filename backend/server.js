const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const automationService = require('./automation-service');
const logger = require('./logger');

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
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
  logger.info(`Automation backend server running on port ${PORT}`);
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
