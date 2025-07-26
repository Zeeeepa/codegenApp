/**
 * AgentRun model for database operations
 */

import { getDatabase } from '../database/connection.js';
import crypto from 'crypto';

export class AgentRun {
  constructor(data = {}) {
    this.id = data.id;
    this.project_id = data.project_id;
    this.target_text = data.target_text;
    this.status = data.status || 'pending';
    this.response_type = data.response_type;
    this.response_data = data.response_data;
    this.progress_percentage = data.progress_percentage || 0;
    this.current_step = data.current_step;
    this.error_message = data.error_message;
    this.retry_count = data.retry_count || 0;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.completed_at = data.completed_at;
  }

  static async create(runData) {
    const db = await getDatabase();
    const run = new AgentRun(runData);
    
    // Generate ID if not provided
    if (!run.id) {
      run.id = crypto.randomUUID();
    }

    const sql = `
      INSERT INTO agent_runs (
        id, project_id, target_text, status, response_type, 
        response_data, progress_percentage, current_step, 
        error_message, retry_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      run.id,
      run.project_id,
      run.target_text,
      run.status,
      run.response_type,
      run.response_data ? JSON.stringify(run.response_data) : null,
      run.progress_percentage,
      run.current_step,
      run.error_message,
      run.retry_count
    ];

    await db.run(sql, params);
    
    console.log(`✅ Created agent run: ${run.id} for project ${run.project_id}`);
    return run;
  }

  static async findById(id) {
    const db = await getDatabase();
    const sql = 'SELECT * FROM agent_runs WHERE id = ?';
    const row = await db.get(sql, [id]);
    
    if (!row) return null;

    // Parse JSON data
    if (row.response_data) {
      try {
        row.response_data = JSON.parse(row.response_data);
      } catch (error) {
        console.error('❌ Failed to parse response_data:', error);
        row.response_data = null;
      }
    }

    return new AgentRun(row);
  }

  static async findByProject(projectId, options = {}) {
    const db = await getDatabase();
    let sql = 'SELECT * FROM agent_runs WHERE project_id = ?';
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
      if (row.response_data) {
        try {
          row.response_data = JSON.parse(row.response_data);
        } catch (error) {
          console.error('❌ Failed to parse response_data:', error);
          row.response_data = null;
        }
      }
      return new AgentRun(row);
    });
  }

  static async findAll(options = {}) {
    const db = await getDatabase();
    let sql = 'SELECT * FROM agent_runs';
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
      if (row.response_data) {
        try {
          row.response_data = JSON.parse(row.response_data);
        } catch (error) {
          console.error('❌ Failed to parse response_data:', error);
          row.response_data = null;
        }
      }
      return new AgentRun(row);
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
        
        // Handle JSON serialization for response_data
        if (key === 'response_data' && updates[key] !== null) {
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

    const sql = `UPDATE agent_runs SET ${updateFields.join(', ')} WHERE id = ?`;
    const result = await db.run(sql, params);

    if (result.changes === 0) {
      throw new Error(`Agent run with id ${id} not found`);
    }

    console.log(`✅ Updated agent run: ${id}`);
    return await AgentRun.findById(id);
  }

  static async delete(id) {
    const db = await getDatabase();
    const sql = 'DELETE FROM agent_runs WHERE id = ?';
    const result = await db.run(sql, [id]);

    if (result.changes === 0) {
      throw new Error(`Agent run with id ${id} not found`);
    }

    console.log(`🗑️ Deleted agent run: ${id}`);
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

    return await AgentRun.update(this.id, updates);
  }

  // Set status
  async setStatus(status, errorMessage = null) {
    const updates = { status };
    
    if (errorMessage) {
      updates.error_message = errorMessage;
    }

    return await AgentRun.update(this.id, updates);
  }

  // Set response
  async setResponse(responseType, responseData = null) {
    const updates = {
      response_type: responseType,
      response_data: responseData
    };

    return await AgentRun.update(this.id, updates);
  }

  // Increment retry count
  async incrementRetry() {
    const updates = {
      retry_count: this.retry_count + 1,
      error_message: null // Clear previous error
    };

    return await AgentRun.update(this.id, updates);
  }

  // Get statistics
  static async getStats(projectId = null) {
    const db = await getDatabase();
    let sql = `
      SELECT 
        status,
        COUNT(*) as count,
        AVG(progress_percentage) as avg_progress
      FROM agent_runs
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

  // Get recent activity
  static async getRecentActivity(limit = 10) {
    const db = await getDatabase();
    const sql = `
      SELECT ar.*, p.name as project_name
      FROM agent_runs ar
      LEFT JOIN projects p ON ar.project_id = p.id
      ORDER BY ar.updated_at DESC
      LIMIT ?
    `;

    const rows = await db.query(sql, [limit]);
    
    return rows.map(row => {
      // Parse JSON data
      if (row.response_data) {
        try {
          row.response_data = JSON.parse(row.response_data);
        } catch (error) {
          console.error('❌ Failed to parse response_data:', error);
          row.response_data = null;
        }
      }
      
      const run = new AgentRun(row);
      run.project_name = row.project_name;
      return run;
    });
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      id: this.id,
      projectId: this.project_id,
      targetText: this.target_text,
      status: this.status,
      responseType: this.response_type,
      responseData: this.response_data,
      progressPercentage: this.progress_percentage,
      currentStep: this.current_step,
      errorMessage: this.error_message,
      retryCount: this.retry_count,
      createdAt: this.created_at,
      updatedAt: this.updated_at,
      completedAt: this.completed_at
    };
  }
}
