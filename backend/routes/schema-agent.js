/**
 * DatabaseSchemaBuildAgent API Routes
 * Express routes for Database Schema Build Agent operations
 */

const express = require('express');
const DatabaseSchemaBuildAgent = require('../agents/DatabaseSchemaBuildAgent');
const logger = require('../logger');

const router = express.Router();
const schemaAgent = new DatabaseSchemaBuildAgent();

/**
 * Design database schema
 * POST /api/schema-agent/design-schema
 */
router.post('/design-schema', async (req, res) => {
  try {
    const { requirements } = req.body;
    
    if (!requirements) {
      return res.status(400).json({
        error: 'Missing required field: requirements'
      });
    }

    logger.info('SchemaAgent design schema request', { 
      requirementsKeys: Object.keys(requirements) 
    });

    const result = await schemaAgent.designSchema(requirements);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('SchemaAgent design schema failed', { error: error.message });
    res.status(500).json({
      error: 'Schema design failed',
      message: error.message
    });
  }
});

/**
 * Generate DDL statements
 * POST /api/schema-agent/generate-ddl
 */
router.post('/generate-ddl', async (req, res) => {
  try {
    const { schemaId, targetDatabase = 'postgresql' } = req.body;
    
    if (!schemaId) {
      return res.status(400).json({
        error: 'Missing required field: schemaId'
      });
    }

    logger.info('SchemaAgent generate DDL request', { schemaId, targetDatabase });

    const result = await schemaAgent.generateDDL(schemaId, targetDatabase);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('SchemaAgent generate DDL failed', { 
      error: error.message, 
      schemaId: req.body.schemaId,
      targetDatabase: req.body.targetDatabase 
    });
    res.status(500).json({
      error: 'DDL generation failed',
      message: error.message
    });
  }
});

/**
 * Optimize schema for performance
 * POST /api/schema-agent/optimize-schema
 */
router.post('/optimize-schema', async (req, res) => {
  try {
    const { schemaId, performanceRequirements } = req.body;
    
    if (!schemaId || !performanceRequirements) {
      return res.status(400).json({
        error: 'Missing required fields: schemaId, performanceRequirements'
      });
    }

    logger.info('SchemaAgent optimize schema request', { schemaId });

    const result = await schemaAgent.optimizeSchema(schemaId, performanceRequirements);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('SchemaAgent optimize schema failed', { 
      error: error.message, 
      schemaId: req.body.schemaId 
    });
    res.status(500).json({
      error: 'Schema optimization failed',
      message: error.message
    });
  }
});

/**
 * Validate schema design
 * POST /api/schema-agent/validate-schema
 */
router.post('/validate-schema', async (req, res) => {
  try {
    const { schemaId } = req.body;
    
    if (!schemaId) {
      return res.status(400).json({
        error: 'Missing required field: schemaId'
      });
    }

    logger.info('SchemaAgent validate schema request', { schemaId });

    const result = await schemaAgent.validateSchema(schemaId);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('SchemaAgent validate schema failed', { 
      error: error.message, 
      schemaId: req.body.schemaId 
    });
    res.status(500).json({
      error: 'Schema validation failed',
      message: error.message
    });
  }
});

/**
 * Generate migration scripts
 * POST /api/schema-agent/generate-migration
 */
router.post('/generate-migration', async (req, res) => {
  try {
    const { fromSchemaId, toSchemaId } = req.body;
    
    if (!fromSchemaId || !toSchemaId) {
      return res.status(400).json({
        error: 'Missing required fields: fromSchemaId, toSchemaId'
      });
    }

    logger.info('SchemaAgent generate migration request', { fromSchemaId, toSchemaId });

    const result = await schemaAgent.generateMigration(fromSchemaId, toSchemaId);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('SchemaAgent generate migration failed', { 
      error: error.message, 
      fromSchemaId: req.body.fromSchemaId,
      toSchemaId: req.body.toSchemaId 
    });
    res.status(500).json({
      error: 'Migration generation failed',
      message: error.message
    });
  }
});

/**
 * Get all active schemas
 * GET /api/schema-agent/schemas
 */
router.get('/schemas', async (req, res) => {
  try {
    logger.info('SchemaAgent get schemas request');

    const schemas = schemaAgent.getActiveSchemas();
    
    res.json({
      success: true,
      data: schemas,
      count: schemas.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('SchemaAgent get schemas failed', { error: error.message });
    res.status(500).json({
      error: 'Schemas retrieval failed',
      message: error.message
    });
  }
});

/**
 * Get specific schema
 * GET /api/schema-agent/schemas/:schemaId
 */
router.get('/schemas/:schemaId', async (req, res) => {
  try {
    const { schemaId } = req.params;
    
    logger.info('SchemaAgent get schema request', { schemaId });

    const schema = schemaAgent.getSchema(schemaId);
    
    if (!schema) {
      return res.status(404).json({
        error: 'Schema not found',
        schemaId
      });
    }
    
    res.json({
      success: true,
      data: schema,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('SchemaAgent get schema failed', { 
      error: error.message, 
      schemaId: req.params.schemaId 
    });
    res.status(500).json({
      error: 'Schema retrieval failed',
      message: error.message
    });
  }
});

/**
 * Get supported database types
 * GET /api/schema-agent/supported-databases
 */
router.get('/supported-databases', async (req, res) => {
  try {
    logger.info('SchemaAgent get supported databases request');

    const databases = schemaAgent.getSupportedDatabases();
    
    res.json({
      success: true,
      data: databases,
      count: databases.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('SchemaAgent get supported databases failed', { error: error.message });
    res.status(500).json({
      error: 'Supported databases retrieval failed',
      message: error.message
    });
  }
});

/**
 * Get SchemaAgent statistics
 * GET /api/schema-agent/stats
 */
router.get('/stats', async (req, res) => {
  try {
    logger.info('SchemaAgent stats request');

    const stats = schemaAgent.getStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('SchemaAgent stats failed', { error: error.message });
    res.status(500).json({
      error: 'Statistics retrieval failed',
      message: error.message
    });
  }
});

/**
 * Clear SchemaAgent conversation history
 * POST /api/schema-agent/clear-history
 */
router.post('/clear-history', async (req, res) => {
  try {
    logger.info('SchemaAgent clear history request');

    schemaAgent.clearHistory();
    
    res.json({
      success: true,
      message: 'Conversation history cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('SchemaAgent clear history failed', { error: error.message });
    res.status(500).json({
      error: 'History clearing failed',
      message: error.message
    });
  }
});

module.exports = router;

