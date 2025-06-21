/// <reference types="jest" />
import { CodegenAPIClient } from './client';
import { StopAgentRunRequest, AgentRunResponse } from './types';
import { API_ENDPOINTS } from './constants';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

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

describe('CodegenAPIClient - Stop Agent Run', () => {
  let client: CodegenAPIClient;
  const mockApiToken = 'test-api-token';
  const mockBaseUrl = 'https://api.test.com';

  beforeEach(() => {
    // Mock credentials for the client
    const { getCredentials, showCredentialsError } = require('../utils/credentials');
    getCredentials.mockResolvedValue({
      apiToken: mockApiToken,
      apiBaseUrl: mockBaseUrl
    });
    
    client = new CodegenAPIClient();
    mockFetch.mockClear();
    getCredentials.mockClear();
    showCredentialsError.mockClear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('stopAgentRun method', () => {
    const validOrganizationId = 123;
    const validRequest: StopAgentRunRequest = {
      agent_run_id: 456
    };

    const mockSuccessResponse: AgentRunResponse = {
      id: 456,
      status: 'stopped',
      organization_id: validOrganizationId,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:01:00Z'
    };

    test('should make POST request to correct endpoint with valid parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse,
      });

      const result = await client.stopAgentRun(validOrganizationId, validRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}${API_ENDPOINTS.AGENT_RUN_STOP(validOrganizationId)}`,
        {
          method: 'POST',
          mode: 'cors',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockApiToken}`,
          },
          body: JSON.stringify(validRequest),
        }
      );
      expect(result).toEqual(mockSuccessResponse);
    });

    test('should construct correct endpoint URL for different organization IDs', async () => {
      const testCases = [1, 999, 123456];
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse,
      });

      for (const orgId of testCases) {
        await client.stopAgentRun(orgId, validRequest);
        
        expect(mockFetch).toHaveBeenCalledWith(
          `${mockBaseUrl}/v1/beta/organizations/${orgId}/agent/run/stop`,
          expect.any(Object)
        );
      }
    });

    test('should include agent_run_id in request body', async () => {
      const testAgentRunIds = [1, 999, 123456789];
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse,
      });

      for (const agentRunId of testAgentRunIds) {
        const request: StopAgentRunRequest = { agent_run_id: agentRunId };
        await client.stopAgentRun(validOrganizationId, request);
        
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: JSON.stringify({ agent_run_id: agentRunId }),
          })
        );
      }
    });

    test('should handle successful response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse,
      });

      const result = await client.stopAgentRun(validOrganizationId, validRequest);

      expect(result).toEqual(mockSuccessResponse);
      expect(result.status).toBe('stopped');
      expect(result.id).toBe(validRequest.agent_run_id);
    });

    test('should handle 404 error when agent run not found', async () => {
      const errorResponse = {
        error: 'Agent run not found',
        code: 'AGENT_RUN_NOT_FOUND'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => errorResponse,
      });

      await expect(client.stopAgentRun(validOrganizationId, validRequest))
        .rejects.toThrow('Agent run not found');
    });

    test('should handle 400 error for invalid request', async () => {
      const errorResponse = {
        error: 'Invalid agent_run_id',
        code: 'INVALID_REQUEST'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => errorResponse,
      });

      await expect(client.stopAgentRun(validOrganizationId, validRequest))
        .rejects.toThrow('Invalid agent_run_id');
    });

    test('should handle 403 error for unauthorized organization access', async () => {
      const errorResponse = {
        error: 'Access denied to organization',
        code: 'ORGANIZATION_ACCESS_DENIED'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => errorResponse,
      });

      await expect(client.stopAgentRun(validOrganizationId, validRequest))
        .rejects.toThrow('Access denied');
    });

    test('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.stopAgentRun(validOrganizationId, validRequest))
        .rejects.toThrow('Network error');
    });

    test('should handle timeout errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

      await expect(client.stopAgentRun(validOrganizationId, validRequest))
        .rejects.toThrow('Request timeout');
    });

    test('should handle malformed JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(client.stopAgentRun(validOrganizationId, validRequest))
        .rejects.toThrow('Invalid JSON');
    });
  });

  describe('Input validation edge cases', () => {
    test('should handle zero organization ID', async () => {
      const request: StopAgentRunRequest = { agent_run_id: 123 };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 123, status: 'stopped' }),
      });

      await client.stopAgentRun(0, request);

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/v1/beta/organizations/0/agent/run/stop`,
        expect.any(Object)
      );
    });

    test('should handle zero agent_run_id', async () => {
      const request: StopAgentRunRequest = { agent_run_id: 0 };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 0, status: 'stopped' }),
      });

      await client.stopAgentRun(123, request);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ agent_run_id: 0 }),
        })
      );
    });

    test('should handle large organization ID', async () => {
      const largeOrgId = Number.MAX_SAFE_INTEGER;
      const request: StopAgentRunRequest = { agent_run_id: 123 };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 123, status: 'stopped' }),
      });

      await client.stopAgentRun(largeOrgId, request);

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/v1/beta/organizations/${largeOrgId}/agent/run/stop`,
        expect.any(Object)
      );
    });

    test('should handle large agent_run_id', async () => {
      const largeAgentRunId = Number.MAX_SAFE_INTEGER;
      const request: StopAgentRunRequest = { agent_run_id: largeAgentRunId };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: largeAgentRunId, status: 'stopped' }),
      });

      await client.stopAgentRun(123, request);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ agent_run_id: largeAgentRunId }),
        })
      );
    });
  });

  describe('Request headers and authentication', () => {
    test('should include correct Content-Type header', async () => {
      const request: StopAgentRunRequest = { agent_run_id: 123 };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 123, status: 'stopped' }),
      });

      await client.stopAgentRun(123, request);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    test('should include correct Authorization header', async () => {
      const request: StopAgentRunRequest = { agent_run_id: 123 };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 123, status: 'stopped' }),
      });

      await client.stopAgentRun(123, request);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockApiToken}`,
          }),
        })
      );
    });

    test('should handle 401 unauthorized error', async () => {
      const request: StopAgentRunRequest = { agent_run_id: 123 };
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      await expect(client.stopAgentRun(123, request))
        .rejects.toThrow('Authentication failed');
    });
  });

  describe('Response validation', () => {
    test('should validate response structure for successful stop', async () => {
      const request: StopAgentRunRequest = { agent_run_id: 123 };
      const response = {
        id: 123,
        status: 'stopped',
        organization_id: 456,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:01:00Z'
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => response,
      });

      const result = await client.stopAgentRun(456, request);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('organization_id');
      expect(result).toHaveProperty('created_at');
      expect(result).toHaveProperty('updated_at');
      expect(result.status).toBe('stopped');
    });

    test('should handle different status values in response', async () => {
      const request: StopAgentRunRequest = { agent_run_id: 123 };
      const statusValues = ['stopped', 'stopping', 'failed'];
      
      for (const status of statusValues) {
        const response = {
          id: 123,
          status,
          organization_id: 456,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:01:00Z'
        };
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => response,
        });

        const result = await client.stopAgentRun(456, request);
        expect(result.status).toBe(status);
      }
    });
  });
});
