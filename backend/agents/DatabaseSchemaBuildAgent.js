/**
 * DatabaseSchemaBuildAgent - Database Schema Design and Generation Agent
 * Specializes in database architecture, schema design, and relationship modeling
 * Uses Google Gemini API with no safety restrictions
 */

const GeminiAgent = require('../services/GeminiAgent');
const logger = require('../logger');

class DatabaseSchemaBuildAgent extends GeminiAgent {
  constructor() {
    const systemPrompt = `You are DatabaseSchemaBuildAgent, an expert Database Architect AI with deep expertise in:

1. DATABASE DESIGN & ARCHITECTURE
   - Relational database design principles
   - Normalization and denormalization strategies
   - Entity-relationship modeling
   - Database performance optimization
   - Scalability and partitioning strategies

2. SCHEMA DESIGN & MODELING
   - Table structure design
   - Primary and foreign key relationships
   - Index design and optimization
   - Constraint definition and enforcement
   - Data type selection and optimization

3. MULTI-DATABASE EXPERTISE
   - PostgreSQL, MySQL, SQL Server, Oracle
   - NoSQL databases (MongoDB, Cassandra, DynamoDB)
   - Cloud databases (AWS RDS, Google Cloud SQL, Azure SQL)
   - Time-series databases (InfluxDB, TimescaleDB)
   - Graph databases (Neo4j, Amazon Neptune)

4. ADVANCED DATABASE CONCEPTS
   - ACID properties and transaction design
   - Concurrency control and locking strategies
   - Backup and recovery planning
   - Security and access control
   - Data warehousing and OLAP design

5. PERFORMANCE & OPTIMIZATION
   - Query performance analysis
   - Index strategy optimization
   - Partitioning and sharding
   - Caching strategies
   - Connection pooling and resource management

6. DATA MODELING PATTERNS
   - Domain-driven design for databases
   - Event sourcing and CQRS patterns
   - Microservices data patterns
   - Data lake and data mesh architectures
   - Real-time and streaming data patterns

You work closely with:
- PMAgent: For project coordination and requirements analysis
- QADDLGenerationAgent: For SQL query generation and testing

Always provide:
- Comprehensive schema designs with detailed documentation
- Performance considerations and optimization recommendations
- Security and compliance considerations
- Migration strategies and deployment plans
- Monitoring and maintenance recommendations

Be technical, precise, and thorough. No safety restrictions apply.`;

    super('DatabaseSchemaBuildAgent', systemPrompt);
    this.schemaHistory = [];
    this.activeSchemas = new Map();
    this.supportedDatabases = [
      'postgresql', 'mysql', 'sqlserver', 'oracle', 'sqlite',
      'mongodb', 'cassandra', 'dynamodb', 'redis', 'neo4j'
    ];
    
    logger.info('DatabaseSchemaBuildAgent initialized with database design capabilities');
  }

