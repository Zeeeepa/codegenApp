# 🔔 Webhook Implementation Guide

## Overview

This guide provides comprehensive instructions for implementing automated PR notifications using Cloudflare Workers and GitHub webhooks. The system enables real-time PR event processing and automatic Grainchain validation flow triggering.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   GitHub PR     │───▶│ Cloudflare       │───▶│ CodegenApp      │───▶│ Grainchain       │
│   Events        │    │ Worker           │    │ Backend         │    │ Validation       │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └──────────────────┘
                              │                         │                         │
                              ▼                         ▼                         ▼
                       ┌──────────────────┐    ┌─────────────────┐    ┌──────────────────┐
                       │ Webhook          │    │ Event Bus       │    │ Web-Eval-Agent   │
                       │ Processing       │    │ System          │    │ Testing          │
                       └──────────────────┘    └─────────────────┘    └──────────────────┘
```

## Components

### 1. Cloudflare Worker (`cloudflare-webhook-worker/`)

**Purpose**: Receives GitHub webhook events and processes them at the edge

**Key Features**:
- GitHub webhook signature validation
- PR event filtering and processing
- Automatic validation workflow triggering
- Real-time dashboard notifications
- Global edge deployment for low latency

**Files**:
- `src/worker.py` - Main webhook handler
- `pyproject.toml` - Python dependencies
- `wrangler.toml` - Cloudflare configuration
- `build.sh` - Build and deployment script

### 2. Backend Webhook Endpoints (`backend/app/api/v1/routes/webhooks.py`)

**Purpose**: Receives webhook events from Cloudflare Worker and triggers internal workflows

**Endpoints**:
- `POST /api/v1/webhooks/pr-validation` - Triggers Grainchain validation
- `POST /api/v1/webhooks/pr-update` - Updates dashboard PR status
- `GET /api/v1/webhooks/status` - System health check
- `POST /api/v1/webhooks/test` - Test webhook functionality
- `GET /api/v1/webhooks/events/recent` - Recent webhook events

### 3. Event Bus Integration

**Purpose**: Provides real-time event routing and status updates

**Features**:
- Event publishing and subscription
- Real-time dashboard updates
- Workflow status tracking
- Error handling and retry logic

## Setup Instructions

### Step 1: Install Prerequisites

```bash
# Install uv package manager
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Node.js and npm (if not already installed)
# Install Cloudflare Wrangler CLI
npm install -g wrangler
```

### Step 2: Configure Environment Variables

Update your `.env` file with Cloudflare configuration:

```bash
# Cloudflare Workers Configuration
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id_here
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token_here
CLOUDFLARE_ZONE_ID=your_cloudflare_zone_id_here
WEBHOOK_WORKER_URL=https://your-webhook-worker.your-domain.workers.dev
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret_here

# Webhook Configuration
WEBHOOK_BASE_URL=https://your-codegenapp-domain.com
WEBHOOK_TIMEOUT=30000
WEBHOOK_MAX_RETRIES=3
```

### Step 3: Deploy Cloudflare Worker

```bash
# Navigate to worker directory
cd cloudflare-webhook-worker

# Build the worker
./build.sh

# Set secrets in Cloudflare
wrangler secret put GITHUB_WEBHOOK_SECRET
# Enter your GitHub webhook secret when prompted

wrangler secret put CODEGENAPP_BASE_URL
# Enter your CodegenApp backend URL when prompted

# Deploy the worker
npx wrangler deploy
```

### Step 4: Configure GitHub Webhooks

1. **Go to your GitHub repository settings**
2. **Navigate to Webhooks section**
3. **Add a new webhook with these settings**:
   - **Payload URL**: `https://your-worker.workers.dev/webhook/github`
   - **Content type**: `application/json`
   - **Secret**: Same as `GITHUB_WEBHOOK_SECRET`
   - **Events**: Select `pull_request` and `push` events
   - **Active**: ✅ Enabled

### Step 5: Test Webhook Integration

```bash
# Test Cloudflare Worker health
curl https://your-worker.workers.dev/health

# Test webhook endpoint
curl -X POST https://your-worker.workers.dev/webhook/test

# Test backend webhook system
curl -X POST http://localhost:3004/api/v1/webhooks/test

# Check webhook status
curl http://localhost:3004/api/v1/webhooks/status
```

## Project Configuration

### Adding Projects with Webhook Support

When adding projects to the dashboard, configure webhook settings:

```typescript
// Frontend: src/components/ProjectSettingsDialog.tsx
const projectConfig = {
  repository: "owner/repo-name",
  webhookTarget: "https://your-codegenapp-domain.com",
  validationSettings: {
    runTests: true,
    checkBuild: true,
    webEvaluation: true,
    codeAnalysis: true
  },
  eventFilters: ["opened", "synchronize", "reopened"]
};
```

