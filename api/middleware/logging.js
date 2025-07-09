const logger = require('../logger');

// Request logging middleware with enhanced context
function requestLoggingMiddleware(req, res, next) {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || Math.random().toString(36).substring(7);
  
  // Add request ID to request object for use in other middleware
  req.requestId = requestId;
  
  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    referer: req.get('Referer'),
    origin: req.get('Origin')
  });
  
  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    
    // Log response
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      contentLength: res.get('Content-Length'),
      contentType: res.get('Content-Type')
    });
    
    // Log slow requests
    if (responseTime > 5000) { // 5 seconds
      logger.warn('Slow request detected', {
        requestId,
        method: req.method,
        url: req.url,
        responseTime,
        statusCode: res.statusCode
      });
    }
    
    // Log errors
    if (res.statusCode >= 400) {
      const logLevel = res.statusCode >= 500 ? 'error' : 'warn';
      logger[logLevel]('Request error', {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime
      });
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
}

// Error logging middleware
function errorLoggingMiddleware(err, req, res, next) {
  const requestId = req.requestId || 'unknown';
  
  logger.error('Unhandled request error', {
    requestId,
    method: req.method,
    url: req.url,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code
    },
    statusCode: res.statusCode || 500
  });
  
  next(err);
}

// Automation-specific logging middleware
function automationLoggingMiddleware(req, res, next) {
  if (req.path.includes('/api/resume-agent-run')) {
    const requestId = req.requestId || 'unknown';
    
    logger.info('Automation request received', {
      requestId,
      agentRunId: req.body?.agentRunId,
      organizationId: req.body?.organizationId,
      promptLength: req.body?.prompt?.length || 0,
      hasAuthContext: !!req.body?.authContext,
      authContextKeys: req.body?.authContext ? Object.keys(req.body.authContext) : []
    });
  }
  
  next();
}

module.exports = {
  requestLoggingMiddleware,
  errorLoggingMiddleware,
  automationLoggingMiddleware
};