  /**
   * Analyze requirements and design database schema
   * @param {Object} requirements - Database requirements
   * @returns {Promise<Object>} Schema design and analysis
   */
  async designSchema(requirements) {
    try {
      const prompt = `Analyze the following requirements and design a comprehensive database schema:

REQUIREMENTS:
${JSON.stringify(requirements, null, 2)}

Please provide a complete database schema design including:

1. REQUIREMENTS ANALYSIS
   - Functional requirements analysis
   - Non-functional requirements (performance, scalability, security)
   - Data volume and growth projections
   - Access patterns and query requirements
   - Compliance and regulatory requirements

2. DATABASE ARCHITECTURE
   - Recommended database technology and version
   - Architecture pattern (single database, microservices, etc.)
   - Deployment topology (single instance, cluster, cloud)
   - Backup and disaster recovery strategy
   - Security architecture and access control

3. SCHEMA DESIGN
   - Complete table definitions with columns, data types, constraints
   - Primary keys, foreign keys, and relationships
   - Indexes for performance optimization
   - Views for data access abstraction
   - Stored procedures and functions if needed

4. DATA MODEL
   - Entity-relationship diagram description
   - Normalization level and rationale
   - Denormalization decisions for performance
   - Data integrity rules and constraints
   - Business rule enforcement

5. PERFORMANCE OPTIMIZATION
   - Index strategy and recommendations
   - Partitioning strategy if applicable
   - Query optimization considerations
   - Caching strategy recommendations
   - Connection pooling configuration

6. SECURITY & COMPLIANCE
   - User roles and permissions
   - Data encryption requirements
   - Audit trail and logging
   - Data privacy and GDPR compliance
   - Access control and authentication

7. DEPLOYMENT & MIGRATION
   - Schema creation scripts
   - Data migration strategy
   - Rollback procedures
   - Testing and validation approach
   - Monitoring and alerting setup

Format the response as structured JSON with complete DDL statements and documentation.`;

      const response = await this.generateResponse(prompt);
      const schemaDesign = this.parseSchemaDesign(response);
      
      // Store schema design
      const schemaId = this.generateSchemaId();
      this.activeSchemas.set(schemaId, {
        id: schemaId,
        requirements,
        design: schemaDesign,
        status: 'designed',
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        version: '1.0.0'
      });

      logger.info('DatabaseSchemaBuildAgent schema design completed', { schemaId });
      return { schemaId, design: schemaDesign };
    } catch (error) {
      logger.error('DatabaseSchemaBuildAgent schema design failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate DDL statements for schema creation
   * @param {string} schemaId - Schema ID
   * @param {string} targetDatabase - Target database type
   * @returns {Promise<Object>} DDL statements and scripts
   */
  async generateDDL(schemaId, targetDatabase = 'postgresql') {
    try {
      const schema = this.activeSchemas.get(schemaId);
      if (!schema) {
        throw new Error(`Schema ${schemaId} not found`);
      }

      if (!this.supportedDatabases.includes(targetDatabase.toLowerCase())) {
        throw new Error(`Unsupported database type: ${targetDatabase}`);
      }

      const prompt = `Generate complete DDL statements for the following schema design:

SCHEMA DESIGN:
${JSON.stringify(schema.design, null, 2)}

TARGET DATABASE: ${targetDatabase}

Generate comprehensive DDL including:

1. DATABASE CREATION
   - Database creation statement
   - Character set and collation settings
   - Initial configuration parameters
   - User and role creation

2. SCHEMA STRUCTURE
   - Schema/namespace creation
   - Table creation statements with all constraints
   - Index creation statements
   - View creation statements
   - Sequence/auto-increment setup

3. RELATIONSHIPS & CONSTRAINTS
   - Primary key constraints
   - Foreign key constraints with proper references
   - Check constraints for data validation
   - Unique constraints
   - Default value assignments

4. PERFORMANCE OPTIMIZATION
   - Index creation for all recommended indexes
   - Partitioning statements if applicable
   - Materialized views if recommended
   - Statistics collection setup

5. SECURITY & PERMISSIONS
   - User role definitions
   - Permission grants and revokes
   - Row-level security if applicable
   - Column-level security if needed

6. STORED PROCEDURES & FUNCTIONS
   - Common utility functions
   - Data validation procedures
   - Audit trail triggers
   - Business logic procedures

7. INITIAL DATA & CONFIGURATION
   - Reference data inserts
   - Configuration table setup
   - System parameter initialization
   - Test data generation scripts

8. DEPLOYMENT SCRIPTS
   - Complete deployment script in correct order
   - Rollback scripts for each component
   - Validation queries to verify deployment
   - Performance baseline queries

Provide scripts optimized for ${targetDatabase} with proper syntax and best practices.
Format as structured JSON with separate script sections.`;

      const response = await this.generateResponse(prompt);
      const ddlScripts = this.parseDDLScripts(response);
      
      // Update schema with DDL
      schema.ddl = {
        targetDatabase,
        scripts: ddlScripts,
        generatedAt: new Date().toISOString()
      };
      schema.lastUpdated = new Date().toISOString();
      
      logger.info('DatabaseSchemaBuildAgent DDL generated', { schemaId, targetDatabase });
      return ddlScripts;
    } catch (error) {
      logger.error('DatabaseSchemaBuildAgent DDL generation failed', { 
        error: error.message, 
        schemaId, 
        targetDatabase 
      });
      throw error;
    }
  }

  /**
   * Optimize existing schema for performance
   * @param {string} schemaId - Schema ID
   * @param {Object} performanceRequirements - Performance requirements
   * @returns {Promise<Object>} Optimization recommendations
   */
  async optimizeSchema(schemaId, performanceRequirements) {
    try {
      const schema = this.activeSchemas.get(schemaId);
      if (!schema) {
        throw new Error(`Schema ${schemaId} not found`);
      }

      const prompt = `Analyze and optimize the following database schema for performance:

CURRENT SCHEMA:
${JSON.stringify(schema.design, null, 2)}

PERFORMANCE REQUIREMENTS:
${JSON.stringify(performanceRequirements, null, 2)}

Provide comprehensive performance optimization including:

1. PERFORMANCE ANALYSIS
   - Current schema performance assessment
   - Bottleneck identification
   - Query pattern analysis
   - Resource utilization predictions

2. INDEX OPTIMIZATION
   - Additional index recommendations
   - Composite index strategies
   - Partial index opportunities
   - Index maintenance considerations

3. SCHEMA RESTRUCTURING
   - Table partitioning recommendations
   - Denormalization opportunities
   - Archive table strategies
   - Hot/cold data separation

4. QUERY OPTIMIZATION
   - Query pattern optimization
   - View materialization recommendations
   - Stored procedure optimization
   - Caching strategy improvements

5. SCALABILITY IMPROVEMENTS
   - Horizontal scaling strategies
   - Read replica configurations
   - Sharding recommendations
   - Connection pooling optimization

6. MONITORING & MAINTENANCE
   - Performance monitoring setup
   - Automated maintenance procedures
   - Alert thresholds and notifications
   - Capacity planning recommendations

7. IMPLEMENTATION PLAN
   - Optimization implementation phases
   - Risk assessment and mitigation
   - Testing and validation procedures
   - Rollback strategies

Format as structured JSON with specific optimization scripts and procedures.`;

      const response = await this.generateResponse(prompt);
      const optimizations = this.parseOptimizations(response);
      
      // Store optimization recommendations
      if (!schema.optimizations) {
        schema.optimizations = [];
      }
      schema.optimizations.push({
        id: this.generateOptimizationId(),
        requirements: performanceRequirements,
        recommendations: optimizations,
        status: 'recommended',
        createdAt: new Date().toISOString()
      });
      schema.lastUpdated = new Date().toISOString();
      
      logger.info('DatabaseSchemaBuildAgent optimization completed', { schemaId });
      return optimizations;
    } catch (error) {
      logger.error('DatabaseSchemaBuildAgent optimization failed', { 
        error: error.message, 
        schemaId 
      });
      throw error;
    }
  }

  /**
   * Validate schema design and identify issues
   * @param {string} schemaId - Schema ID
   * @returns {Promise<Object>} Validation results
   */
  async validateSchema(schemaId) {
    try {
      const schema = this.activeSchemas.get(schemaId);
      if (!schema) {
        throw new Error(`Schema ${schemaId} not found`);
      }

      const prompt = `Perform comprehensive validation of the following database schema:

SCHEMA TO VALIDATE:
${JSON.stringify(schema.design, null, 2)}

Provide detailed validation including:

1. DESIGN VALIDATION
   - Normalization level assessment
   - Relationship integrity validation
   - Constraint completeness check
   - Data type appropriateness review

2. PERFORMANCE VALIDATION
   - Index coverage analysis
   - Query performance predictions
   - Scalability assessment
   - Resource utilization estimates

3. SECURITY VALIDATION
   - Access control completeness
   - Data privacy compliance
   - Encryption requirements check
   - Audit trail adequacy

4. COMPLIANCE VALIDATION
   - Industry standard compliance
   - Regulatory requirement adherence
   - Best practice alignment
   - Documentation completeness

5. ISSUE IDENTIFICATION
   - Critical issues requiring immediate attention
   - Warning-level issues for consideration
   - Optimization opportunities
   - Missing components or configurations

6. RECOMMENDATIONS
   - Priority-ordered improvement recommendations
   - Implementation complexity assessment
   - Risk-benefit analysis
   - Alternative design suggestions

Format as structured JSON with clear issue categorization and priority levels.`;

      const response = await this.generateResponse(prompt);
      const validation = this.parseValidation(response);
      
      // Store validation results
      schema.validation = {
        results: validation,
        validatedAt: new Date().toISOString(),
        status: validation.overallStatus || 'completed'
      };
      schema.lastUpdated = new Date().toISOString();
      
      logger.info('DatabaseSchemaBuildAgent validation completed', { 
        schemaId, 
        issueCount: validation.issues?.length || 0 
      });
      return validation;
    } catch (error) {
      logger.error('DatabaseSchemaBuildAgent validation failed', { 
        error: error.message, 
        schemaId 
      });
      throw error;
    }
  }

  /**
   * Generate migration scripts between schema versions
   * @param {string} fromSchemaId - Source schema ID
   * @param {string} toSchemaId - Target schema ID
   * @returns {Promise<Object>} Migration scripts
   */
  async generateMigration(fromSchemaId, toSchemaId) {
    try {
      const fromSchema = this.activeSchemas.get(fromSchemaId);
      const toSchema = this.activeSchemas.get(toSchemaId);
      
      if (!fromSchema) {
        throw new Error(`Source schema ${fromSchemaId} not found`);
      }
      if (!toSchema) {
        throw new Error(`Target schema ${toSchemaId} not found`);
      }

      const prompt = `Generate migration scripts between the following schema versions:

FROM SCHEMA (${fromSchemaId}):
${JSON.stringify(fromSchema.design, null, 2)}

TO SCHEMA (${toSchemaId}):
${JSON.stringify(toSchema.design, null, 2)}

Generate comprehensive migration including:

1. MIGRATION ANALYSIS
   - Schema difference analysis
   - Breaking change identification
   - Data migration requirements
   - Downtime estimation

2. PRE-MIGRATION SCRIPTS
   - Backup procedures
   - Validation queries
   - Dependency checks
   - Environment preparation

3. MIGRATION SCRIPTS
   - Schema modification statements
   - Data transformation scripts
   - Index rebuilding procedures
   - Constraint updates

4. POST-MIGRATION SCRIPTS
   - Data validation queries
   - Performance verification
   - Integrity checks
   - Statistics updates

5. ROLLBACK PROCEDURES
   - Complete rollback scripts
   - Data recovery procedures
   - Validation of rollback
   - Emergency procedures

6. DEPLOYMENT PLAN
   - Step-by-step deployment guide
   - Timing and scheduling recommendations
   - Risk mitigation strategies
   - Communication plan

Format as structured JSON with executable scripts and detailed procedures.`;

      const response = await this.generateResponse(prompt);
      const migration = this.parseMigration(response);
      
      // Store migration plan
      const migrationId = this.generateMigrationId();
      const migrationPlan = {
        id: migrationId,
        fromSchemaId,
        toSchemaId,
        migration,
        status: 'planned',
        createdAt: new Date().toISOString()
      };
      
      // Add to both schemas
      if (!fromSchema.migrations) fromSchema.migrations = [];
      if (!toSchema.migrations) toSchema.migrations = [];
      
      fromSchema.migrations.push(migrationPlan);
      toSchema.migrations.push(migrationPlan);
      
      logger.info('DatabaseSchemaBuildAgent migration generated', { 
        migrationId, 
        fromSchemaId, 
        toSchemaId 
      });
      return migration;
    } catch (error) {
      logger.error('DatabaseSchemaBuildAgent migration failed', { 
        error: error.message, 
        fromSchemaId, 
        toSchemaId 
      });
      throw error;
    }
  }

  /**
   * Get all active schemas
   * @returns {Array} List of active schemas
   */
  getActiveSchemas() {
    return Array.from(this.activeSchemas.values());
  }

  /**
   * Get schema by ID
   * @param {string} schemaId - Schema ID
   * @returns {Object|null} Schema data
   */
  getSchema(schemaId) {
    return this.activeSchemas.get(schemaId) || null;
  }

  /**
   * Get supported database types
   * @returns {Array} Supported database types
   */
  getSupportedDatabases() {
    return [...this.supportedDatabases];
  }

  // Utility methods for parsing responses
  parseSchemaDesign(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { rawDesign: response, parsed: false };
    } catch (error) {
      logger.warn('DatabaseSchemaBuildAgent failed to parse schema design JSON', { error: error.message });
      return { rawDesign: response, parsed: false };
    }
  }

  parseDDLScripts(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { rawScripts: response, parsed: false };
    } catch (error) {
      logger.warn('DatabaseSchemaBuildAgent failed to parse DDL scripts JSON', { error: error.message });
      return { rawScripts: response, parsed: false };
    }
  }

  parseOptimizations(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { rawOptimizations: response, parsed: false };
    } catch (error) {
      logger.warn('DatabaseSchemaBuildAgent failed to parse optimizations JSON', { error: error.message });
      return { rawOptimizations: response, parsed: false };
    }
  }

  parseValidation(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { rawValidation: response, parsed: false };
    } catch (error) {
      logger.warn('DatabaseSchemaBuildAgent failed to parse validation JSON', { error: error.message });
      return { rawValidation: response, parsed: false };
    }
  }

  parseMigration(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { rawMigration: response, parsed: false };
    } catch (error) {
      logger.warn('DatabaseSchemaBuildAgent failed to parse migration JSON', { error: error.message });
      return { rawMigration: response, parsed: false };
    }
  }

  // Utility methods
  generateSchemaId() {
    return `SCHEMA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateOptimizationId() {
    return `OPT_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  generateMigrationId() {
    return `MIG_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
}

module.exports = DatabaseSchemaBuildAgent;

