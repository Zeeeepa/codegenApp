/**
 * Test setup for backend and integration tests
 */

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.CODEGEN_API_KEY = 'test-api-key';
process.env.CODEGEN_ORG_ID = '323';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.GITHUB_TOKEN = 'test-github-token';
process.env.CLOUDFLARE_API_KEY = 'test-cloudflare-key';
process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account-id';
process.env.CLOUDFLARE_WORKER_URL = 'https://test-worker.example.com';
process.env.GRAINCHAIN_ENABLED = 'true';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};
