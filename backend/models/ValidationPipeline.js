/**
 * ValidationPipeline model for database operations
 */

import { getDatabase } from '../database/connection.js';
import crypto from 'crypto';

export class ValidationPipeline {
  constructor(data = {}) {
    this.id = data.id;
    this.project_id = data.project_id;
    this.agent_run_id = data.agent_run_id;
    this.pull_request_id = data.pull_request_id;
    this.pull_request_url = data.pull_request_url;
    this.status = data.status || 'pending';
    this.progress_percentage = data.progress_percentage || 0;
    this.current_step = data.current_step;
    this.deployment_url = data.deployment_url;
    this.validation_results = data.validation_results;
    this.error_message = data.error_message;
    this.retry_count = data.retry_count || 0;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.completed_at = data.completed_at;
  }

  static async create(pipelineData) {
    const db = await getDatabase();
    const pipeline = new ValidationPipeline(pipelineData);
    
    // Generate ID if not provided
    if (!pipeline.id) {
      pipeline.id = crypto.randomUUID();
    }

    const sql = `
      INSERT INTO validation_pipelines (
        id, project_id, agent_run_id, pull_request_id, pull_request_url,
        status, progress_percentage, current_step, deployment_url,
        validation_results, error_message, retry_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      pipeline.id,
      pipeline.project_id,
      pipeline.agent_run_id,
      pipeline.pull_request_id,
      pipeline.pull_request_url,
      pipeline.status,
      pipeline.progress_percentage,
      pipeline.current_step,
      pipeline.deployment_url,
      pipeline.validation_results ? JSON.stringify(pipeline.validation_results) : null,
      pipeline.error_message,
      pipeline.retry_count
    ];

    await db.run(sql, params);
    
    console.log(`✅ Created validation pipeline: ${pipeline.id} for PR #${pipeline.pull_request_id}`);
    return pipeline;
  }

  static async findById(id) {
    const db = await getDatabase();
    const sql = 'SELECT * FROM validation_pipelines WHERE id = ?';
    const row = await db.get(sql, [id]);
    
    if (!row) return null;

    // Parse JSON data
    if (row.validation_results) {
      try {
        row.validation_results = JSON.parse(row.validation_results);
      } catch (error) {
        console.error('❌ Failed to parse validation_results:', error);
        row.validation_results = null;
      }
    }

    return new ValidationPipeline(row);
  }

