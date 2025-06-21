# Codegen API Endpoints Documentation

This document provides comprehensive information about available API endpoints for the Codegen Agent Run Manager.

## Base URLs

- **Production**: `https://api.codegen.com`
- **Development**: `http://localhost:3001/api` (via proxy server)

## Authentication

All API requests require authentication using an API token:

```
Authorization: Bearer YOUR_API_TOKEN
```

## Available Endpoints

### Agent Runs

#### Create Agent Run
```
POST /v1/organizations/{organizationId}/agent/run
```

**Request Body:**
```json
{
  "prompt": "Your agent prompt here",
  "context": "Optional context",
  "settings": {
    "model": "claude-3-sonnet",
    "temperature": 0.7
  }
}
```

**Response:**
```json
{
  "id": 12345,
  "organization_id": 123,
  "status": "pending",
  "created_at": "2024-01-15T10:30:00Z",
  "web_url": "https://app.codegen.com/agent-runs/12345"
}
```

#### Get Agent Run
```
GET /v1/organizations/{organizationId}/agent/run/{agentRunId}
```

**Response:**
```json
{
  "id": 12345,
  "organization_id": 123,
  "status": "running",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:35:00Z",
  "web_url": "https://app.codegen.com/agent-runs/12345",
  "result": "Agent run result (if completed)"
}
```

#### Resume Agent Run (Multiple Endpoint Patterns)

The resume functionality may be available at different endpoints depending on the API version:

**Primary Pattern:**
```
POST /v1/organizations/{organizationId}/agent/run/{agentRunId}/resume
```

**Alternative Patterns:**
```
POST /v1/organizations/{organizationId}/agent/run/{agentRunId}/continue
POST /v1/organizations/{organizationId}/agent-runs/{agentRunId}/resume
POST /v1/beta/organizations/{organizationId}/agent/run/resume
```

**Request Body:**
```json
{
  "prompt": "Additional instructions or response"
}
```

#### Stop Agent Run
```
POST /v1/organizations/{organizationId}/agent/run/{agentRunId}/stop
```

#### Delete Agent Run
```
DELETE /v1/organizations/{organizationId}/agent/run/{agentRunId}
```

### Organizations

#### Get Current User
```
GET /v1/users/me
```

**Response:**
```json
{
  "id": 123,
  "email": "user@example.com",
  "name": "John Doe",
  "organizations": [
    {
      "id": 123,
      "name": "My Organization",
      "role": "admin"
    }
  ]
}
```

## Status Codes

| Code | Description | Action |
|------|-------------|---------|
| 200 | Success | Request completed successfully |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Check request parameters |
| 401 | Unauthorized | Check API token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Endpoint or resource doesn't exist |
| 429 | Rate Limited | Wait before retrying |
| 500 | Server Error | Try again later |

## Error Responses

All error responses follow this format:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Human-readable error message",
    "details": "Additional error details (optional)"
  }
}
```

## API Discovery Tools

### Using the Proxy Server

The development proxy server includes API discovery features:

```bash
# Get available endpoints
curl http://localhost:3001/api-discovery

# Test endpoint availability
curl http://localhost:3001/api-discovery?test=true
```

### Manual Testing

You can test endpoints manually using curl:

```bash
# Test authentication
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.codegen.com/v1/users/me

# Create an agent run
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"prompt": "Hello, world!"}' \
     https://api.codegen.com/v1/organizations/123/agent/run
```

## Rate Limiting

- **Rate Limit**: 100 requests per minute per API token
- **Burst Limit**: 10 requests per second
- **Headers**: Check `X-RateLimit-*` headers in responses

## Monitoring and Webhooks

### Auto-Monitoring

All agent runs are automatically added to monitoring when created. The system will:

- Poll for status changes every 30 seconds
- Send notifications for status changes
- Track completion and error states
- Maintain status history

### Webhook Events (Future)

Planned webhook events:
- `agent_run.created`
- `agent_run.status_changed`
- `agent_run.completed`
- `agent_run.failed`

## Best Practices

1. **Error Handling**: Always handle 404 errors gracefully, especially for resume endpoints
2. **Retry Logic**: Implement exponential backoff for 5xx errors
3. **Rate Limiting**: Respect rate limits and implement proper queuing
4. **Monitoring**: Use the auto-monitoring features for long-running agent runs
5. **Logging**: Log API calls for debugging and monitoring

## Troubleshooting

### Common Issues

1. **404 on Resume Endpoint**
   - The resume endpoint structure may vary
   - Try alternative endpoint patterns
   - Check if the agent run supports resuming

2. **Authentication Errors**
   - Verify API token is correct
   - Check token permissions
   - Ensure token hasn't expired

3. **Rate Limiting**
   - Implement proper retry logic
   - Use exponential backoff
   - Monitor rate limit headers

### Debug Mode

Enable debug logging in the application:

```javascript
// In browser console
localStorage.setItem('codegen-debug', 'true');
```

This will log all API requests and responses to the console.

## SDK Usage

The application includes a TypeScript SDK for easier API interaction:

```typescript
import { getAPIClient } from './api/client';

const client = getAPIClient();

// Create agent run
const run = await client.createAgentRun(organizationId, {
  prompt: "Your prompt here"
});

// Get agent run status
const status = await client.getAgentRun(organizationId, run.id);

// Resume agent run (with fallback)
try {
  await client.resumeAgentRun(organizationId, run.id, {
    prompt: "Continue with this"
  });
} catch (error) {
  console.error('Resume failed:', error);
}
```

## Support

For API support and questions:
- Check the console logs for detailed error information
- Use the API discovery tools to test endpoint availability
- Review the error handling in the application code
- Contact support with specific error messages and request details

