# CodegenApp Backend

A comprehensive CI/CD dashboard backend system that integrates with the Codegen API to provide automated pull request validation, deployment, and testing workflows.

## Features

- 🚀 **Automated CI/CD Pipeline**: Full validation workflow from PR creation to deployment
- 🔗 **Codegen API Integration**: Seamless integration with Codegen's agent system
- 🪝 **GitHub Webhooks**: Real-time PR event processing
- 🗄️ **Database Management**: SQLite (dev) and PostgreSQL (prod) support
- 🧪 **Automated Testing**: Configurable test execution and reporting
- 🌐 **Deployment Validation**: AI-powered deployment verification
- 📊 **Real-time Monitoring**: Progress tracking and status updates

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitHub PR     │───▶│  Webhook        │───▶│  Validation     │
│   Events        │    │  Processor      │    │  Pipeline       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Database      │◀───│  Project        │───▶│  Codegen API    │
│   Storage       │    │  Management     │    │  Integration    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git
- Docker (optional, for containerized deployments)

### Installation

1. **Clone and setup**:
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the server**:
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

4. **Verify installation**:
   ```bash
   curl http://localhost:3002/health
   ```

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `CODEGEN_API_KEY` | Codegen API authentication key | ✅ | - |
| `CODEGEN_ORG_ID` | Your Codegen organization ID | ✅ | - |
| `CODEGEN_API_BASE_URL` | Codegen API base URL | ✅ | `https://api.codegen.com` |
| `DATABASE_URL` | PostgreSQL connection string | ❌ | SQLite (dev) |
| `PORT` | Server port | ❌ | `3002` |
| `GITHUB_TOKEN` | GitHub API token | ✅ | - |
| `GEMINI_API_KEY` | Google Gemini API key | ❌ | - |
| `WEBHOOK_SECRET` | GitHub webhook secret | ✅ | - |

### Project Settings

Each project can be configured with custom settings:

```javascript
{
  "setup_commands": "npm install\nnpm run build",
  "deploy_commands": "npm run deploy\necho $DEPLOY_URL",
  "test_commands": "npm test\nnpm run e2e",
  "repository_rules": "All PRs must pass tests\nCode coverage > 80%",
  "auto_merge_enabled": true,
  "auto_confirm_plan": false
}
```

## API Reference

### Projects API

#### List Projects
```http
GET /api/projects
```

#### Create Project
```http
POST /api/projects
Content-Type: application/json

{
  "id": "my-project",
  "name": "My Project",
  "fullName": "org/my-project",
  "description": "Project description",
  "repositoryUrl": "https://github.com/org/my-project",
  "defaultBranch": "main",
  "autoMergeEnabled": true,
  "autoConfirmPlan": false
}
```

#### Get Project
```http
GET /api/projects/:id
```

#### Update Project
```http
PUT /api/projects/:id
Content-Type: application/json

{
  "name": "Updated Project Name",
  "description": "Updated description"
}
```

#### Delete Project
```http
DELETE /api/projects/:id
```

### Project Settings API

#### Get Project Settings
```http
GET /api/projects/:id/settings
```

#### Update Project Setting
```http
PUT /api/projects/:id/settings/:key
Content-Type: application/json

{
  "value": "setting value"
}
```

### Webhooks API

#### Handle GitHub Webhook
```http
POST /webhooks/:webhookId
X-Hub-Signature-256: sha256=...
Content-Type: application/json

{
  "action": "opened",
  "pull_request": { ... },
  "repository": { ... }
}
```

#### Webhook Health Check
```http
GET /webhooks/health
```

#### List Webhook Events
```http
GET /webhooks/events/:projectId
```

#### Replay Webhook Event
```http
POST /webhooks/replay/:eventId
```

## Validation Pipeline

The validation pipeline consists of several stages:

### 1. Repository Clone
- Clones the PR branch
- Sets up working directory
- Validates repository access

### 2. Environment Setup
- Executes project setup commands
- Installs dependencies
- Prepares build environment

### 3. Deployment
- Runs deployment commands
- Starts application server
- Generates deployment URL

### 4. Validation
- Health checks on deployment
- AI-powered validation with Gemini
- Accessibility and performance checks

### 5. Testing
- Executes test suites
- Parses test results
- Generates test reports

### 6. Reporting
- Compiles validation results
- Updates PR status
- Triggers Codegen API for fixes if needed

## Database Schema

