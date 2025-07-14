/**
 * Test setup for web-eval-agent tests
 */

import { jest } from '@jest/globals';

// Global test configuration
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = 'test-api-key';
process.env.GITHUB_TOKEN = 'test-github-token';

// Global test timeout
jest.setTimeout(30000);

// Mock fetch for API tests
global.fetch = jest.fn();

// Mock child_process spawn for MCP server tests
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

// Setup and teardown
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset fetch mock
  if (global.fetch && global.fetch.mockReset) {
    global.fetch.mockReset();
  }
});

afterEach(() => {
  // Clean up any test artifacts
  jest.restoreAllMocks();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Helper functions for tests
global.testHelpers = {
  // Create a mock MCP response
  createMockMCPResponse: (id, result, error = null) => ({
    jsonrpc: '2.0',
    id,
    ...(error ? { error } : { result })
  }),

  // Create a mock Express app for testing
  createMockApp: () => {
    const express = require('express');
    const app = express();
    app.use(express.json());
    return app;
  },

  // Wait for a specified amount of time
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate a random session ID for testing
  generateTestSessionId: () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

  // Create test evaluation data
  createTestEvaluation: (overrides = {}) => ({
    sessionId: global.testHelpers.generateTestSessionId(),
    url: 'http://localhost:3000',
    task: 'Test the application',
    startTime: Date.now(),
    status: 'running',
    ...overrides
  })
};

export default global.testHelpers;

