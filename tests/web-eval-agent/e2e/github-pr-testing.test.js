/**
 * End-to-end tests for GitHub PR testing functionality
 */

import request from 'supertest';
import express from 'express';
import webEvalRoutes from '../../../server/web-eval-routes.js';

// These tests require actual GitHub repositories and deployment URLs
// They should be run in a controlled environment with test repositories

describe('GitHub PR Testing E2E', () => {
  let app;
  const testTimeout = 120000; // 2 minutes for E2E tests

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/web-eval', webEvalRoutes);

    // Ensure required environment variables are set
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not set - E2E tests may fail');
    }
    if (!process.env.GITHUB_TOKEN) {
      console.warn('GITHUB_TOKEN not set - GitHub integration tests may fail');
    }
  });

  describe('Real GitHub PR Testing', () => {
    // Skip these tests if running in CI without proper credentials
    const skipIfNoCredentials = () => {
      if (!process.env.GEMINI_API_KEY || !process.env.GITHUB_TOKEN) {
        console.log('Skipping E2E test - missing credentials');
        return true;
      }
      return false;
    };

    it('should test a real GitHub PR with deployment', async () => {
      if (skipIfNoCredentials()) {
        return;
      }

      // Use a test repository that has predictable PR deployments
      const testRepo = process.env.TEST_GITHUB_REPO || 'Zeeeepa/codegenApp';
      const testPR = process.env.TEST_PR_NUMBER || '100';

      const response = await request(app)
        .post('/api/web-eval/test-github-pr')
        .send({
          git_repo: testRepo,
          pull_request: parseInt(testPR),
          task: 'Test the main navigation and verify the page loads correctly',
          headless: true
        })
        .timeout(testTimeout);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('completed');
      expect(response.body.sessionId).toBeDefined();
      expect(response.body.result).toBeDefined();
      expect(response.body.metadata.git_repo).toBe(testRepo);
      expect(response.body.metadata.pull_request).toBe(parseInt(testPR));

      // Verify the result contains evaluation content
      if (Array.isArray(response.body.result)) {
        expect(response.body.result.length).toBeGreaterThan(0);
        expect(response.body.result[0].type).toBe('text');
        expect(response.body.result[0].text).toBeDefined();
      }
    }, testTimeout);

    it('should handle non-existent GitHub PR gracefully', async () => {
      if (skipIfNoCredentials()) {
        return;
      }

      const response = await request(app)
        .post('/api/web-eval/test-github-pr')
        .send({
          git_repo: 'Zeeeepa/codegenApp',
          pull_request: 999999, // Non-existent PR
          task: 'Test non-existent PR',
          headless: true
        })
        .timeout(testTimeout);

      expect(response.status).toBe(500);
      expect(response.body.status).toBe('failed');
      expect(response.body.error).toBeDefined();
    }, testTimeout);

    it('should handle invalid repository format', async () => {
      const response = await request(app)
        .post('/api/web-eval/test-github-pr')
        .send({
          git_repo: 'invalid-repo-format',
          pull_request: 123,
          task: 'Test invalid repo',
          headless: true
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid repository format');
    });

    it('should test a GitHub branch deployment', async () => {
      if (skipIfNoCredentials()) {
        return;
      }

      const testRepo = process.env.TEST_GITHUB_REPO || 'Zeeeepa/codegenApp';
      const testBranch = process.env.TEST_BRANCH || 'main';

      const response = await request(app)
        .post('/api/web-eval/test-github-branch')
        .send({
          git_repo: testRepo,
          branch: testBranch,
          task: 'Test the main branch deployment and verify core functionality',
          headless: true
        })
        .timeout(testTimeout);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('completed');
      expect(response.body.sessionId).toBeDefined();
      expect(response.body.result).toBeDefined();
      expect(response.body.metadata.git_repo).toBe(testRepo);
      expect(response.body.metadata.branch).toBe(testBranch);
    }, testTimeout);
  });

  describe('Web Application Evaluation E2E', () => {
    it('should evaluate a local web application', async () => {
      if (!process.env.GEMINI_API_KEY) {
        console.log('Skipping E2E test - missing GEMINI_API_KEY');
        return;
      }

      // This test assumes a local application is running
      const testUrl = process.env.TEST_LOCAL_URL || 'http://localhost:8000';

      const response = await request(app)
        .post('/api/web-eval/evaluate')
        .send({
          url: testUrl,
          task: 'Navigate to the main page and verify that the application loads correctly. Check for any obvious UI issues or broken functionality.',
          headless: true
        })
        .timeout(testTimeout);

      if (response.status === 500 && response.body.error.includes('ECONNREFUSED')) {
        console.log('Local application not running - skipping test');
        return;
      }

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('completed');
      expect(response.body.sessionId).toBeDefined();
      expect(response.body.result).toBeDefined();
      expect(response.body.metadata.url).toBe(testUrl);
    }, testTimeout);

    it('should handle unreachable URLs gracefully', async () => {
      if (!process.env.GEMINI_API_KEY) {
        console.log('Skipping E2E test - missing GEMINI_API_KEY');
        return;
      }

      const response = await request(app)
        .post('/api/web-eval/evaluate')
        .send({
          url: 'http://localhost:99999', // Unreachable port
          task: 'Test unreachable URL',
          headless: true
        })
        .timeout(testTimeout);

      expect(response.status).toBe(500);
      expect(response.body.status).toBe('failed');
      expect(response.body.error).toBeDefined();
    }, testTimeout);
  });

  describe('Session Management E2E', () => {
    it('should track evaluation sessions correctly', async () => {
      // Start an evaluation
      const evalResponse = await request(app)
        .post('/api/web-eval/evaluate')
        .send({
          url: 'http://example.com',
          task: 'Test session tracking',
          headless: true
        });

      const sessionId = evalResponse.body.sessionId;
      expect(sessionId).toBeDefined();

      // Check session status
      const statusResponse = await request(app)
        .get(`/api/web-eval/status/${sessionId}`);

      if (statusResponse.status === 200) {
        expect(statusResponse.body.sessionId).toBe(sessionId);
        expect(statusResponse.body.status).toBeDefined();
        expect(statusResponse.body.duration).toBeDefined();
      }

      // Check active evaluations
      const activeResponse = await request(app)
        .get('/api/web-eval/active');

      expect(activeResponse.status).toBe(200);
      expect(activeResponse.body.count).toBeDefined();
      expect(activeResponse.body.evaluations).toBeInstanceOf(Array);
    });

    it('should handle session cancellation', async () => {
      // Start an evaluation
      const evalResponse = await request(app)
        .post('/api/web-eval/evaluate')
        .send({
          url: 'http://example.com',
          task: 'Test cancellation',
          headless: true
        });

      const sessionId = evalResponse.body.sessionId;

      // Try to cancel (may not work if evaluation completes quickly)
      const cancelResponse = await request(app)
        .delete(`/api/web-eval/cancel/${sessionId}`);

      // Should either cancel successfully or indicate it can't be cancelled
      expect([200, 400, 404]).toContain(cancelResponse.status);
    });
  });

  describe('Health Check E2E', () => {
    it('should provide comprehensive health status', async () => {
      const response = await request(app)
        .get('/api/web-eval/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.config).toBeDefined();
      expect(response.body.config.timeout).toBeDefined();
      expect(response.body.config.maxConcurrent).toBeDefined();
      expect(response.body.activeEvaluations).toBeDefined();
    });
  });
});

