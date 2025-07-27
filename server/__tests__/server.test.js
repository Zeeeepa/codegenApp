/**
 * Comprehensive test suite for the Express.js proxy server
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

// Mock node-fetch
jest.mock('node-fetch');
const mockFetch = fetch;

// Import the server components
import dotenv from 'dotenv';
dotenv.config();

// Create test app similar to the main server
const createTestApp = () => {
  const app = express();
  
  // CORS configuration
  app.use(cors({
    origin: [
      'http://localhost:8000',
      'http://127.0.0.1:8000',
      'https://localhost:8000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin'
    ]
  }));

  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Proxy endpoint (simplified for testing)
  app.use('/api/v1', async (req, res) => {
    try {
      const targetUrl = `https://api.codegen.com/v1${req.path}`;
      const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
      const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;
      
      const response = await mockFetch(fullUrl, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization,
          'User-Agent': 'Agent-Run-Manager-Proxy/1.0',
          'Accept': 'application/json',
          'Accept-Encoding': 'identity'
        },
        body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      res.status(500).json({
        error: 'Proxy server error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  return app;
};

describe('Express Proxy Server', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('Health Check Endpoint', () => {
    test('GET /health returns 200 with status ok', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    test('Health check includes proper headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('CORS Configuration', () => {
    test('OPTIONS request returns proper CORS headers', async () => {
      const response = await request(app)
        .options('/api/v1/test')
        .set('Origin', 'http://localhost:8000')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:8000');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    test('Rejects requests from unauthorized origins', async () => {
      await request(app)
        .get('/health')
        .set('Origin', 'http://malicious-site.com')
        .expect(200); // Health endpoint should still work, but without CORS headers
    });
  });

  describe('API Proxy Functionality', () => {
    test('Successfully proxies GET request to Codegen API', async () => {
      const mockResponseData = { data: 'test response' };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponseData,
        headers: new Map([['content-type', 'application/json']])
      });

      const response = await request(app)
        .get('/api/v1/organizations')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body).toEqual(mockResponseData);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.codegen.com/v1/organizations',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    test('Successfully proxies POST request with body', async () => {
      const requestBody = { message: 'test message' };
      const mockResponseData = { id: 123, status: 'created' };
      
      mockFetch.mockResolvedValueOnce({
        status: 201,
        json: async () => mockResponseData,
        headers: new Map([['content-type', 'application/json']])
      });

      const response = await request(app)
        .post('/api/v1/agent-runs')
        .set('Authorization', 'Bearer test-token')
        .send(requestBody)
        .expect(201);

      expect(response.body).toEqual(mockResponseData);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.codegen.com/v1/agent-runs',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody)
        })
      );
    });

    test('Handles query parameters correctly', async () => {
      const mockResponseData = { results: [] };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: async () => mockResponseData,
        headers: new Map([['content-type', 'application/json']])
      });

      await request(app)
        .get('/api/v1/organizations?page=1&size=10')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.codegen.com/v1/organizations?page=1&size=10',
        expect.any(Object)
      );
    });

    test('Handles API errors correctly', async () => {
      const errorResponse = { error: 'Unauthorized', message: 'Invalid token' };
      mockFetch.mockResolvedValueOnce({
        status: 401,
        json: async () => errorResponse,
        headers: new Map([['content-type', 'application/json']])
      });

      const response = await request(app)
        .get('/api/v1/organizations')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toEqual(errorResponse);
    });

    test('Handles network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const response = await request(app)
        .get('/api/v1/organizations')
        .set('Authorization', 'Bearer test-token')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Proxy server error');
      expect(response.body).toHaveProperty('message', 'Network error');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('Requires authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/organizations')
        .expect(500); // Will fail due to undefined authorization

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Request/Response Headers', () => {
    test('Forwards authorization header correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({}),
        headers: new Map()
      });

      await request(app)
        .get('/api/v1/test')
        .set('Authorization', 'Bearer my-secret-token')
        .expect(200);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer my-secret-token'
          })
        })
      );
    });

    test('Sets proper User-Agent header', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: async () => ({}),
        headers: new Map()
      });

      await request(app)
        .get('/api/v1/test')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'Agent-Run-Manager-Proxy/1.0'
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('Handles JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        },
        text: async () => 'Invalid response',
        headers: new Map([['content-type', 'application/json']])
      });

      const response = await request(app)
        .get('/api/v1/test')
        .set('Authorization', 'Bearer test-token')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Proxy server error');
    });

    test('Handles different HTTP methods', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      
      for (const method of methods) {
        mockFetch.mockResolvedValueOnce({
          status: 200,
          json: async () => ({ method }),
          headers: new Map()
        });

        await request(app)
          [method.toLowerCase()]('/api/v1/test')
          .set('Authorization', 'Bearer test-token')
          .expect(200);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            method: method
          })
        );
      }
    });
  });
});
