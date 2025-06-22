import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Database {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  // Initialize database connection
  async connect(config = null) {
    try {
      const dbConfig = config || {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'codegenapp',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        max: 10, // Maximum number of connections
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };

      this.pool = new Pool(dbConfig);
      
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      this.isConnected = true;
      console.log('✅ Database connected successfully');
      
      // Initialize schema
      await this.initializeSchema();
      
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  // Initialize database schema
  async initializeSchema() {
    try {
      const schemaPath = path.join(__dirname, 'database.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      await this.pool.query(schema);
      console.log('✅ Database schema initialized');
    } catch (error) {
      console.error('❌ Schema initialization failed:', error.message);
      throw error;
    }
  }

  // Execute query
  async query(text, params = []) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }
    
    try {
      const result = await this.pool.query(text, params);
      return result;
    } catch (error) {
      console.error('❌ Database query error:', error.message);
      throw error;
    }
  }

  // Get a client for transactions
  async getClient() {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }
    return await this.pool.connect();
  }

  // Close database connection
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      console.log('✅ Database connection closed');
    }
  }

  // Health check
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', error: 'Not connected to database' };
      }
      
      const result = await this.query('SELECT NOW() as current_time');
      return { 
        status: 'connected', 
        timestamp: result.rows[0].current_time,
        pool_total: this.pool.totalCount,
        pool_idle: this.pool.idleCount,
        pool_waiting: this.pool.waitingCount
      };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  // Agent Runs CRUD operations
  async saveAgentRun(agentRun) {
    const query = `
      INSERT INTO agent_runs (external_id, organization_id, status, prompt, result, web_url, data)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (external_id) 
      DO UPDATE SET 
        status = EXCLUDED.status,
        result = EXCLUDED.result,
        updated_at = CURRENT_TIMESTAMP,
        data = EXCLUDED.data
      RETURNING *
    `;
    
    const values = [
      agentRun.id,
      agentRun.organization_id,
      agentRun.status,
      agentRun.prompt || null,
      agentRun.result || null,
      agentRun.web_url,
      JSON.stringify(agentRun.data || {})
    ];
    
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async getAgentRuns(organizationId, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM agent_runs 
      WHERE organization_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    
    const result = await this.query(query, [organizationId, limit, offset]);
    return result.rows;
  }

  async getAgentRun(externalId) {
    const query = 'SELECT * FROM agent_runs WHERE external_id = $1';
    const result = await this.query(query, [externalId]);
    return result.rows[0];
  }

  // Messages CRUD operations
  async saveMessage(agentRunId, messageText, messageType = 'user', data = {}) {
    // First get the internal agent_run id
    const agentRunQuery = 'SELECT id FROM agent_runs WHERE external_id = $1';
    const agentRunResult = await this.query(agentRunQuery, [agentRunId]);
    
    if (agentRunResult.rows.length === 0) {
      throw new Error(`Agent run with external_id ${agentRunId} not found`);
    }
    
    const internalId = agentRunResult.rows[0].id;
    
    const query = `
      INSERT INTO messages (agent_run_id, message_text, message_type, data)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const values = [internalId, messageText, messageType, JSON.stringify(data)];
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async getMessages(agentRunId) {
    const query = `
      SELECT m.* FROM messages m
      JOIN agent_runs ar ON m.agent_run_id = ar.id
      WHERE ar.external_id = $1
      ORDER BY m.created_at ASC
    `;
    
    const result = await this.query(query, [agentRunId]);
    return result.rows;
  }

  // Database configuration operations
  async saveDatabaseConfig(config) {
    const query = `
      INSERT INTO database_configs (name, host, port, database_name, username, password_encrypted, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      config.name,
      config.host,
      config.port,
      config.database_name,
      config.username,
      config.password_encrypted, // Should be encrypted before passing here
      config.is_active || false
    ];
    
    const result = await this.query(query, values);
    return result.rows[0];
  }

  async getDatabaseConfigs() {
    const query = 'SELECT id, name, host, port, database_name, username, is_active, created_at FROM database_configs ORDER BY created_at DESC';
    const result = await this.query(query);
    return result.rows;
  }
}

// Create singleton instance
const database = new Database();

export default database;
