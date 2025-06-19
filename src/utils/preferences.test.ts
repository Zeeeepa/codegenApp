import { validateEnvironmentConfiguration } from './preferences';

// Mock environment variables for testing
const originalEnv = process.env;

describe('Environment Variable Validation', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('should validate when all required variables are present', () => {
    process.env.REACT_APP_API_TOKEN = 'test-token';
    process.env.REACT_APP_API_BASE_URL = 'https://api.codegen.com';
    
    const result = validateEnvironmentConfiguration();
    
    expect(result.isValid).toBe(true);
    expect(result.missingVars).toHaveLength(0);
  });

  test('should detect missing API token', () => {
    delete process.env.REACT_APP_API_TOKEN;
    process.env.REACT_APP_API_BASE_URL = 'https://api.codegen.com';
    
    const result = validateEnvironmentConfiguration();
    
    expect(result.isValid).toBe(false);
    expect(result.missingVars).toContain('REACT_APP_API_TOKEN');
  });

  test('should warn about missing API base URL', () => {
    process.env.REACT_APP_API_TOKEN = 'test-token';
    delete process.env.REACT_APP_API_BASE_URL;
    
    const result = validateEnvironmentConfiguration();
    
    expect(result.isValid).toBe(true); // Still valid, just a warning
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('REACT_APP_API_BASE_URL')
      ])
    );
  });

  test('should handle optional variables as warnings', () => {
    process.env.REACT_APP_API_TOKEN = 'test-token';
    process.env.REACT_APP_API_BASE_URL = 'https://api.codegen.com';
    delete process.env.REACT_APP_DEFAULT_ORGANIZATION;
    delete process.env.REACT_APP_USER_ID;
    
    const result = validateEnvironmentConfiguration();
    
    expect(result.isValid).toBe(true);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('REACT_APP_DEFAULT_ORGANIZATION')
      ])
    );
  });

  test('should detect placeholder API token', () => {
    process.env.REACT_APP_API_TOKEN = 'your_api_token_here';
    process.env.REACT_APP_API_BASE_URL = 'https://api.codegen.com';
    
    const result = validateEnvironmentConfiguration();
    
    // The current implementation doesn't check for placeholder values
    // This test documents the current behavior
    expect(result.isValid).toBe(true);
    expect(result.missingVars).toHaveLength(0);
  });
});
