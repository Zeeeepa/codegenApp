/**
 * Test suite for web-eval-agent routes
 */

import request from 'supertest';
import express from 'express';
import webEvalRoutes from '../web-eval-routes.js';

// Mock external dependencies
jest.mock('node-fetch');

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/web-eval', webEvalRoutes);
  return app;
};

describe('Web-Eval Routes', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('Health Check', () => {
    test('GET /api/web-eval/health returns status', async () => {
      const response = await request(app)
        .get('/api/web-eval/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Error Handling', () => {
    test('Handles invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/web-eval/analyze')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('Returns 404 for non-existent routes', async () => {
      await request(app)
        .get('/api/web-eval/non-existent')
        .expect(404);
    });
  });
});
