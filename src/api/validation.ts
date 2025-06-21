// Validation utilities for API requests

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates organization ID for API requests
 */
export function validateOrganizationId(organizationId: number): ValidationResult {
  const errors: string[] = [];

  if (!Number.isInteger(organizationId)) {
    errors.push('Organization ID must be an integer');
  }

  if (organizationId < 0) {
    errors.push('Organization ID must be non-negative');
  }

  if (organizationId > Number.MAX_SAFE_INTEGER) {
    errors.push('Organization ID exceeds maximum safe integer value');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates agent run ID for stop requests
 */
export function validateAgentRunId(agentRunId: number): ValidationResult {
  const errors: string[] = [];

  if (!Number.isInteger(agentRunId)) {
    errors.push('Agent run ID must be an integer');
  }

  if (agentRunId < 0) {
    errors.push('Agent run ID must be non-negative');
  }

  if (agentRunId > Number.MAX_SAFE_INTEGER) {
    errors.push('Agent run ID exceeds maximum safe integer value');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates stop agent run request parameters
 */
export function validateStopAgentRunRequest(
  organizationId: number,
  agentRunId: number
): ValidationResult {
  const errors: string[] = [];

  const orgValidation = validateOrganizationId(organizationId);
  const agentRunValidation = validateAgentRunId(agentRunId);

  errors.push(...orgValidation.errors);
  errors.push(...agentRunValidation.errors);

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates API token format
 */
export function validateApiToken(token: string): ValidationResult {
  const errors: string[] = [];

  if (!token || typeof token !== 'string') {
    errors.push('API token is required and must be a string');
    return {
      isValid: false,
      errors
    };
  }

  if (token.trim().length === 0) {
    errors.push('API token cannot be empty or whitespace only');
  }

  if (token && token.length < 10) {
    errors.push('API token appears to be too short');
  }

  // Check for common placeholder values
  const placeholders = [
    'your_api_token_here',
    'api_token',
    'token',
    'placeholder',
    'test',
    'example'
  ];

  if (token && placeholders.includes(token.toLowerCase())) {
    errors.push('API token appears to be a placeholder value');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates API base URL format
 */
export function validateApiBaseUrl(baseUrl: string): ValidationResult {
  const errors: string[] = [];

  if (!baseUrl || typeof baseUrl !== 'string') {
    errors.push('API base URL is required and must be a string');
    return {
      isValid: false,
      errors
    };
  }

  if (baseUrl.trim().length === 0) {
    errors.push('API base URL cannot be empty or whitespace only');
  }

  try {
    if (baseUrl) {
      const url = new URL(baseUrl);
      
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('API base URL must use HTTP or HTTPS protocol');
      }

      if (!url.hostname) {
        errors.push('API base URL must have a valid hostname');
      }
    }
  } catch (error) {
    errors.push('API base URL is not a valid URL format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