  static async findByPR(projectId, pullRequestId) {
    const db = await getDatabase();
    const sql = `
      SELECT * FROM validation_pipelines 
      WHERE project_id = ? AND pull_request_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const row = await db.get(sql, [projectId, pullRequestId]);
    
    if (!row) return null;

    // Parse JSON data
    if (row.validation_results) {
      try {
        row.validation_results = JSON.parse(row.validation_results);
      } catch (error) {
        console.error('❌ Failed to parse validation_results:', error);
        row.validation_results = null;
      }
    }

    return new ValidationPipeline(row);
  }

  static async findByProject(projectId, options = {}) {
    const db = await getDatabase();
    let sql = 'SELECT * FROM validation_pipelines WHERE project_id = ?';
    const params = [projectId];

    // Add WHERE conditions
    if (options.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }

    // Add ORDER BY
    sql += ' ORDER BY created_at DESC';

    // Add LIMIT
    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
      if (options.offset) {
        sql += ` OFFSET ${options.offset}`;
      }
    }

    const rows = await db.query(sql, params);
    
    return rows.map(row => {
      // Parse JSON data
      if (row.validation_results) {
        try {
          row.validation_results = JSON.parse(row.validation_results);
        } catch (error) {
          console.error('❌ Failed to parse validation_results:', error);
          row.validation_results = null;
        }
      }
      return new ValidationPipeline(row);
    });
  }

  static async findAll(options = {}) {
    const db = await getDatabase();
    let sql = 'SELECT * FROM validation_pipelines';
    const params = [];

    // Add WHERE conditions
    const conditions = [];
    if (options.status) {
      conditions.push('status = ?');
      params.push(options.status);
    }

    if (options.projectId) {
      conditions.push('project_id = ?');
      params.push(options.projectId);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Add ORDER BY
    sql += ' ORDER BY created_at DESC';

    // Add LIMIT
    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
      if (options.offset) {
        sql += ` OFFSET ${options.offset}`;
      }
    }

    const rows = await db.query(sql, params);
    
    return rows.map(row => {
      // Parse JSON data
      if (row.validation_results) {
        try {
          row.validation_results = JSON.parse(row.validation_results);
        } catch (error) {
          console.error('❌ Failed to parse validation_results:', error);
          row.validation_results = null;
        }
      }
      return new ValidationPipeline(row);
    });
  }

  static async update(id, updates) {
    const db = await getDatabase();
    const updateFields = [];
    const params = [];

    // Build dynamic update query
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        
        // Handle JSON serialization for validation_results
        if (key === 'validation_results' && updates[key] !== null) {
          params.push(JSON.stringify(updates[key]));
        } else {
          params.push(updates[key]);
        }
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    // Add updated_at timestamp
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    
    // Add completed_at if status is completed or failed
    if (updates.status && ['completed', 'failed', 'cancelled'].includes(updates.status)) {
      updateFields.push('completed_at = CURRENT_TIMESTAMP');
    }

    params.push(id);

    const sql = `UPDATE validation_pipelines SET ${updateFields.join(', ')} WHERE id = ?`;
    const result = await db.run(sql, params);

    if (result.changes === 0) {
      throw new Error(`Validation pipeline with id ${id} not found`);
    }

    console.log(`✅ Updated validation pipeline: ${id}`);
    return await ValidationPipeline.findById(id);
  }

  static async delete(id) {
    const db = await getDatabase();
    const sql = 'DELETE FROM validation_pipelines WHERE id = ?';
    const result = await db.run(sql, [id]);

    if (result.changes === 0) {
      throw new Error(`Validation pipeline with id ${id} not found`);
    }

    console.log(`🗑️ Deleted validation pipeline: ${id}`);
    return true;
  }

  // Update progress
  async updateProgress(percentage, currentStep = null) {
    const updates = {
      progress_percentage: Math.min(100, Math.max(0, percentage))
    };

    if (currentStep) {
      updates.current_step = currentStep;
    }

    return await ValidationPipeline.update(this.id, updates);
  }

  // Set status
  async setStatus(status, errorMessage = null) {
    const updates = { status };
    
    if (errorMessage) {
      updates.error_message = errorMessage;
    }

    return await ValidationPipeline.update(this.id, updates);
  }

  // Set validation results
  async setResults(results) {
    const updates = {
      validation_results: results,
      status: results.success ? 'completed' : 'failed'
    };

    return await ValidationPipeline.update(this.id, updates);
  }

  // Set deployment URL
  async setDeploymentUrl(url) {
    const updates = {
      deployment_url: url,
      current_step: 'Deployment ready'
    };

    return await ValidationPipeline.update(this.id, updates);
  }

  // Increment retry count
  async incrementRetry() {
    const updates = {
      retry_count: this.retry_count + 1,
      error_message: null // Clear previous error
    };

    return await ValidationPipeline.update(this.id, updates);
  }

  // Get statistics
  static async getStats(projectId = null) {
    const db = await getDatabase();
    let sql = `
      SELECT 
        status,
        COUNT(*) as count,
        AVG(progress_percentage) as avg_progress
      FROM validation_pipelines
    `;
    
    const params = [];
    if (projectId) {
      sql += ' WHERE project_id = ?';
      params.push(projectId);
    }
    
    sql += ' GROUP BY status';

    const rows = await db.query(sql, params);
    
    const stats = {
      total: 0,
      by_status: {},
      avg_progress: 0
    };

    rows.forEach(row => {
      stats.total += row.count;
      stats.by_status[row.status] = {
        count: row.count,
        avg_progress: Math.round(row.avg_progress || 0)
      };
    });

    // Calculate overall average progress
    if (stats.total > 0) {
      const totalProgress = rows.reduce((sum, row) => sum + (row.avg_progress * row.count), 0);
      stats.avg_progress = Math.round(totalProgress / stats.total);
    }

    return stats;
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      id: this.id,
      projectId: this.project_id,
      agentRunId: this.agent_run_id,
      pullRequestId: this.pull_request_id,
      pullRequestUrl: this.pull_request_url,
      status: this.status,
      progressPercentage: this.progress_percentage,
      currentStep: this.current_step,
      deploymentUrl: this.deployment_url,
      validationResults: this.validation_results,
      errorMessage: this.error_message,
      retryCount: this.retry_count,
      createdAt: this.created_at,
      updatedAt: this.updated_at,
      completedAt: this.completed_at
    };
  }
}
