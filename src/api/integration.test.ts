/// <reference types="jest" />
import { CodegenAPIClient } from './client';
import { StopAgentRunRequest } from './types';
import { validateStopAgentRunRequest } from './validation';

// Mock the toast and credentials utilities
jest.mock('../utils/toast', () => ({
  showToast: jest.fn(),
  ToastStyle: {
    Failure: 'failure',
    Success: 'success'
  }
}));

jest.mock('../utils/credentials', () => ({
  getCredentials: jest.fn(),
  showCredentialsError: jest.fn(),
  validateCredentials: jest.fn()
}));

jest.mock('../storage/userStorage', () => ({
  clearStoredUserInfo: jest.fn()
}));

// Integration tests for stop endpoint functionality
describe('Stop Agent Run Integration Tests', () => {
  let client: CodegenAPIClient;
  const mockApiToken = 'sk-test-integration-token-123456789';
  const mockBaseUrl = 'https://api.test-integration.com';

  beforeEach(() => {
    // Mock credentials for the client
    const { getCredentials, showCredentialsError } = require('../utils/credentials');
    getCredentials.mockResolvedValue({
      apiToken: mockApiToken,
      apiBaseUrl: mockBaseUrl
    });
    
    client = new CodegenAPIClient();
    getCredentials.mockClear();
    showCredentialsError.mockClear();
  });

  describe('End-to-end stop agent run workflow', () => {
    test('should validate parameters before making API call', () => {
      const organizationId = 123;
      const agentRunId = 456;

      // Validate parameters using validation utility
      const validation = validateStopAgentRunRequest(organizationId, agentRunId);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Ensure request object matches expected structure
      const request: StopAgentRunRequest = {
        agent_run_id: agentRunId
      };

      expect(request).toHaveProperty('agent_run_id');
      expect(request.agent_run_id).toBe(agentRunId);
      expect(typeof request.agent_run_id).toBe('number');
    });

    test('should handle validation errors before API call', () => {
      const invalidOrganizationId = -1;
      const invalidAgentRunId = -2;

      // Validate parameters
      const validation = validateStopAgentRunRequest(invalidOrganizationId, invalidAgentRunId);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Organization ID must be non-negative');
      expect(validation.errors).toContain('Agent run ID must be non-negative');

      // In a real application, we would not proceed with the API call
      // if validation fails
    });

    test('should construct proper request for valid inputs', () => {
      const testCases = [
        { orgId: 1, agentRunId: 1 },
        { orgId: 999, agentRunId: 123456 },
        { orgId: 0, agentRunId: 0 },
        { orgId: Number.MAX_SAFE_INTEGER, agentRunId: Number.MAX_SAFE_INTEGER }
      ];

      testCases.forEach(({ orgId, agentRunId }) => {
        // Validate inputs
        const validation = validateStopAgentRunRequest(orgId, agentRunId);
        expect(validation.isValid).toBe(true);

        // Construct request
        const request: StopAgentRunRequest = {
          agent_run_id: agentRunId
        };

        // Verify request structure
        expect(request.agent_run_id).toBe(agentRunId);
        expect(Number.isInteger(request.agent_run_id)).toBe(true);
      });
    });
  });

  describe('Error handling scenarios', () => {
    const mockFetch = jest.fn();
    
    beforeEach(() => {
      global.fetch = mockFetch;
      mockFetch.mockClear();
    });

    test('should handle agent run not found scenario', async () => {
      const organizationId = 123;
      const nonExistentAgentRunId = 999999;
      const request: StopAgentRunRequest = {
        agent_run_id: nonExistentAgentRunId
      };

      // Mock 404 response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: 'Agent run not found',
          code: 'AGENT_RUN_NOT_FOUND',
          details: `Agent run ${nonExistentAgentRunId} does not exist in organization ${organizationId}`
        }),
      });

      // Validate inputs first (should pass)
      const validation = validateStopAgentRunRequest(organizationId, nonExistentAgentRunId);
      expect(validation.isValid).toBe(true);

      // API call should fail with 404
      await expect(client.stopAgentRun(organizationId, request))
        .rejects.toThrow('Agent run not found');
    });

    test('should handle agent run already stopped scenario', async () => {
      const organizationId = 123;
      const alreadyStoppedAgentRunId = 456;
      const request: StopAgentRunRequest = {
        agent_run_id: alreadyStoppedAgentRunId
      };

      // Mock 409 conflict response (agent run already stopped)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: 'Agent run already stopped',
          code: 'AGENT_RUN_ALREADY_STOPPED',
          details: `Agent run ${alreadyStoppedAgentRunId} is already in stopped state`
        }),
      });

      // Validate inputs first (should pass)
      const validation = validateStopAgentRunRequest(organizationId, alreadyStoppedAgentRunId);
      expect(validation.isValid).toBe(true);

      // API call should fail with 409
      await expect(client.stopAgentRun(organizationId, request))
        .rejects.toThrow('Agent run already stopped');
    });

    test('should handle unauthorized organization access', async () => {
      const unauthorizedOrganizationId = 999;
      const agentRunId = 123;
      const request: StopAgentRunRequest = {
        agent_run_id: agentRunId
      };

      // Mock 403 forbidden response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: 'Access denied to organization',
          code: 'ORGANIZATION_ACCESS_DENIED',
          details: `User does not have permission to access organization ${unauthorizedOrganizationId}`
        }),
      });

      // Validate inputs first (should pass)
      const validation = validateStopAgentRunRequest(unauthorizedOrganizationId, agentRunId);
      expect(validation.isValid).toBe(true);

      // API call should fail with 403
      await expect(client.stopAgentRun(unauthorizedOrganizationId, request))
        .rejects.toThrow('Access denied');
    });

    test('should handle rate limiting', async () => {
      const organizationId = 123;
      const agentRunId = 456;
      const request: StopAgentRunRequest = {
        agent_run_id: agentRunId
      };

      // Mock 429 rate limit response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Map([
          ['Retry-After', '60'],
          ['X-RateLimit-Limit', '100'],
          ['X-RateLimit-Remaining', '0']
        ]),
        json: async () => ({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          details: 'Too many requests. Please try again in 60 seconds.'
        }),
      });

      // Validate inputs first (should pass)
      const validation = validateStopAgentRunRequest(organizationId, agentRunId);
      expect(validation.isValid).toBe(true);

      // API call should fail with 429
      await expect(client.stopAgentRun(organizationId, request))
        .rejects.toThrow('Rate limit exceeded');
    });

    test('should handle server errors gracefully', async () => {
      const organizationId = 123;
      const agentRunId = 456;
      const request: StopAgentRunRequest = {
        agent_run_id: agentRunId
      };

      // Mock 500 internal server error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
          details: 'An unexpected error occurred while processing the request'
        }),
      });

      // Validate inputs first (should pass)
      const validation = validateStopAgentRunRequest(organizationId, agentRunId);
      expect(validation.isValid).toBe(true);

      // API call should fail with 500
      await expect(client.stopAgentRun(organizationId, request))
        .rejects.toThrow('Internal server error');
    });
  });

  describe('Success scenarios', () => {
    const mockFetch = jest.fn();
    
    beforeEach(() => {
      global.fetch = mockFetch;
      mockFetch.mockClear();
    });

    test('should handle successful stop request', async () => {
      const organizationId = 123;
      const agentRunId = 456;
      const request: StopAgentRunRequest = {
        agent_run_id: agentRunId
      };

      const successResponse = {
        id: agentRunId,
        status: 'stopped',
        organization_id: organizationId,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:01:00Z',
        stopped_at: '2024-01-01T00:01:00Z'
      };

      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => successResponse,
      });

      // Validate inputs first (should pass)
      const validation = validateStopAgentRunRequest(organizationId, agentRunId);
      expect(validation.isValid).toBe(true);

      // API call should succeed
      const result = await client.stopAgentRun(organizationId, request);
      
      expect(result).toEqual(successResponse);
      expect(result.id).toBe(agentRunId);
      expect(result.status).toBe('stopped');
      expect(result.organization_id).toBe(organizationId);
    });

    test('should handle stop request with stopping status', async () => {
      const organizationId = 123;
      const agentRunId = 456;
      const request: StopAgentRunRequest = {
        agent_run_id: agentRunId
      };

      const stoppingResponse = {
        id: agentRunId,
        status: 'stopping',
        organization_id: organizationId,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:01:00Z'
      };

      // Mock response with stopping status
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => stoppingResponse,
      });

      // Validate inputs first (should pass)
      const validation = validateStopAgentRunRequest(organizationId, agentRunId);
      expect(validation.isValid).toBe(true);

      // API call should succeed
      const result = await client.stopAgentRun(organizationId, request);
      
      expect(result).toEqual(stoppingResponse);
      expect(result.id).toBe(agentRunId);
      expect(result.status).toBe('stopping');
      expect(result.organization_id).toBe(organizationId);
    });
  });

  describe('Type safety validation', () => {
    test('should ensure StopAgentRunRequest has correct type structure', () => {
      const request: StopAgentRunRequest = {
        agent_run_id: 123
      };

      // TypeScript should enforce these at compile time
      expect(typeof request.agent_run_id).toBe('number');
      expect(request).toHaveProperty('agent_run_id');
      
      // Ensure no extra properties are allowed (TypeScript compile-time check)
      const keys = Object.keys(request);
      expect(keys).toEqual(['agent_run_id']);
    });

    test('should validate that organizationId parameter is number type', () => {
      const organizationId: number = 123;
      const agentRunId: number = 456;

      // TypeScript should enforce these types at compile time
      expect(typeof organizationId).toBe('number');
      expect(typeof agentRunId).toBe('number');
      
      // Runtime validation should also pass
      const validation = validateStopAgentRunRequest(organizationId, agentRunId);
      expect(validation.isValid).toBe(true);
    });
  });
});
