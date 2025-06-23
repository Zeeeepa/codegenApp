const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy API requests to backend server (Codegen API proxy)
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3004',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).send('Proxy error');
      }
    })
  );

  // Proxy v1 requests to backend server (Codegen API proxy)
  app.use(
    '/v1',
    createProxyMiddleware({
      target: 'http://localhost:3004',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).send('Proxy error');
      }
    })
  );

  // Proxy automation requests to automation backend
  app.use(
    '/automation',
    createProxyMiddleware({
      target: 'http://localhost:3002',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      pathRewrite: {
        '^/automation': '' // Remove /automation prefix when forwarding
      },
      onError: (err, req, res) => {
        console.error('Automation proxy error:', err);
        res.status(500).send('Automation proxy error');
      }
    })
  );
};