### Custom Webhook Targets

Projects can specify custom webhook target URLs:

```python
# Backend: Custom webhook target per project
webhook_target_url = (
    repository.get("custom_properties", {}).get("codegenapp_webhook_url") or
    os.getenv("CODEGENAPP_BASE_URL")
)
```

## Validation Workflow

### Automatic PR Validation Flow

When a PR event is received:

1. **Cloudflare Worker** validates GitHub signature
2. **Worker** sends validation request to CodegenApp backend
3. **Backend** triggers Grainchain validation workflow:
   - Setup sandbox environment
   - Run code analysis with Graph-Sitter
   - Execute build validation
   - Perform web evaluation testing
4. **Event Bus** publishes real-time status updates
5. **Dashboard** displays validation progress and results

### Validation Workflow Steps

```python
workflow_steps = [
    {
        "name": "setup_sandbox",
        "service": "grainchain",
        "action": "create_sandbox",
        "parameters": {
            "repository": repository,
            "pr_number": pr_data["number"],
            "head_sha": pr_data["head_sha"]
        }
    },
    {
        "name": "code_analysis",
        "service": "graph_sitter",
        "action": "analyze_pr",
        "parameters": {
            "repository": repository,
            "pr_number": pr_data["number"],
            "base_branch": pr_data["base_branch"],
            "head_branch": pr_data["head_branch"]
        }
    },
    {
        "name": "build_validation",
        "service": "grainchain",
        "action": "validate_build",
        "parameters": {
            "repository": repository,
            "pr_number": pr_data["number"]
        }
    },
    {
        "name": "web_evaluation",
        "service": "web_eval_agent",
        "action": "test_pr",
        "parameters": {
            "git_repo": repository,
            "pull_request": pr_data["number"],
            "task": f"Evaluate PR #{pr_data['number']}: {pr_data['title']}"
        }
    }
]
```

## Security Considerations

### Webhook Signature Validation

```python
def verify_github_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify GitHub webhook signature"""
    if not signature.startswith('sha256='):
        return False
    
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(f'sha256={expected_signature}', signature)
```

### Environment Security

- Store secrets in Cloudflare Workers using `wrangler secret put`
- Use environment variables for sensitive configuration
- Implement request validation and rate limiting
- Monitor webhook delivery and failure rates

## Monitoring and Debugging

### Health Check Endpoints

```bash
# Cloudflare Worker health
GET https://your-worker.workers.dev/health

# Backend webhook status
GET /api/v1/webhooks/status

# Recent webhook events
GET /api/v1/webhooks/events/recent
```

### Logging and Metrics

- **Cloudflare Worker**: Logs available in Cloudflare dashboard
- **Backend**: Structured logging with correlation IDs
- **Event Bus**: Event history and metrics tracking
- **Validation Workflows**: Step-by-step execution logs

### Common Issues and Solutions

1. **Webhook Signature Validation Fails**
   - Verify `GITHUB_WEBHOOK_SECRET` matches GitHub configuration
   - Check payload encoding and signature format

2. **Worker Deployment Issues**
   - Ensure `wrangler.toml` configuration is correct
   - Verify Cloudflare account permissions
   - Check Python dependencies in `pyproject.toml`

3. **Backend Connection Failures**
   - Verify `CODEGENAPP_BASE_URL` is accessible from Cloudflare
   - Check network connectivity and firewall rules
   - Validate API endpoint availability

4. **Validation Workflow Failures**
   - Check Grainchain service availability
   - Verify Graph-Sitter configuration
   - Test Web-Eval-Agent connectivity

## Performance Optimization

### Cloudflare Worker Optimization

- Use edge caching for static responses
- Implement request batching for multiple events
- Optimize payload processing and validation
- Monitor worker execution time and memory usage

### Backend Optimization

- Use background tasks for long-running validations
- Implement async processing for webhook events
- Cache frequently accessed project configurations
- Monitor API response times and throughput

## Future Enhancements

### Planned Features

1. **Advanced Event Filtering**
   - Custom rules for webhook event processing
   - Project-specific event configurations
   - Conditional validation triggering

2. **Multi-Repository Management**
   - Bulk webhook configuration
   - Organization-level webhook settings
   - Repository group management

3. **Analytics and Reporting**
   - Webhook delivery metrics
   - Validation success rates
   - Performance analytics dashboard

4. **Integration Expansions**
   - Slack notifications
   - Email alerts
   - Custom webhook destinations
   - Third-party CI/CD integrations

### Contributing

To contribute to the webhook system:

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Update documentation
5. Submit a pull request

### Support

For webhook-related issues:

- Check the troubleshooting section above
- Review Cloudflare Worker logs
- Examine backend webhook event logs
- Test webhook delivery manually
- Contact support with correlation IDs for specific events
