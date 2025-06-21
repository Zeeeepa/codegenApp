/// <reference types="jest" />
import {
  validateOrganizationId,
  validateAgentRunId,
  validateStopAgentRunRequest,
  validateApiToken,
  validateApiBaseUrl,
  ValidationResult
} from './validation';

describe('API Validation Utilities', () => {
  describe('validateOrganizationId', () => {
    test('should validate positive integer organization IDs', () => {
      const validIds = [1, 123, 999999];
      
      validIds.forEach(id => {
        const result = validateOrganizationId(id);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should validate zero as organization ID', () => {
      const result = validateOrganizationId(0);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject negative organization IDs', () => {
      const invalidIds = [-1, -123, -999];
      
      invalidIds.forEach(id => {
        const result = validateOrganizationId(id);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Organization ID must be non-negative');
      });
    });

    test('should reject non-integer organization IDs', () => {
      const invalidIds = [1.5, 3.14, NaN, Infinity];
      
      invalidIds.forEach(id => {
        const result = validateOrganizationId(id);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Organization ID must be an integer');
      });
    });

    test('should reject organization IDs exceeding MAX_SAFE_INTEGER', () => {
      const invalidId = Number.MAX_SAFE_INTEGER + 1;
      const result = validateOrganizationId(invalidId);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Organization ID exceeds maximum safe integer value');
    });

    test('should accept MAX_SAFE_INTEGER as valid organization ID', () => {
      const result = validateOrganizationId(Number.MAX_SAFE_INTEGER);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateAgentRunId', () => {
    test('should validate positive integer agent run IDs', () => {
      const validIds = [1, 456, 789123];
      
      validIds.forEach(id => {
        const result = validateAgentRunId(id);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should validate zero as agent run ID', () => {
      const result = validateAgentRunId(0);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject negative agent run IDs', () => {
      const invalidIds = [-1, -456, -999];
      
      invalidIds.forEach(id => {
        const result = validateAgentRunId(id);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Agent run ID must be non-negative');
      });
    });

    test('should reject non-integer agent run IDs', () => {
      const invalidIds = [1.5, 2.7, NaN, Infinity];
      
      invalidIds.forEach(id => {
        const result = validateAgentRunId(id);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Agent run ID must be an integer');
      });
    });

    test('should reject agent run IDs exceeding MAX_SAFE_INTEGER', () => {
      const invalidId = Number.MAX_SAFE_INTEGER + 1;
      const result = validateAgentRunId(invalidId);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Agent run ID exceeds maximum safe integer value');
    });

    test('should accept MAX_SAFE_INTEGER as valid agent run ID', () => {
      const result = validateAgentRunId(Number.MAX_SAFE_INTEGER);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateStopAgentRunRequest', () => {
    test('should validate request with valid organization and agent run IDs', () => {
      const result = validateStopAgentRunRequest(123, 456);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should collect errors from both organization and agent run ID validation', () => {
      const result = validateStopAgentRunRequest(-1, -2);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Organization ID must be non-negative');
      expect(result.errors).toContain('Agent run ID must be non-negative');
      expect(result.errors).toHaveLength(2);
    });

    test('should validate request with zero values', () => {
      const result = validateStopAgentRunRequest(0, 0);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should handle mixed valid and invalid IDs', () => {
      const result1 = validateStopAgentRunRequest(123, -1);
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Agent run ID must be non-negative');
      expect(result1.errors).not.toContain('Organization ID must be non-negative');

      const result2 = validateStopAgentRunRequest(-1, 456);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Organization ID must be non-negative');
      expect(result2.errors).not.toContain('Agent run ID must be non-negative');
    });
  });

  describe('validateApiToken', () => {
    test('should validate proper API tokens', () => {
      const validTokens = [
        'sk-1234567890abcdef',
        'api_key_1234567890',
        'bearer_token_abcdef123456',
        'very-long-api-token-with-special-chars-123!@#'
      ];
      
      validTokens.forEach(token => {
        const result = validateApiToken(token);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should reject empty or null tokens', () => {
      const invalidTokens = ['', '   ', null as any, undefined as any];
      
      invalidTokens.forEach(token => {
        const result = validateApiToken(token);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    test('should reject non-string tokens', () => {
      const invalidTokens = [123, {}, [], true, false];
      
      invalidTokens.forEach(token => {
        const result = validateApiToken(token as any);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('API token is required and must be a string');
      });
    });

    test('should reject whitespace-only tokens', () => {
      const whitespaceTokens = ['   ', '\t', '\n', '  \t\n  '];
      
      whitespaceTokens.forEach(token => {
        const result = validateApiToken(token);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('API token cannot be empty or whitespace only');
      });
    });

    test('should reject tokens that are too short', () => {
      const shortTokens = ['a', 'ab', 'abc', '123456789'];
      
      shortTokens.forEach(token => {
        const result = validateApiToken(token);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('API token appears to be too short');
      });
    });

    test('should reject common placeholder tokens', () => {
      const placeholderTokens = [
        'your_api_token_here',
        'api_token',
        'token',
        'placeholder',
        'test',
        'example',
        'YOUR_API_TOKEN_HERE', // case insensitive
        'API_TOKEN',
        'TOKEN'
      ];
      
      placeholderTokens.forEach(token => {
        const result = validateApiToken(token);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('API token appears to be a placeholder value');
      });
    });
  });

  describe('validateApiBaseUrl', () => {
    test('should validate proper HTTPS URLs', () => {
      const validUrls = [
        'https://api.codegen.com',
        'https://api.example.com',
        'https://localhost:3000',
        'https://api.staging.example.com:8080'
      ];
      
      validUrls.forEach(url => {
        const result = validateApiBaseUrl(url);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should validate proper HTTP URLs', () => {
      const validUrls = [
        'http://localhost:3000',
        'http://api.local.dev',
        'http://127.0.0.1:8080'
      ];
      
      validUrls.forEach(url => {
        const result = validateApiBaseUrl(url);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should reject empty or null URLs', () => {
      const invalidUrls = ['', '   ', null as any, undefined as any];
      
      invalidUrls.forEach(url => {
        const result = validateApiBaseUrl(url);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    test('should reject non-string URLs', () => {
      const invalidUrls = [123, {}, [], true, false];
      
      invalidUrls.forEach(url => {
        const result = validateApiBaseUrl(url as any);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('API base URL is required and must be a string');
      });
    });

    test('should reject whitespace-only URLs', () => {
      const whitespaceUrls = ['   ', '\t', '\n', '  \t\n  '];
      
      whitespaceUrls.forEach(url => {
        const result = validateApiBaseUrl(url);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('API base URL cannot be empty or whitespace only');
      });
    });

    test('should reject invalid URL formats', () => {
      const invalidUrls = [
        'not-a-url',
        'just-text',
        'ftp://example.com', // wrong protocol
        'file:///path/to/file',
        'mailto:test@example.com'
      ];
      
      invalidUrls.forEach(url => {
        const result = validateApiBaseUrl(url);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    test('should reject URLs with invalid protocols', () => {
      const invalidProtocolUrls = [
        'ftp://api.example.com',
        'ws://api.example.com',
        'file://api.example.com'
      ];
      
      invalidProtocolUrls.forEach(url => {
        const result = validateApiBaseUrl(url);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('API base URL must use HTTP or HTTPS protocol');
      });
    });

    test('should reject URLs without hostnames', () => {
      const invalidUrls = [
        'https://',
        'http://',
        'https:///',
        'http:///'
      ];
      
      invalidUrls.forEach(url => {
        const result = validateApiBaseUrl(url);
        expect(result.isValid).toBe(false);
        // These URLs are actually invalid format, so they'll trigger the catch block
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('ValidationResult interface', () => {
    test('should have correct structure for valid results', () => {
      const result = validateOrganizationId(123);
      
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('should have correct structure for invalid results', () => {
      const result = validateOrganizationId(-1);
      
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
