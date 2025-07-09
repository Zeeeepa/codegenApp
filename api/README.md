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

### POST /api/test-automation

Tests the automation service with a dry run.

**Request Body:**
```json
{
  "agentRunId": 12345,
  "authContext": {...}
}
```

**Response:**
```json
{
  "success": true,
  "results": {
    "pageLoaded": true,
    "authenticated": true,
    "chatInputFound": true,
    "sendButtonFound": true,
    "url": "https://codegen.com/agent/trace/12345"
  }
}
```
### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "automation-backend",
  "version": "1.0.0"
}
```

### GET /api/auth-script

Returns JavaScript code for extracting authentication context from the frontend.

**Response:**
```json
{
  "success": true,
  "script": "(async function extractAuthContext() { ... })();"
}
```

## Configuration

Environment variables (see `.env.example`):

- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment mode (development/production)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:8080)
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
# Health check
curl http://localhost:3001/health

# Test automation (requires auth context)
curl -X POST http://localhost:3001/api/test-automation \
  -H "Content-Type: application/json" \
  -d '{
    "agentRunId": 12345,
    "authContext": {...}
  }'
```

## Frontend Integration

The automation service is accessible through the frontend proxy at:
- `http://localhost:8080/automation/health`
- `http://localhost:8080/automation/api/resume-agent-run`
- `http://localhost:8080/automation/api/test-automation`

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

## Usage Example

```javascript
// Extract auth context in frontend
const authContext = await eval(authExtractionScript);

// Send resume request
const response = await fetch('/automation/api/resume-agent-run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentRunId: 12345,
    organizationId: 323,
    prompt: 'Continue with the task',
    authContext: authContext
  })
});

const result = await response.json();
console.log('Automation result:', result);
```
