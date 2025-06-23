# Codegen App Backend Automation Service

This backend service provides headless browser automation for resuming Codegen agent runs. It uses Puppeteer to automate the Codegen web interface, bypassing browser security restrictions that prevent client-side automation.

## Features

- **Headless Browser Automation**: True invisible automation using Puppeteer
- **Authentication Context Transfer**: Securely transfers user authentication from frontend
- **Robust Element Detection**: Multiple fallback strategies for finding UI elements
- **Comprehensive Error Handling**: Detailed logging and error reporting
- **Rate Limiting**: Protection against abuse
- **CORS Support**: Configured for frontend integration

## Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment configuration:
```bash
cp .env.example .env
```

4. Start the service:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### POST /api/resume-agent-run

Resumes a Codegen agent run by automating the chat interface.

**Request Body:**
```json
{
  "agentRunId": 12345,
  "organizationId": 323,
  "prompt": "Continue with the previous task",
  "authContext": {
    "cookies": [...],
    "localStorage": {...},
    "sessionStorage": {...},
    "userAgent": "...",
    "origin": "..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Agent run #12345 resumed successfully",
  "duration": 5432,
  "agentRunId": 12345,
  "organizationId": 323
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Configuration

Environment variables (see `.env.example`):

- `PORT`: Server port (default: 3002)
- `NODE_ENV`: Environment mode (development/production)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:3000)
- `LOG_LEVEL`: Logging level (default: info)
- `PUPPETEER_HEADLESS`: Run Puppeteer in headless mode (default: true)
- `PUPPETEER_TIMEOUT`: Page load timeout in ms (default: 30000)
- `RATE_LIMIT_WINDOW_MS`: Rate limiting window (default: 900000)
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window (default: 100)

## Architecture

### Components

1. **server.js**: Express server with middleware and routing
2. **automation-service.js**: Main automation logic using Puppeteer
3. **selectors.js**: UI element selectors and detection logic
4. **auth-handler.js**: Authentication context management
5. **logger.js**: Winston-based logging system

### Authentication Flow

1. Frontend extracts authentication context (cookies, localStorage, etc.)
2. Backend receives context and applies it to Puppeteer page
3. Automation navigates to Codegen with user's authentication
4. Elements are found and message is sent automatically

### Element Detection Strategy

The service uses multiple fallback strategies to find UI elements:

1. **Primary XPath selectors**: Specific paths to known elements
2. **Fallback XPath selectors**: More generic XPath expressions
3. **CSS selectors**: Standard CSS selector fallbacks
4. **Generic selectors**: Broad selectors based on attributes

## Debugging

### Debug Screenshots

When automation fails, the service automatically takes screenshots:
- `debug-no-input.png`: When chat input element is not found
- `debug-no-button.png`: When send button is not found
- `debug-not-sent.png`: When message appears not to be sent
- `debug-error-{agentRunId}.png`: General error screenshots

### Logs

Logs are written to:
- `logs/combined.log`: All log levels
- `logs/error.log`: Error level only
- Console output in development mode

### Testing

Test the automation service:

```bash
# Run all tests
npm test

# Test specific functionality
curl -X POST http://localhost:3002/api/resume-agent-run \
  -H "Content-Type: application/json" \
  -d '{
    "agentRunId": 12345,
    "organizationId": 323,
    "prompt": "Test message",
    "authContext": {...}
  }'
```

## Deployment

### Docker (Recommended)

```dockerfile
FROM node:18-alpine

# Install Puppeteer dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3002
CMD ["npm", "start"]
```

### Environment Setup

For production deployment:

1. Set `NODE_ENV=production`
2. Configure proper `FRONTEND_URL`
3. Set up log rotation for log files
4. Configure reverse proxy (nginx/Apache)
5. Set up process manager (PM2/systemd)

## Security Considerations

- Authentication context is handled securely and not logged
- Rate limiting prevents abuse
- CORS is configured for specific frontend origins
- Input validation on all endpoints
- No sensitive data is stored persistently

## Troubleshooting

### Common Issues

1. **Puppeteer fails to launch**: Install Chrome/Chromium dependencies
2. **Authentication fails**: Check cookie/session transfer
3. **Elements not found**: Update selectors in `selectors.js`
4. **CORS errors**: Verify `FRONTEND_URL` configuration
5. **Rate limiting**: Adjust rate limit settings

### Performance Optimization

- Browser instances are created per request (stateless)
- Automatic cleanup of browser resources
- Configurable timeouts for different operations
- Efficient element detection with early returns

## Contributing

1. Follow existing code style and patterns
2. Add comprehensive error handling
3. Update selectors when Codegen UI changes
4. Add tests for new functionality
5. Update documentation for API changes
