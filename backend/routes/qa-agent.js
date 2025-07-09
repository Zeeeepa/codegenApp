/**
 * QADDLGenerationAgent API Routes
 * Express routes for SQL Query and DDL Generation Agent operations
 */

const express = require('express');
const QADDLGenerationAgent = require('../agents/QADDLGenerationAgent');
const logger = require('../logger');

const router = express.Router();
const qaAgent = new QADDLGenerationAgent();

/**
 * Generate SQL queries
 * POST /api/qa-agent/generate-queries
 */
router.post('/generate-queries', async (req, res) => {
  try {
    const { requirements } = req.body;
    
    if (!requirements) {
      return res.status(400).json({
        error: 'Missing required field: requirements'
      });
    }

    logger.info('QAAgent generate queries request', { 
      requirementsKeys: Object.keys(requirements) 
    });

    const result = await qaAgent.generateQueries(requirements);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('QAAgent generate queries failed', { error: error.message });
    res.status(500).json({
      error: 'Query generation failed',
      message: error.message
    });
  }
});

/**
 * Generate DDL statements
 * POST /api/qa-agent/generate-ddl
 */
router.post('/generate-ddl', async (req, res) => {
  try {
    const { ddlRequirements } = req.body;
    
    if (!ddlRequirements) {
      return res.status(400).json({
        error: 'Missing required field: ddlRequirements'
      });
    }

    logger.info('QAAgent generate DDL request', { 
      requirementsKeys: Object.keys(ddlRequirements) 
    });

    const result = await qaAgent.generateDDL(ddlRequirements);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('QAAgent generate DDL failed', { error: error.message });
    res.status(500).json({
      error: 'DDL generation failed',
      message: error.message
    });
  }
});

/**
 * Create test suite
 * POST /api/qa-agent/create-test-suite
 */
router.post('/create-test-suite', async (req, res) => {
  try {
    const { testRequirements } = req.body;
    
    if (!testRequirements) {
      return res.status(400).json({
        error: 'Missing required field: testRequirements'
      });
    }

    logger.info('QAAgent create test suite request', { 
      requirementsKeys: Object.keys(testRequirements) 
    });

    const result = await qaAgent.createTestSuite(testRequirements);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('QAAgent create test suite failed', { error: error.message });
    res.status(500).json({
      error: 'Test suite creation failed',
      message: error.message
    });
  }
});

/**
 * Optimize queries
 * POST /api/qa-agent/optimize-queries
 */
router.post('/optimize-queries', async (req, res) => {
  try {
    const { queryId, optimizationGoals } = req.body;
    
    if (!queryId || !optimizationGoals) {
      return res.status(400).json({
        error: 'Missing required fields: queryId, optimizationGoals'
      });
    }

    logger.info('QAAgent optimize queries request', { queryId });

    const result = await qaAgent.optimizeQueries(queryId, optimizationGoals);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('QAAgent optimize queries failed', { 
      error: error.message, 
      queryId: req.body.queryId 
    });
    res.status(500).json({
      error: 'Query optimization failed',
      message: error.message
    });
  }
});

/**
 * Validate SQL
 * POST /api/qa-agent/validate-sql
 */
router.post('/validate-sql', async (req, res) => {
  try {
    const { sql, dialect = 'postgresql' } = req.body;
    
    if (!sql) {
      return res.status(400).json({
        error: 'Missing required field: sql'
      });
    }

    logger.info('QAAgent validate SQL request', { 
      dialect, 
      sqlLength: sql.length 
    });

    const result = await qaAgent.validateSQL(sql, dialect);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('QAAgent validate SQL failed', { 
      error: error.message, 
      dialect: req.body.dialect 
    });
    res.status(500).json({
      error: 'SQL validation failed',
      message: error.message
    });
  }
});

/**
 * Generate test data
 * POST /api/qa-agent/generate-test-data
 */
router.post('/generate-test-data', async (req, res) => {
  try {
    const { dataRequirements } = req.body;
    
    if (!dataRequirements) {
      return res.status(400).json({
        error: 'Missing required field: dataRequirements'
      });
    }

    logger.info('QAAgent generate test data request', { 
      requirementsKeys: Object.keys(dataRequirements) 
    });

    const result = await qaAgent.generateTestData(dataRequirements);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('QAAgent generate test data failed', { error: error.message });
    res.status(500).json({
      error: 'Test data generation failed',
      message: error.message
    });
  }
});