### Projects Table
```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  full_name TEXT,
  description TEXT,
  repository_url TEXT,
  webhook_url TEXT,
  default_branch TEXT DEFAULT 'main',
  auto_merge_enabled BOOLEAN DEFAULT false,
  auto_confirm_plan BOOLEAN DEFAULT false,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Validation Pipelines Table
```sql
CREATE TABLE validation_pipelines (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  agent_run_id TEXT,
  pull_request_id INTEGER,
  pull_request_url TEXT,
  status TEXT DEFAULT 'pending',
  progress_percentage INTEGER DEFAULT 0,
  current_step TEXT,
  deployment_url TEXT,
  validation_results TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (project_id) REFERENCES projects (id)
);
```

### Agent Runs Table
```sql
CREATE TABLE agent_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  response_type TEXT DEFAULT 'regular',
  prompt TEXT,
  response TEXT,
  context TEXT,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (project_id) REFERENCES projects (id)
);
```

## Codegen API Integration

### Creating Agent Runs

```javascript
const response = await fetch(`https://api.codegen.com/v1/organizations/${orgId}/agent/run`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'Fix the failing tests in this PR',
    context: {
      project_id: 'my-project',
      pull_request_number: 123
    }
  })
});
```

### Resuming Agent Runs

```javascript
const response = await fetch(`https://api.codegen.com/v1/organizations/${orgId}/agent/run/${runId}/resume`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'Please continue with the implementation'
  })
});
```

## Development

### Project Structure

```
backend/
├── database/           # Database connection and schema
│   ├── connection.js   # Database connection manager
│   └── schema.sql      # Database schema
├── models/             # Data models
│   ├── Project.js      # Project model
│   ├── AgentRun.js     # Agent run model
│   └── ValidationPipeline.js # Validation pipeline model
├── routes/             # API routes
│   ├── projects.js     # Project management routes
│   └── webhooks.js     # Webhook handling routes
├── services/           # Business logic services
│   ├── WebhookProcessor.js # Webhook event processing
│   └── ValidationService.js # Validation pipeline logic
├── server.js           # Main server file
├── package.json        # Dependencies and scripts
└── README.md          # This file
```

### Running Tests

```bash
npm test
```

### Code Style

This project uses ESLint and Prettier for code formatting:

```bash
npm run lint
npm run format
```

### Database Migrations

For production deployments with PostgreSQL:

```bash
# Run migrations
npm run migrate

# Rollback migrations
npm run migrate:rollback
```

## Deployment

### Docker Deployment

1. **Build the image**:
   ```bash
   docker build -t codegenapp-backend .
   ```

2. **Run the container**:
   ```bash
   docker run -p 3002:3002 \
     -e CODEGEN_API_KEY=your_key \
     -e CODEGEN_ORG_ID=your_org_id \
     codegenapp-backend
   ```

### Production Deployment

1. **Set up PostgreSQL database**
2. **Configure environment variables**
3. **Run database migrations**
4. **Start the server with PM2**:
   ```bash
   pm2 start server.js --name codegenapp-backend
   ```

## Monitoring

### Health Checks

The server provides several health check endpoints:

- `GET /health` - Basic server health
- `GET /webhooks/health` - Webhook system health
- `GET /api/projects/stats` - Project statistics

### Logging

Logs are structured and include:

- Request/response logging
- Database operation logs
- Validation pipeline progress
- Error tracking and reporting

### Metrics

Key metrics tracked:

- Validation pipeline success rate
- Average validation time
- API response times
- Database query performance

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Check DATABASE_URL configuration
   - Ensure database server is running
   - Verify connection credentials

2. **Webhook Delivery Failures**:
   - Verify webhook URL is accessible
   - Check webhook secret configuration
   - Review GitHub webhook delivery logs

3. **Validation Pipeline Failures**:
   - Check project setup commands
   - Verify deployment configuration
   - Review validation service logs

4. **Codegen API Integration Issues**:
   - Verify API key and organization ID
   - Check API rate limits
   - Review request/response logs

### Debug Mode

Enable debug logging:

```bash
DEBUG=true npm start
```

### Log Analysis

View real-time logs:

```bash
tail -f logs/codegenapp.log
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:

- 📧 Email: support@codegenapp.com
- 💬 Discord: [CodegenApp Community](https://discord.gg/codegenapp)
- 📖 Documentation: [docs.codegenapp.com](https://docs.codegenapp.com)
- 🐛 Issues: [GitHub Issues](https://github.com/org/codegenapp/issues)
