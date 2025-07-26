/**
 * Project model for database operations
 */

import { getDatabase } from '../database/connection.js';
import crypto from 'crypto';

export class Project {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.full_name = data.full_name;
    this.description = data.description;
    this.repository_url = data.repository_url;
    this.webhook_url = data.webhook_url;
    this.default_branch = data.default_branch || 'main';
    this.auto_merge_enabled = data.auto_merge_enabled || false;
    this.auto_confirm_plan = data.auto_confirm_plan || false;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async create(projectData) {
    const db = await getDatabase();
    const project = new Project(projectData);
    
    // Generate webhook URL if not provided
    if (!project.webhook_url) {
      const webhookId = crypto.randomUUID();
      project.webhook_url = `${process.env.WEBHOOK_BASE_URL || 'http://localhost:3001'}/webhooks/${webhookId}`;
    }

    const sql = `
      INSERT INTO projects (
        id, name, full_name, description, repository_url, 
        webhook_url, default_branch, auto_merge_enabled, auto_confirm_plan
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      project.id,
      project.name,
      project.full_name,
      project.description,
      project.repository_url,
      project.webhook_url,
      project.default_branch,
      project.auto_merge_enabled,
      project.auto_confirm_plan
    ];

    await db.run(sql, params);
    
    console.log(`✅ Created project: ${project.name} (${project.id})`);
    return project;
  }

  static async findById(id) {
    const db = await getDatabase();
    const sql = 'SELECT * FROM projects WHERE id = ?';
    const row = await db.get(sql, [id]);
    
    return row ? new Project(row) : null;
  }

  static async findAll(options = {}) {
    const db = await getDatabase();
    let sql = 'SELECT * FROM projects';
    const params = [];

    // Add WHERE conditions
    const conditions = [];
    if (options.search) {
      conditions.push('(name LIKE ? OR full_name LIKE ? OR description LIKE ?)');
      params.push(`%${options.search}%`, `%${options.search}%`, `%${options.search}%`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Add ORDER BY
    if (options.sortBy) {
      const sortDirection = options.sortDirection || 'ASC';
      sql += ` ORDER BY ${options.sortBy} ${sortDirection}`;
    } else {
      sql += ' ORDER BY updated_at DESC';
    }

    // Add LIMIT
    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
      if (options.offset) {
        sql += ` OFFSET ${options.offset}`;
      }
    }

    const rows = await db.query(sql, params);
    return rows.map(row => new Project(row));
  }

  static async update(id, updates) {
    const db = await getDatabase();
    const updateFields = [];
    const params = [];

    // Build dynamic update query
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        params.push(updates[key]);
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    // Add updated_at timestamp
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const sql = `UPDATE projects SET ${updateFields.join(', ')} WHERE id = ?`;
    const result = await db.run(sql, params);

    if (result.changes === 0) {
      throw new Error(`Project with id ${id} not found`);
    }

    console.log(`✅ Updated project: ${id}`);
    return await Project.findById(id);
  }

  static async delete(id) {
    const db = await getDatabase();
    const sql = 'DELETE FROM projects WHERE id = ?';
    const result = await db.run(sql, [id]);

    if (result.changes === 0) {
      throw new Error(`Project with id ${id} not found`);
    }

    console.log(`🗑️ Deleted project: ${id}`);
    return true;
  }

  // Project settings methods
  static async getSetting(projectId, key) {
    const db = await getDatabase();
    const sql = 'SELECT * FROM project_settings WHERE project_id = ? AND setting_key = ?';
    const row = await db.get(sql, [projectId, key]);
    
    if (!row) return null;

    // Decrypt if necessary
    let value = row.setting_value;
    if (row.encrypted && value) {
      value = this.decrypt(value);
    }

    return {
      key: row.setting_key,
      value: value,
      encrypted: row.encrypted,
      updated_at: row.updated_at
    };
  }

  static async setSetting(projectId, key, value, encrypted = false) {
    const db = await getDatabase();
    
    // Encrypt if necessary
    let finalValue = value;
    if (encrypted && value) {
      finalValue = this.encrypt(value);
    }

    const sql = `
      INSERT INTO project_settings (project_id, setting_key, setting_value, encrypted)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(project_id, setting_key) 
      DO UPDATE SET 
        setting_value = excluded.setting_value,
        encrypted = excluded.encrypted,
        updated_at = CURRENT_TIMESTAMP
    `;

    await db.run(sql, [projectId, key, finalValue, encrypted]);
    console.log(`✅ Set setting ${key} for project ${projectId}`);
  }

  static async getSettings(projectId) {
    const db = await getDatabase();
    const sql = 'SELECT * FROM project_settings WHERE project_id = ? ORDER BY setting_key';
    const rows = await db.query(sql, [projectId]);
    
    const settings = {};
    rows.forEach(row => {
      let value = row.setting_value;
      if (row.encrypted && value) {
        value = this.decrypt(value);
      }
      settings[row.setting_key] = {
        value: value,
        encrypted: row.encrypted,
        updated_at: row.updated_at
      };
    });

    return settings;
  }

  static async deleteSetting(projectId, key) {
    const db = await getDatabase();
    const sql = 'DELETE FROM project_settings WHERE project_id = ? AND setting_key = ?';
    const result = await db.run(sql, [projectId, key]);
    
    console.log(`🗑️ Deleted setting ${key} for project ${projectId}`);
    return result.changes > 0;
  }

  // Encryption helpers
  static encrypt(text) {
    const algorithm = 'aes-256-gcm';
    const secretKey = process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-production';
    const key = crypto.scryptSync(secretKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAAD(Buffer.from('project-settings', 'utf8'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  static decrypt(encryptedText) {
    try {
      const algorithm = 'aes-256-gcm';
      const secretKey = process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-production';
      const key = crypto.scryptSync(secretKey, 'salt', 32);
      
      const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = crypto.createDecipher(algorithm, key);
      decipher.setAAD(Buffer.from('project-settings', 'utf8'));
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      return encryptedText; // Return as-is if decryption fails
    }
  }

  // Webhook URL generation
  static generateWebhookUrl(projectId) {
    const webhookId = crypto.createHash('sha256')
      .update(projectId + process.env.WEBHOOK_SECRET || 'default-secret')
      .digest('hex')
      .substring(0, 16);
    
    return `${process.env.WEBHOOK_BASE_URL || 'http://localhost:3001'}/webhooks/${webhookId}`;
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      fullName: this.full_name,
      description: this.description,
      repositoryUrl: this.repository_url,
      webhookUrl: this.webhook_url,
      defaultBranch: this.default_branch,
      autoMergeEnabled: this.auto_merge_enabled,
      autoConfirmPlan: this.auto_confirm_plan,
      createdAt: this.created_at,
      updatedAt: this.updated_at
    };
  }
}