/**
 * Execute test suite
 * POST /api/qa-agent/execute-test-suite
 */
router.post('/execute-test-suite', async (req, res) => {
  try {
    const { suiteId, executionConfig = {} } = req.body;
    
    if (!suiteId) {
      return res.status(400).json({
        error: 'Missing required field: suiteId'
      });
    }

    logger.info('QAAgent execute test suite request', { suiteId });

    const result = await qaAgent.executeTestSuite(suiteId, executionConfig);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('QAAgent execute test suite failed', { 
      error: error.message, 
      suiteId: req.body.suiteId 
    });
    res.status(500).json({
      error: 'Test suite execution failed',
      message: error.message
    });
  }
});

/**
 * Get all active queries
 * GET /api/qa-agent/queries
 */
router.get('/queries', async (req, res) => {
  try {
    logger.info('QAAgent get queries request');

    const queries = qaAgent.getActiveQueries();
    
    res.json({
      success: true,
      data: queries,
      count: queries.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('QAAgent get queries failed', { error: error.message });
    res.status(500).json({
      error: 'Queries retrieval failed',
      message: error.message
    });
  }
});

/**
 * Get specific query
 * GET /api/qa-agent/queries/:queryId
 */
router.get('/queries/:queryId', async (req, res) => {
  try {
    const { queryId } = req.params;
    
    logger.info('QAAgent get query request', { queryId });

    const query = qaAgent.getQuery(queryId);
    
    if (!query) {
      return res.status(404).json({
        error: 'Query not found',
        queryId
      });
    }
    
    res.json({
      success: true,
      data: query,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('QAAgent get query failed', { 
      error: error.message, 
      queryId: req.params.queryId 
    });
    res.status(500).json({
      error: 'Query retrieval failed',
      message: error.message
    });
  }
});

/**
 * Get all test suites
 * GET /api/qa-agent/test-suites
 */
router.get('/test-suites', async (req, res) => {
  try {
    logger.info('QAAgent get test suites request');

    const testSuites = qaAgent.getTestSuites();
    
    res.json({
      success: true,
      data: testSuites,
      count: testSuites.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('QAAgent get test suites failed', { error: error.message });
    res.status(500).json({
      error: 'Test suites retrieval failed',
      message: error.message
    });
  }
});

/**
 * Get specific test suite
 * GET /api/qa-agent/test-suites/:suiteId
 */
router.get('/test-suites/:suiteId', async (req, res) => {
  try {
    const { suiteId } = req.params;
    
    logger.info('QAAgent get test suite request', { suiteId });

    const testSuite = qaAgent.getTestSuite(suiteId);
    
    if (!testSuite) {
      return res.status(404).json({
        error: 'Test suite not found',
        suiteId
      });
    }
    
    res.json({
      success: true,
      data: testSuite,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('QAAgent get test suite failed', { 
      error: error.message, 
      suiteId: req.params.suiteId 
    });
    res.status(500).json({
      error: 'Test suite retrieval failed',
      message: error.message
    });
  }
});

/**
 * Get supported SQL dialects
 * GET /api/qa-agent/supported-dialects
 */
router.get('/supported-dialects', async (req, res) => {
  try {
    logger.info('QAAgent get supported dialects request');

    const dialects = qaAgent.getSupportedDialects();
    
    res.json({
      success: true,
      data: dialects,
      count: dialects.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('QAAgent get supported dialects failed', { error: error.message });
    res.status(500).json({
      error: 'Supported dialects retrieval failed',
      message: error.message
    });
  }
});

/**
 * Get QAAgent statistics
 * GET /api/qa-agent/stats
 */
router.get('/stats', async (req, res) => {
  try {
    logger.info('QAAgent stats request');

    const stats = qaAgent.getStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('QAAgent stats failed', { error: error.message });
    res.status(500).json({
      error: 'Statistics retrieval failed',
      message: error.message
    });
  }
});

/**
 * Clear QAAgent conversation history
 * POST /api/qa-agent/clear-history
 */
router.post('/clear-history', async (req, res) => {
  try {
    logger.info('QAAgent clear history request');

    qaAgent.clearHistory();
    
    res.json({
      success: true,
      message: 'Conversation history cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('QAAgent clear history failed', { error: error.message });
    res.status(500).json({
      error: 'History clearing failed',
      message: error.message
    });
  }
});

module.exports = router;

