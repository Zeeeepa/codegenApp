/**
 * Database connection and initialization
 * Supports both SQLite (development) and PostgreSQL (production)
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseConnection {
  constructor() {
    this.db = null;
    this.isPostgres = false;
  }

  async initialize() {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (databaseUrl && databaseUrl.startsWith('postgresql://')) {
      // PostgreSQL for production
      this.isPostgres = true;
      const { Pool } = pg;
      this.db = new Pool({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      
      console.log('🐘 Connected to PostgreSQL database');
    } else {
      // SQLite for development
      this.isPostgres = false;
      const dbPath = path.join(__dirname, '../../data/codegenapp.db');
      
      // Ensure data directory exists
      const dataDir = path.dirname(dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      this.db = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });
      
      console.log('📁 Connected to SQLite database:', dbPath);
    }
    
    // Initialize schema
    await this.initializeSchema();
    
    return this.db;
  }

  async initializeSchema() {
    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      if (this.isPostgres) {
        // For PostgreSQL, execute each statement separately
        const statements = schema.split(';').filter(stmt => stmt.trim());
        for (const statement of statements) {
          if (statement.trim()) {
            await this.db.query(statement);
          }
        }
      } else {
        // For SQLite, execute the entire schema
        await this.db.exec(schema);
      }
      
      console.log('✅ Database schema initialized');
    } catch (error) {
      console.error('❌ Failed to initialize database schema:', error);
      throw error;
    }
  }

  async query(sql, params = []) {
    try {
      if (this.isPostgres) {
        const result = await this.db.query(sql, params);
        return result.rows;
      } else {
        return await this.db.all(sql, params);
      }
    } catch (error) {
      console.error('❌ Database query error:', error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }

  async run(sql, params = []) {
    try {
      if (this.isPostgres) {
        const result = await this.db.query(sql, params);
        return { 
          lastID: result.rows[0]?.id || null,
          changes: result.rowCount || 0
        };
      } else {
        return await this.db.run(sql, params);
      }
    } catch (error) {
      console.error('❌ Database run error:', error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }

  async get(sql, params = []) {
    try {
      if (this.isPostgres) {
        const result = await this.db.query(sql, params);
        return result.rows[0] || null;
      } else {
        return await this.db.get(sql, params);
      }
    } catch (error) {
      console.error('❌ Database get error:', error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }

  async close() {
    if (this.db) {
      if (this.isPostgres) {
        await this.db.end();
      } else {
        await this.db.close();
      }
      console.log('🔒 Database connection closed');
    }
  }

  // Transaction support
  async transaction(callback) {
    if (this.isPostgres) {
      const client = await this.db.connect();
      try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } else {
      return await this.db.serialize(async () => {
        await this.db.run('BEGIN');
        try {
          const result = await callback(this.db);
          await this.db.run('COMMIT');
          return result;
        } catch (error) {
          await this.db.run('ROLLBACK');
          throw error;
        }
      });
    }
  }
}

// Singleton instance
const dbConnection = new DatabaseConnection();

export default dbConnection;

// Helper functions for common operations
export async function getDatabase() {
  if (!dbConnection.db) {
    await dbConnection.initialize();
  }
  return dbConnection;
}

export async function closeDatabase() {
  await dbConnection.close();
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});
