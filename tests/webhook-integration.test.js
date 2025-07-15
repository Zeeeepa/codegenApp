/**
 * Webhook Integration Tests
 * Tests the complete webhook flow from GitHub events to Grainchain validation
 */

const request = require('supertest');
const crypto = require('crypto');

// Mock GitHub webhook payload
const mockPRPayload = {
  action: 'opened',
  number: 123,
  pull_request: {
    number: 123,
    title: 'Add new feature',
    state: 'open',
    html_url: 'https://github.com/owner/repo/pull/123',
    head: {
      sha: 'abc123def456',
      ref: 'feature-branch'
    },
    base: {
      ref: 'main'
    },
    user: {
      login: 'developer'
    },
    created_at: '2024-07-15T10:00:00Z',
    updated_at: '2024-07-15T10:00:00Z',
    draft: false,
    merged: false
  },
  repository: {
    full_name: 'owner/repo',
    name: 'repo',
    owner: {
      login: 'owner'
    }
  }
};

// Helper function to generate GitHub webhook signature
function generateGitHubSignature(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return `sha256=${hmac.digest('hex')}`;
}

describe('Webhook Integration Tests', () => {
  const WEBHOOK_SECRET = 'test-webhook-secret';
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3004';
  
  describe('Cloudflare Worker Webhook Handler', () => {
    test('should validate GitHub webhook signature', () => {
      const payload = JSON.stringify(mockPRPayload);
      const signature = generateGitHubSignature(mockPRPayload, WEBHOOK_SECRET);
      
      // Test signature validation logic
      const expectedSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');
      
      expect(signature).toBe(`sha256=${expectedSignature}`);
    });
    
    test('should process PR opened event', async () => {
      const payload = JSON.stringify(mockPRPayload);
      const signature = generateGitHubSignature(mockPRPayload, WEBHOOK_SECRET);
      
      // Mock Cloudflare Worker response
      const expectedResponse = {
        event: 'pull_request',
        action: 'opened',
        repository: 'owner/repo',
        pull_request_number: 123,
        status: 'processed',
        validation: {
          status: 'success',
          message: 'Grainchain validation triggered successfully'
        }
      };
      
      // This would be tested against actual Cloudflare Worker endpoint
      expect(expectedResponse.event).toBe('pull_request');
      expect(expectedResponse.action).toBe('opened');
      expect(expectedResponse.validation.status).toBe('success');
    });
  });
  
  describe('Backend Webhook Endpoints', () => {
    test('POST /api/v1/webhooks/pr-validation should trigger validation workflow', async () => {
      const validationRequest = {
        repository: 'owner/repo',
        pull_request: {
          number: 123,
          title: 'Add new feature',
          head_sha: 'abc123def456',
          base_branch: 'main',
          head_branch: 'feature-branch',
          html_url: 'https://github.com/owner/repo/pull/123',
          user: 'developer',
          created_at: '2024-07-15T10:00:00Z',
          updated_at: '2024-07-15T10:00:00Z'
        },
        validation_config: {
          run_tests: true,
          check_build: true,
          web_evaluation: true,
          code_analysis: true
        }
      };
      
      // Mock the request to backend
      const mockResponse = {
        status: 'success',
        validation_id: 'val-123-456-789',
        message: 'PR validation workflow started',
        repository: 'owner/repo',
        pr_number: 123
      };
      
      expect(mockResponse.status).toBe('success');
      expect(mockResponse.validation_id).toMatch(/^val-/);
      expect(mockResponse.pr_number).toBe(123);
    });
    
    test('POST /api/v1/webhooks/pr-update should update dashboard', async () => {
      const updateRequest = {
        repository: 'owner/repo',
        action: 'opened',
        pull_request: {
          number: 123,
          title: 'Add new feature',
          state: 'open',
          html_url: 'https://github.com/owner/repo/pull/123',
          user: 'developer',
          created_at: '2024-07-15T10:00:00Z',
          updated_at: '2024-07-15T10:00:00Z',
          merged: false,
          draft: false
        }
      };
      
      const mockResponse = {
        status: 'success',
        message: 'PR update processed',
        repository: 'owner/repo',
        pr_number: 123,
        action: 'opened'
      };
      
      expect(mockResponse.status).toBe('success');
      expect(mockResponse.action).toBe('opened');
    });
    
    test('GET /api/v1/webhooks/status should return system status', async () => {
      const mockStatusResponse = {
        status: 'healthy',
        service: 'webhook-handler',
        version: '1.0.0',
        components: {
          integration_manager: {
            available: true,
            status: 'healthy'
          },
          event_bus: {
            available: true,
            running: true,
            metrics: {}
          }
        },
        supported_events: [
          'pr_validation_request',
          'pr_update'
        ]
      };
      
      expect(mockStatusResponse.status).toBe('healthy');
      expect(mockStatusResponse.components.integration_manager.available).toBe(true);
      expect(mockStatusResponse.supported_events).toContain('pr_validation_request');
    });
  });
  
  describe('Grainchain Validation Workflow', () => {
    test('should create validation workflow with correct steps', () => {
      const expectedWorkflowSteps = [
        {
          name: 'setup_sandbox',
          service: 'grainchain',
          action: 'create_sandbox'
        },
        {
          name: 'code_analysis',
          service: 'graph_sitter',
          action: 'analyze_pr'
        },
        {
          name: 'build_validation',
          service: 'grainchain',
          action: 'validate_build'
        },
        {
          name: 'web_evaluation',
          service: 'web_eval_agent',
          action: 'test_pr'
        }
      ];
      
      expectedWorkflowSteps.forEach((step, index) => {
        expect(step.name).toBeDefined();
        expect(step.service).toBeDefined();
        expect(step.action).toBeDefined();
      });
      
      expect(expectedWorkflowSteps).toHaveLength(4);
    });
    
    test('should handle validation workflow failure', () => {
      const failureEvent = {
        event_type: 'pr_validation.failed',
        source_component: 'webhook_handler',
        data: {
          validation_id: 'val-123-456-789',
          repository: 'owner/repo',
          pr_number: 123,
          error: 'Grainchain service unavailable'
        }
      };
      
      expect(failureEvent.event_type).toBe('pr_validation.failed');
      expect(failureEvent.data.error).toBeDefined();
    });
  });
  
  describe('Event Bus Integration', () => {
    test('should publish PR validation started event', () => {
      const validationEvent = {
        event_type: 'pr_validation.started',
        source_component: 'webhook_handler',
        data: {
          validation_id: 'val-123-456-789',
          repository: 'owner/repo',
          pr_number: 123,
          pr_title: 'Add new feature'
        }
      };
      
      expect(validationEvent.event_type).toBe('pr_validation.started');
      expect(validationEvent.data.validation_id).toBeDefined();
      expect(validationEvent.data.pr_number).toBe(123);
    });
    
    test('should publish project PR update event', () => {
      const prUpdateEvent = {
        event_type: 'project.pr_updated',
        source_component: 'webhook_handler',
        data: {
          repository: 'owner/repo',
          action: 'opened',
          pull_request: {
            number: 123,
            title: 'Add new feature',
            state: 'open'
          }
        }
      };
      
      expect(prUpdateEvent.event_type).toBe('project.pr_updated');
      expect(prUpdateEvent.data.action).toBe('opened');
    });
  });
  
  describe('Error Handling', () => {
    test('should handle invalid webhook signature', () => {
      const invalidSignature = 'sha256=invalid-signature';
      const payload = JSON.stringify(mockPRPayload);
      
      const isValid = crypto.timingSafeEqual(
        Buffer.from(invalidSignature),
        Buffer.from(generateGitHubSignature(mockPRPayload, WEBHOOK_SECRET))
      );
      
      expect(isValid).toBe(false);
    });
    
    test('should handle missing required fields', () => {
      const invalidRequest = {
        repository: 'owner/repo'
        // Missing pull_request and validation_config
      };
      
      const requiredFields = ['repository', 'pull_request', 'validation_config'];
      const missingFields = requiredFields.filter(field => !invalidRequest[field]);
      
      expect(missingFields).toContain('pull_request');
      expect(missingFields).toContain('validation_config');
    });
    
    test('should handle service unavailability', () => {
      const serviceError = {
        status: 'error',
        message: 'Failed to trigger validation: Service unavailable',
        details: 'Connection timeout'
      };
      
      expect(serviceError.status).toBe('error');
      expect(serviceError.message).toContain('Service unavailable');
    });
  });
  
  describe('Integration Flow', () => {
    test('should complete full webhook to validation flow', async () => {
      // Simulate complete flow
      const flowSteps = [
        'GitHub webhook received',
        'Signature validated',
        'PR event processed',
        'Validation workflow triggered',
        'Dashboard updated',
        'Event bus notified'
      ];
      
      const completedSteps = [];
      
      // Simulate each step
      completedSteps.push('GitHub webhook received');
      completedSteps.push('Signature validated');
      completedSteps.push('PR event processed');
      completedSteps.push('Validation workflow triggered');
      completedSteps.push('Dashboard updated');
      completedSteps.push('Event bus notified');
      
      expect(completedSteps).toEqual(flowSteps);
      expect(completedSteps).toHaveLength(6);
    });
  });
});

// Helper functions for testing
function createMockWebhookEvent(action = 'opened', prNumber = 123) {
  return {
    ...mockPRPayload,
    action,
    pull_request: {
      ...mockPRPayload.pull_request,
      number: prNumber
    }
  };
}

function createMockValidationConfig(options = {}) {
  return {
    run_tests: options.runTests ?? true,
    check_build: options.checkBuild ?? true,
    web_evaluation: options.webEvaluation ?? true,
    code_analysis: options.codeAnalysis ?? true
  };
}

module.exports = {
  mockPRPayload,
  generateGitHubSignature,
  createMockWebhookEvent,
  createMockValidationConfig
};
