# Cloudflare Workers Webhook Gateway

This directory contains the Cloudflare Workers implementation for handling GitHub webhook events and triggering grainchain validation flows in the CodegenApp platform.

## 🚀 Overview

The Cloudflare Workers webhook gateway provides:

- **Edge-based webhook handling** for GitHub PR events
- **Global deployment** with low-latency response times
- **Automatic scaling** to handle webhook traffic spikes
- **Secure webhook verification** with GitHub signature validation
- **Grainchain integration** for triggering validation workflows
- **Status tracking** and webhook response management

## 📁 Project Structure

```
cloudflare/
├── src/
│   └── worker.py          # FastAPI webhook handler
├── pyproject.toml         # Python dependencies
├── wrangler.toml          # Cloudflare Workers configuration
├── build.sh               # Build and deployment script
└── README.md              # This file
```

## 🛠️ Prerequisites

Before deploying the webhook gateway, ensure you have:

1. **Cloudflare Account** with Workers enabled
2. **uv** - Python package manager ([install guide](https://docs.astral.sh/uv/getting-started/installation/))
3. **wrangler** - Cloudflare CLI ([install guide](https://developers.cloudflare.com/workers/wrangler/install-and-update/))
4. **GitHub webhook secret** for payload verification
5. **Grainchain API endpoint** for validation triggers

## 🔧 Installation & Setup

### 1. Install Dependencies

```bash
# Install uv (if not already installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install wrangler (if not already installed)
npm install -g wrangler

# Authenticate with Cloudflare
wrangler auth login
```

### 2. Configure Environment Variables

Set up your environment variables in the main project's `.env` file:

```bash
# Cloudflare Workers Configuration
CLOUDFLARE_API_KEY=your_cloudflare_api_key_here
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id_here
CLOUDFLARE_WORKER_NAME=webhook-gateway
CLOUDFLARE_WORKER_URL=https://webhook-gateway.your-subdomain.workers.dev

# Grainchain Integration
GRAINCHAIN_API_URL=http://localhost:8080
GRAINCHAIN_TIMEOUT=60000
GRAINCHAIN_MAX_MEMORY=512MB

# Webhook Security
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret_here
WEBHOOK_DEBUG_MODE=false
```

### 3. Set Cloudflare Secrets

Configure sensitive values as Cloudflare Worker secrets:

```bash
cd cloudflare

# Set GitHub webhook secret
wrangler secret put GITHUB_WEBHOOK_SECRET

# Set Grainchain API URL
wrangler secret put GRAINCHAIN_API_URL

# Optional: Set additional secrets
wrangler secret put CLOUDFLARE_API_KEY
```

### 4. Build and Deploy

```bash
cd cloudflare

# Make build script executable
chmod +x build.sh

# Build the worker
./build.sh

# Deploy to Cloudflare Workers
wrangler deploy
```

## 🌐 Deployment

### Production Deployment

1. **Build the worker**:
   ```bash
   ./build.sh
   ```

2. **Deploy to production**:
   ```bash
   wrangler deploy --env production
   ```

3. **Verify deployment**:
   ```bash
   curl https://webhook-gateway.your-subdomain.workers.dev/health
   ```

### Development Deployment

For development and testing:

```bash
# Deploy to development environment
wrangler deploy --env development

# Run locally for testing
wrangler dev
```

## 🔗 GitHub Webhook Configuration

After deploying your worker, configure GitHub webhooks:

### 1. Repository Webhook Setup

1. Go to your GitHub repository settings
2. Navigate to **Settings** → **Webhooks** → **Add webhook**
3. Set the payload URL to: `https://webhook-gateway.your-subdomain.workers.dev/webhook/github`
4. Set content type to: `application/json`
5. Set the secret to your `GITHUB_WEBHOOK_SECRET`
6. Select events: **Pull requests** and **Push**
7. Ensure the webhook is **Active**

### 2. Organization Webhook Setup (Optional)

For organization-wide webhook handling:

1. Go to your GitHub organization settings
2. Navigate to **Settings** → **Webhooks** → **Add webhook**
3. Configure the same settings as above
4. This will handle events for all repositories in the organization

## 📊 API Endpoints

The webhook gateway exposes the following endpoints:

### Health Check
```
GET /health
```
Returns the health status of the webhook service.

### GitHub Webhook Handler
```
POST /webhook/github
```
Handles GitHub webhook events (PR events, push events, etc.).

### Status Updates
```
POST /webhook/status
```
Receives status updates from grainchain validation processes.

### Project Status
```
GET /webhook/projects/{project_id}/status
```
Returns webhook status for a specific project.

## 🔒 Security Features

### Webhook Signature Verification
- All GitHub webhooks are verified using HMAC-SHA256 signatures
- Invalid signatures are rejected with 401 Unauthorized
- Protects against unauthorized webhook calls

### Rate Limiting
- Built-in Cloudflare Workers rate limiting
- Protects against webhook spam and abuse
- Configurable limits based on your needs

### Environment Isolation
- Secrets are stored securely in Cloudflare Workers
- No sensitive data in code or configuration files
- Environment-specific deployments (dev/staging/prod)

## 🐛 Troubleshooting

### Common Issues

1. **Webhook not receiving events**:
   - Check GitHub webhook configuration
   - Verify the webhook URL is correct
   - Check webhook delivery logs in GitHub

2. **Signature verification failing**:
   - Ensure `GITHUB_WEBHOOK_SECRET` matches GitHub configuration
   - Check that the secret is properly set in Cloudflare Workers

3. **Grainchain validation not triggering**:
   - Verify `GRAINCHAIN_API_URL` is accessible from Cloudflare Workers
   - Check grainchain service health
   - Review worker logs for connection errors

### Debugging

View worker logs:
```bash
wrangler tail
```

Check deployment status:
```bash
wrangler deployments list
```

Test webhook locally:
```bash
wrangler dev
# Then use ngrok or similar to expose local endpoint to GitHub
```

## 📈 Monitoring & Analytics

### Cloudflare Analytics
- View request metrics in Cloudflare dashboard
- Monitor response times and error rates
- Track webhook event volume

### Custom Logging
- Structured logging for webhook events
- Error tracking and alerting
- Performance monitoring

### Health Monitoring
- Regular health checks via `/health` endpoint
- Integration with monitoring services
- Automated alerting for service issues

## 🔄 Webhook Event Flow

```
GitHub PR Event → Cloudflare Workers → Grainchain Validation → Status Update
     ↓                    ↓                      ↓                    ↓
1. PR opened/sync    2. Webhook handler    3. Validation queue    4. Results posted
2. Signature verify  3. Event processing   4. Sandbox creation    5. GitHub status
3. Event routing     4. Async trigger      5. Test execution      6. Dashboard update
```

## 🚀 Advanced Configuration

### Custom Domain

To use a custom domain for your webhook:

1. Add a custom domain in Cloudflare Workers dashboard
2. Update your GitHub webhook URL
3. Update `CLOUDFLARE_WORKER_URL` in your environment

### Multiple Environments

Configure different environments in `wrangler.toml`:

```toml
[env.development]
name = "webhook-gateway-dev"
vars = { ENVIRONMENT = "development" }

[env.staging]
name = "webhook-gateway-staging"
vars = { ENVIRONMENT = "staging" }

[env.production]
name = "webhook-gateway-prod"
vars = { ENVIRONMENT = "production" }
```

### Performance Optimization

- Enable Cloudflare caching for static responses
- Use Durable Objects for stateful operations
- Implement request batching for high-volume events

## 📚 Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [GitHub Webhooks Guide](https://docs.github.com/en/developers/webhooks-and-events/webhooks)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [uv Documentation](https://docs.astral.sh/uv/)

## 🤝 Contributing

When contributing to the webhook gateway:

1. Test changes locally with `wrangler dev`
2. Ensure all tests pass
3. Update documentation as needed
4. Deploy to staging environment first
5. Monitor logs and metrics after deployment

## 📄 License

This webhook gateway is part of the CodegenApp platform and follows the same licensing terms.

