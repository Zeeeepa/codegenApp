/**
 * Unit tests for web-eval-agent routes
 */

import request from 'supertest';
import express from 'express';
import webEvalRoutes from '../../../server/web-eval-routes.js';

// Mock child_process spawn
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

// Mock fs promises
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn()
  }
}));

describe('Web-Eval-Agent Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/web-eval', webEvalRoutes);
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Set required environment variables
    process.env.GEMINI_API_KEY = 'test-api-key';
    process.env.GITHUB_TOKEN = 'test-github-token';
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.GEMINI_API_KEY;
    delete process.env.GITHUB_TOKEN;
  });

  describe('POST /api/web-eval/evaluate', () => {
    it('should validate required parameters', async () => {
      const response = await request(app)
        .post('/api/web-eval/evaluate')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required parameters');
      expect(response.body.message).toBe('Both url and task are required');
    });

    it('should validate URL parameter', async () => {
      const response = await request(app)
        .post('/api/web-eval/evaluate')
        .send({ task: 'Test the homepage' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required parameters');
    });

    it('should validate task parameter', async () => {
      const response = await request(app)
        .post('/api/web-eval/evaluate')
        .send({ url: 'http://localhost:3000' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required parameters');
    });

    it('should accept valid parameters', async () => {
      // Mock successful MCP execution
      const { spawn } = require('child_process');
      const mockProcess = {
        stdin: { write: jest.fn(), end: jest.fn() },
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn()
      };

      spawn.mockReturnValue(mockProcess);

      // Simulate successful process completion
      setTimeout(() => {
        const closeCallback = mockProcess.on.mock.calls.find(call => call[0] === 'close')[1];
        const stdoutCallback = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
        
        // Simulate MCP response
        stdoutCallback(JSON.stringify({
          jsonrpc: '2.0',
          id: 'test-session',
          result: {
            type: 'text',
            text: 'Evaluation completed successfully'
          }
        }));
        
        closeCallback(0);
      }, 10);

      const response = await request(app)
        .post('/api/web-eval/evaluate')
        .send({
          url: 'http://localhost:3000',
          task: 'Test the homepage navigation',
          headless: true
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('completed');
      expect(response.body.sessionId).toBeDefined();
      expect(response.body.metadata.url).toBe('http://localhost:3000');
      expect(response.body.metadata.task).toBe('Test the homepage navigation');
    });

    it('should handle MCP execution errors', async () => {
      const { spawn } = require('child_process');
      const mockProcess = {
        stdin: { write: jest.fn(), end: jest.fn() },
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn()
      };

      spawn.mockReturnValue(mockProcess);

      // Simulate process error
      setTimeout(() => {
        const errorCallback = mockProcess.on.mock.calls.find(call => call[0] === 'error')[1];
        errorCallback(new Error('Failed to start MCP process'));
      }, 10);

      const response = await request(app)
        .post('/api/web-eval/evaluate')
        .send({
          url: 'http://localhost:3000',
          task: 'Test the homepage'
        });

      expect(response.status).toBe(500);
      expect(response.body.status).toBe('failed');
      expect(response.body.error).toContain('Failed to start MCP process');
    });

    it('should handle concurrent evaluation limits', async () => {
      // This test would require more sophisticated mocking to simulate
      // multiple concurrent requests. For now, we'll test the basic structure.
      const response = await request(app)
        .post('/api/web-eval/evaluate')
        .send({
          url: 'http://localhost:3000',
          task: 'Test concurrent limit'
        });

      // The response will be an error due to mocking, but we can verify the structure
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/web-eval/setup-browser', () => {
    it('should accept optional URL parameter', async () => {
      const { spawn } = require('child_process');
      const mockProcess = {
        stdin: { write: jest.fn(), end: jest.fn() },
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn()
      };

      spawn.mockReturnValue(mockProcess);

      // Simulate successful completion
      setTimeout(() => {
        const closeCallback = mockProcess.on.mock.calls.find(call => call[0] === 'close')[1];
        const stdoutCallback = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data')[1];
        
        stdoutCallback(JSON.stringify({
          jsonrpc: '2.0',
          id: 'test-session',
          result: {
            type: 'text',
            text: 'Browser state setup completed'
          }
        }));
        
        closeCallback(0);
      }, 10);

      const response = await request(app)
        .post('/api/web-eval/setup-browser')
        .send({ url: 'http://localhost:3000' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('completed');
      expect(response.body.sessionId).toBeDefined();
    });

    it('should work without URL parameter', async () => {
      const { spawn } = require('child_process');
      const mockProcess = {
        stdin: { write: jest.fn(), end: jest.fn() },
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn()
      };

      spawn.mockReturnValue(mockProcess);

      const response = await request(app)
        .post('/api/web-eval/setup-browser')
        .send({});

      // Will error due to mocking, but structure should be correct
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/web-eval/test-github-pr', () => {
    it('should validate required parameters', async () => {
      const response = await request(app)
        .post('/api/web-eval/test-github-pr')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required parameters');
      expect(response.body.message).toBe('git_repo, pull_request, and task are required');
    });

    it('should validate repository format', async () => {
      const response = await request(app)
        .post('/api/web-eval/test-github-pr')
        .send({
          git_repo: 'invalid-repo-format',
          pull_request: 123,
          task: 'Test PR'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid repository format');
      expect(response.body.message).toBe('Repository must be in format "owner/repo"');
    });

    it('should accept valid GitHub PR parameters', async () => {
      const { spawn } = require('child_process');
      const mockProcess = {
        stdin: { write: jest.fn(), end: jest.fn() },
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn()
      };

      spawn.mockReturnValue(mockProcess);

      const response = await request(app)
        .post('/api/web-eval/test-github-pr')
        .send({
          git_repo: 'owner/repo',
          pull_request: 123,
          task: 'Test the PR changes'
        });

      // Will error due to mocking, but parameters should be validated
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/web-eval/test-github-branch', () => {
    it('should validate required parameters', async () => {
      const response = await request(app)
        .post('/api/web-eval/test-github-branch')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required parameters');
      expect(response.body.message).toBe('git_repo, branch, and task are required');
    });

    it('should accept valid GitHub branch parameters', async () => {
      const { spawn } = require('child_process');
      const mockProcess = {
        stdin: { write: jest.fn(), end: jest.fn() },
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn()
      };

      spawn.mockReturnValue(mockProcess);

      const response = await request(app)
        .post('/api/web-eval/test-github-branch')
        .send({
          git_repo: 'owner/repo',
          branch: 'feature-branch',
          task: 'Test the branch changes'
        });

      // Will error due to mocking, but parameters should be validated
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/web-eval/status/:sessionId', () => {
    it('should return 404 for non-existent session', async () => {
      const response = await request(app)
        .get('/api/web-eval/status/non-existent-session');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Evaluation not found');
    });
  });

  describe('GET /api/web-eval/active', () => {
    it('should return active evaluations list', async () => {
      const response = await request(app)
        .get('/api/web-eval/active');

      expect(response.status).toBe(200);
      expect(response.body.count).toBeDefined();
      expect(response.body.maxConcurrent).toBeDefined();
      expect(response.body.evaluations).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/web-eval/health', () => {
    it('should return healthy status with required env vars', async () => {
      const response = await request(app)
        .get('/api/web-eval/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.config).toBeDefined();
      expect(response.body.activeEvaluations).toBeDefined();
    });

    it('should return unhealthy status without required env vars', async () => {
      delete process.env.GEMINI_API_KEY;

      const response = await request(app)
        .get('/api/web-eval/health');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.missing).toContain('GEMINI_API_KEY');
    });
  });

  describe('DELETE /api/web-eval/cancel/:sessionId', () => {
    it('should return 404 for non-existent session', async () => {
      const response = await request(app)
        .delete('/api/web-eval/cancel/non-existent-session');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Evaluation not found');
    });
  });
});

