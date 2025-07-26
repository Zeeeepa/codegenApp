/**
 * Webhook routes for handling GitHub PR notifications
 */

import express from 'express';
import crypto from 'crypto';
import { getDatabase } from '../database/connection.js';
import { Project } from '../models/Project.js';
import { ValidationPipeline } from '../models/ValidationPipeline.js';
import { WebhookProcessor } from '../services/WebhookProcessor.js';

const router = express.Router();

// Webhook signature verification middleware
function verifyWebhookSignature(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  const payload = JSON.stringify(req.body);
  const secret = process.env.WEBHOOK_SECRET || 'default-secret';

  if (!signature) {
    return res.status(401).json({
      error: 'Missing signature',
      message: 'X-Hub-Signature-256 header is required'
    });
  }

  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return res.status(401).json({
      error: 'Invalid signature',
      message: 'Webhook signature verification failed'
    });
  }

  next();
}

// Generic webhook endpoint for all projects
router.post('/:webhookId', verifyWebhookSignature, async (req, res) => {
  try {
    const { webhookId } = req.params;
    const payload = req.body;
    const eventType = req.headers['x-github-event'];

    console.log(`📥 Received webhook: ${eventType} for webhook ID: ${webhookId}`);

    // Find project by webhook URL
    const project = await findProjectByWebhookId(webhookId);
    if (!project) {
      console.log(`❌ No project found for webhook ID: ${webhookId}`);
      return res.status(404).json({
        error: 'Project not found',
        message: 'No project associated with this webhook'
      });
    }

    // Store webhook event
    await storeWebhookEvent(project.id, eventType, payload);

    // Process the webhook based on event type
    const processor = new WebhookProcessor();
    await processor.processWebhook(project, eventType, payload);

    res.json({
      message: 'Webhook processed successfully',
      projectId: project.id,
      eventType: eventType
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({
      error: 'Webhook processing failed',
      message: error.message
    });
  }
});

// Health check for webhook endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Webhook endpoint is healthy',
    timestamp: new Date().toISOString()
  });
});

// Get webhook events for a project (for debugging)
router.get('/events/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const db = await getDatabase();
    const sql = `
      SELECT * FROM webhook_events 
      WHERE project_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;

    const events = await db.query(sql, [projectId, limit, offset]);
    
    // Parse event data
    const parsedEvents = events.map(event => ({
      ...event,
      event_data: JSON.parse(event.event_data)
    }));

    res.json({
      events: parsedEvents,
      total: parsedEvents.length,
      limit,
      offset
    });

  } catch (error) {
    console.error('❌ Failed to get webhook events:', error);
    res.status(500).json({
      error: 'Failed to get webhook events',
      message: error.message
    });
  }
});

// Replay webhook event (for debugging/testing)
router.post('/replay/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const db = await getDatabase();
    const event = await db.get('SELECT * FROM webhook_events WHERE id = ?', [eventId]);
    
    if (!event) {
      return res.status(404).json({
        error: 'Event not found'
      });
    }

    const project = await Project.findById(event.project_id);
    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    const payload = JSON.parse(event.event_data);
    
    // Process the webhook
    const processor = new WebhookProcessor();
    await processor.processWebhook(project, event.event_type, payload);

    res.json({
      message: 'Webhook event replayed successfully',
      eventId: eventId,
      projectId: project.id
    });

  } catch (error) {
    console.error('❌ Failed to replay webhook event:', error);
    res.status(500).json({
      error: 'Failed to replay webhook event',
      message: error.message
    });
  }
});

// Helper functions

async function findProjectByWebhookId(webhookId) {
  const db = await getDatabase();
  
  // Try to find project by exact webhook URL match
  const webhookUrl = `${process.env.WEBHOOK_BASE_URL || 'http://localhost:3001'}/webhooks/${webhookId}`;
  
  const sql = 'SELECT * FROM projects WHERE webhook_url = ?';
  const row = await db.get(sql, [webhookUrl]);
  
  return row ? new Project(row) : null;
}

async function storeWebhookEvent(projectId, eventType, payload) {
  const db = await getDatabase();
  
  const sql = `
    INSERT INTO webhook_events (project_id, event_type, event_data)
    VALUES (?, ?, ?)
  `;
  
  await db.run(sql, [projectId, eventType, JSON.stringify(payload)]);
  
  console.log(`📝 Stored webhook event: ${eventType} for project ${projectId}`);
}

export default router;
