const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Enhanced proxy configuration with retry logic and better error handling
  const createRobustProxy = (path, target, options = {}) => {
    return createProxyMiddleware({
      target,
      changeOrigin: true,
      secure: false,
      timeout: 30000, // 30 second timeout
      proxyTimeout: 30000,
      logLevel: 'warn', // Reduce log noise
      // Connection pooling and keep-alive
      agent: require('http').globalAgent,
      headers: {
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=5, max=1000'
      },
      // Retry configuration
      retry: true,
      retryDelay: 1000,
      retryCount: 3,
      // Enhanced error handling
      onError: (err, req, res) => {
        console.error(`${path} proxy error:`, {
          error: err.message,
          code: err.code,
          target,
          url: req.url,
          method: req.method
        });
        
        // Provide more specific error responses
        if (err.code === 'ECONNREFUSED') {
          res.status(503).json({
            error: 'Service temporarily unavailable',
            message: `${path} backend service is not responding`,
            code: 'SERVICE_UNAVAILABLE',
            timestamp: new Date().toISOString()
          });
        } else if (err.code === 'ETIMEDOUT') {
          res.status(504).json({
            error: 'Gateway timeout',
            message: `${path} backend service timed out`,
            code: 'GATEWAY_TIMEOUT',
            timestamp: new Date().toISOString()
          });
        } else {
          res.status(502).json({
            error: 'Bad gateway',
            message: `${path} proxy error: ${err.message}`,
            code: 'BAD_GATEWAY',
            timestamp: new Date().toISOString()
          });
        }
      },
      // Connection event handlers
      onProxyReq: (proxyReq, req, res) => {
        // Add request ID for tracing
        const requestId = Math.random().toString(36).substring(7);
        proxyReq.setHeader('X-Request-ID', requestId);
        req.requestId = requestId;
      },
      onProxyRes: (proxyRes, req, res) => {
        // Add response headers for debugging
        res.setHeader('X-Proxy-Target', target);
        if (req.requestId) {
          res.setHeader('X-Request-ID', req.requestId);
        }
      },
      ...options
    });
  };

  // Proxy API requests to backend server (Codegen API proxy)
  app.use(
    '/api',
    createRobustProxy('/api', 'http://localhost:3004')
  );

  // Proxy v1 requests to backend server (Codegen API proxy)
  app.use(
    '/v1',
    createRobustProxy('/v1', 'http://localhost:3004')
  );

  // Proxy automation requests to automation backend with enhanced configuration
  app.use(
    '/automation',
    createRobustProxy('/automation', 'http://localhost:3001', {
      pathRewrite: {
        '^/automation': '' // Remove /automation prefix when forwarding
      },
      // Specific timeout for automation requests (they can take longer)
      timeout: 60000, // 60 seconds for automation
      proxyTimeout: 60000,
      // Health check configuration
      healthCheck: {
        enabled: true,
        interval: 30000, // Check every 30 seconds
        path: '/health'
      }
    })
  );

  // Add a middleware to log proxy health status
  app.use('/automation/health', (req, res, next) => {
    const startTime = Date.now();
    
    // Override res.end to log response time
    const originalEnd = res.end;
    res.end = function(...args) {
      const responseTime = Date.now() - startTime;
      console.log('Automation health check completed:', {
        responseTime,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString()
      });
      originalEnd.apply(this, args);
    };
    
    next();
  });
};
