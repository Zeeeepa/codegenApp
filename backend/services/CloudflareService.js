/**
 * Cloudflare Service
 * Handles PR notifications via Cloudflare Workers
 */

import fetch from 'node-fetch';

export class CloudflareService {
  constructor() {
    this.apiKey = process.env.CLOUDFLARE_API_KEY;
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    this.workerName = process.env.CLOUDFLARE_WORKER_NAME;
    this.workerUrl = process.env.CLOUDFLARE_WORKER_URL;
    this.zoneId = process.env.CLOUDFLARE_ZONE_ID;
    
    if (!this.apiKey) {
      console.warn('⚠️ CLOUDFLARE_API_KEY not set - Cloudflare integration disabled');
    }
    
    if (!this.accountId) {
      console.warn('⚠️ CLOUDFLARE_ACCOUNT_ID not set - Cloudflare integration disabled');
    }
  }

  /**
   * Check if Cloudflare is properly configured
   */
  isConfigured() {
    return !!(this.apiKey && this.accountId && this.workerUrl);
  }

  /**
   * Get headers for Cloudflare API requests
   */
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'X-Auth-Email': 'admin@pixeliumperfecto.workers.dev' // Default email
    };
  }

  /**
   * Send PR notification via Cloudflare Worker
   * @param {Object} params - Notification parameters
   * @param {string} params.prUrl - PR URL
   * @param {string} params.status - PR status
   * @param {string} params.projectId - Project ID
   * @param {Object} params.metadata - Additional metadata
   * @returns {Promise<Object>} Notification response
   */
  async sendPRNotification({ prUrl, status, projectId, metadata = {} }) {
    if (!this.isConfigured()) {
      throw new Error('Cloudflare not configured. Please set CLOUDFLARE_API_KEY and CLOUDFLARE_ACCOUNT_ID');
    }

    try {
      console.log(`☁️ Sending PR notification via Cloudflare: ${prUrl}`);

      const payload = {
        type: 'pr_notification',
        pr_url: prUrl,
        status: status,
        project_id: projectId,
        timestamp: new Date().toISOString(),
        metadata: {
          ...metadata,
          source: 'codegenApp',
          worker_name: this.workerName
        }
      };

      const response = await fetch(this.workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Worker-Auth': this.apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Cloudflare Worker error: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      console.log(`✅ PR notification sent successfully: ${result.id || 'unknown'}`);

      return {
        success: true,
        notification_id: result.id || `cf-${Date.now()}`,
        worker_url: this.workerUrl,
        status: result.status || 'sent',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Cloudflare notification error:', error.message);
      throw new Error(`Failed to send PR notification: ${error.message}`);
    }
  }

  /**
   * Retrieve PR notifications from Cloudflare Worker
   * @param {Object} params - Retrieval parameters
   * @param {string} params.projectId - Project ID
   * @param {string} params.prUrl - Optional PR URL filter
   * @returns {Promise<Array>} Array of notifications
   */
  async retrievePRNotifications({ projectId, prUrl = null }) {
    if (!this.isConfigured()) {
      throw new Error('Cloudflare not configured. Please set CLOUDFLARE_API_KEY and CLOUDFLARE_ACCOUNT_ID');
    }

    try {
      console.log(`☁️ Retrieving PR notifications for project: ${projectId}`);

      const queryParams = new URLSearchParams({
        type: 'pr_notification',
        project_id: projectId
      });

      if (prUrl) {
        queryParams.append('pr_url', prUrl);
      }

      const url = `${this.workerUrl}?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Worker-Auth': this.apiKey
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Cloudflare Worker error: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      console.log(`✅ Retrieved ${result.notifications?.length || 0} PR notifications`);

      return {
        success: true,
        notifications: result.notifications || [],
        total_count: result.total_count || 0,
        project_id: projectId,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Cloudflare retrieval error:', error.message);
      throw new Error(`Failed to retrieve PR notifications: ${error.message}`);
    }
  }

  /**
   * Setup webhook endpoint on Cloudflare Worker
   * @param {Object} params - Webhook setup parameters
   * @param {string} params.endpoint - Webhook endpoint path
   * @param {Array} params.events - Events to listen for
   * @returns {Promise<Object>} Setup response
   */
  async setupWebhook({ endpoint, events = ['pr.opened', 'pr.closed', 'pr.merged'] }) {
    if (!this.isConfigured()) {
      throw new Error('Cloudflare not configured. Please set CLOUDFLARE_API_KEY and CLOUDFLARE_ACCOUNT_ID');
    }

    try {
      console.log(`☁️ Setting up webhook endpoint: ${endpoint}`);

      const payload = {
        type: 'webhook_setup',
        endpoint: endpoint,
        events: events,
        timestamp: new Date().toISOString(),
        config: {
          worker_name: this.workerName,
          account_id: this.accountId
        }
      };

      const response = await fetch(`${this.workerUrl}/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Worker-Auth': this.apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Cloudflare Worker setup error: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      console.log(`✅ Webhook setup completed: ${result.webhook_id || 'unknown'}`);

      return {
        success: true,
        webhook_id: result.webhook_id || `webhook-${Date.now()}`,
        endpoint: endpoint,
        events: events,
        worker_url: this.workerUrl,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Cloudflare webhook setup error:', error.message);
      throw new Error(`Failed to setup webhook: ${error.message}`);
    }
  }

  /**
   * Process incoming webhook from Cloudflare
   * @param {Object} webhookData - Webhook payload
   * @returns {Promise<Object>} Processing result
   */
  async processWebhook(webhookData) {
    try {
      console.log(`☁️ Processing Cloudflare webhook: ${webhookData.type || 'unknown'}`);

      // Validate webhook data
      if (!webhookData.type) {
        throw new Error('Invalid webhook data: missing type');
      }

      const processedData = {
        webhook_id: webhookData.id || `webhook-${Date.now()}`,
        type: webhookData.type,
        timestamp: webhookData.timestamp || new Date().toISOString(),
        source: 'cloudflare',
        data: webhookData,
        processed_at: new Date().toISOString()
      };

      // Handle different webhook types
      switch (webhookData.type) {
        case 'pr_notification':
          return await this.handlePRNotificationWebhook(processedData);
        case 'pr_status_update':
          return await this.handlePRStatusWebhook(processedData);
        default:
          console.warn(`⚠️ Unknown webhook type: ${webhookData.type}`);
          return processedData;
      }

    } catch (error) {
      console.error('❌ Cloudflare webhook processing error:', error.message);
      throw new Error(`Failed to process webhook: ${error.message}`);
    }
  }

  /**
   * Handle PR notification webhook
   */
  async handlePRNotificationWebhook(webhookData) {
    console.log(`📢 Processing PR notification webhook`);
    
    return {
      ...webhookData,
      action: 'pr_notification_processed',
      status: 'success'
    };
  }

  /**
   * Handle PR status update webhook
   */
  async handlePRStatusWebhook(webhookData) {
    console.log(`🔄 Processing PR status update webhook`);
    
    return {
      ...webhookData,
      action: 'pr_status_processed',
      status: 'success'
    };
  }

  /**
   * Test Cloudflare Worker connection
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection() {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Cloudflare not configured. Please set CLOUDFLARE_API_KEY and CLOUDFLARE_ACCOUNT_ID'
      };
    }

    try {
      console.log(`☁️ Testing Cloudflare Worker connection: ${this.workerUrl}`);

      const response = await fetch(`${this.workerUrl}/health`, {
        method: 'GET',
        headers: {
          'X-Worker-Auth': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Worker health check failed: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Cloudflare Worker connection successful`);

      return {
        success: true,
        worker_url: this.workerUrl,
        worker_name: this.workerName,
        account_id: this.accountId,
        status: result.status || 'healthy',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Cloudflare connection test failed:', error.message);
      return {
        success: false,
        error: error.message,
        worker_url: this.workerUrl,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      service: 'Cloudflare',
      configured: this.isConfigured(),
      api_key_set: !!this.apiKey,
      account_id_set: !!this.accountId,
      worker_url: this.workerUrl,
      worker_name: this.workerName,
      zone_id: this.zoneId
    };
  }
}
