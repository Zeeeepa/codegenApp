# CodegenApp - AI-Powered CI/CD Flow Management System

A comprehensive CI/CD orchestration platform that integrates AI agents with automated validation pipelines for seamless development workflows.

## 🏗️ **NEW MODULAR ARCHITECTURE**

This project has been completely restructured into a clean, modular architecture with proper separation of concerns:

```
codegenapp/
├── frontend/           # React TypeScript Dashboard
├── backend/           # FastAPI Python Backend  
├── shared/            # Shared TypeScript types & utilities
├── cloudflare-worker/ # Webhook gateway worker
├── docs/              # Documentation
└── tests/             # Test suites
```

## 🚀 Overview

CodegenApp is a sophisticated CI/CD management system that combines the power of AI agents (via Codegen API) with automated validation pipelines to create a seamless development experience. The system provides real-time dashboard monitoring, automated testing, and intelligent deployment workflows.

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph "Frontend Dashboard"
        A[React Dashboard] --> B[Project Dropdown]
        A --> C[Project Cards]
        A --> D[Real-time Updates]
        D --> E[WebSocket Connection]
    end
    
    subgraph "Backend Orchestration"
        F[FastAPI Backend] --> G[Workflow Engine]
        G --> H[State Manager]
        G --> I[Agent Run Controller]
        H --> J[Redis Cache]
    end
    
    subgraph "AI Integration"
        K[Codegen API] --> L[Agent Execution]
        L --> M[Response Processing]
        M --> N[Plan/PR/Regular]
    end
    
    subgraph "Validation Pipeline"
        O[Pipeline Coordinator] --> P[Snapshot Manager]
        P --> Q[Docker/K8s Environment]
        O --> R[Deployment Orchestrator]
        R --> S[Health Checks]
        O --> T[Web Evaluation]
        T --> U[Browser Testing]
    end
    
    subgraph "GitHub Integration"
        V[Webhook Gateway] --> W[PR Management]
        W --> X[Auto-merge Logic]
        X --> Y[Status Updates]
    end
    
    A --> F
    F --> K
    G --> O
    O --> V
    E --> F
```

## 🎯 Key Features

### 1. **AI-Powered Agent Runs**
- **Intelligent Code Generation**: Integration with Codegen API for sophisticated code generation and problem-solving
- **Interactive Workflows**: Support for plan confirmation/modification and continuation flows
- **Real-time Progress**: Live updates on agent execution with detailed progress tracking
- **Error Recovery**: Automatic retry mechanisms with intelligent error handling

### 2. **Comprehensive Validation Pipeline**
- **Isolated Environments**: Docker/Kubernetes snapshots for secure validation
- **Automated Deployment**: Configurable build and deployment commands
- **Health Monitoring**: Comprehensive health checks and performance validation
- **Browser Testing**: AI-powered web evaluation using web-eval-agent integration
- **Resource Management**: Automatic cleanup and resource optimization

### 3. **Real-time Dashboard**
- **Project Management**: Intuitive project selection and configuration
- **Live Monitoring**: WebSocket-powered real-time updates
- **Progress Tracking**: Visual progress indicators for all operations
- **Activity Feed**: Comprehensive activity logging and monitoring

### 4. **GitHub Integration**
- **Webhook Processing**: Automatic PR detection and processing
- **Status Updates**: Real-time GitHub status updates
- **Auto-merge**: Intelligent auto-merge based on validation results
- **PR Management**: Complete PR lifecycle management

## 🔧 Technology Stack

### Frontend (`/frontend`)
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **WebSocket** for real-time communication
- **Context API** for state management
- **Lucide React** for icons

### Backend (`/backend`)
- **FastAPI** (Python) for API endpoints
- **SQLAlchemy** with PostgreSQL for data persistence
- **Redis** for state management and caching
- **WebSocket** for real-time communication
- **Asyncio** for concurrent operations

### External Services Integration
- **Codegen SDK** - Agent coordination & code generation
- **Graph-Sitter** - Static analysis & code quality metrics
- **Grainchain** - Sandboxing + snapshot creation + PR validation deployments
- **Web-Eval-Agent** - UI testing & browser automation

### Infrastructure
- **Node.js** runtime environment
- **GitHub API** for repository integration
- **Cloudflare Workers** for webhook gateway
- **Web-Eval-Agent** for automated component testing

## 📋 Workflow Process

### 1. **Project Setup**
```
1. User selects project from dropdown
2. Project configuration loaded (webhook URL, deployment settings)
3. Real-time WebSocket connection established
4. Dashboard displays project status and controls
```

### 2. **Agent Run Execution**
```
1. User enters target/goal text
2. Agent run initiated via Codegen API
3. Real-time progress updates via WebSocket
4. Response processing (Regular/Plan/PR types)
5. User interaction for plan confirmation or continuation
```

### 3. **Validation Pipeline (PR Created)**
```
1. PR creation detected via webhook or agent response
2. Validation pipeline triggered automatically
3. Snapshot environment created (Docker/K8s)
4. Codebase cloned into isolated environment
5. Deployment commands executed
6. Health checks performed
7. Web evaluation testing conducted
8. Results processed and reported
9. Auto-merge decision based on validation results
10. Resource cleanup
```

### 4. **Error Handling & Recovery**
```
1. Validation failures trigger error context collection
2. Error details sent to Codegen API for resolution
3. Updated PR created with fixes
4. Re-validation triggered automatically
5. Process repeats until success or max retries reached
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- PostgreSQL 13+
- Redis 6+
- Docker (for validation environments)

### Environment Configuration
```bash
# Backend Environment Variables
DATABASE_URL=postgresql://user:pass@localhost/codegenapp
REDIS_URL=redis://localhost:6379
CODEGEN_API_URL=https://api.codegen.com
CODEGEN_API_KEY=your_api_key
CODEGEN_ORG_ID=your_org_id
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Frontend Environment Variables
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000/ws
```

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Zeeeepa/codegenApp.git
cd codegenApp
```

2. **Environment Setup**
```bash
# Copy environment configuration
cp .env.example .env
# Edit .env with your actual API keys and configuration
```

3. **Setup Dependencies**
```bash
npm run setup
```

4. **Development Mode**
```bash
npm run dev
```

5. **Production Build & Start**
```bash
npm run build
npm start
```

6. **Complete Deployment Test**
```bash
# Set required environment variables
export GEMINI_API_KEY=AIzaSyBXmhlHudrD4zXiv-5fjxi1gGG-_kdtaZ0
export CODEGEN_API_TOKEN=sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99
export GITHUB_TOKEN=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

# Run full deployment test with web-eval-agent
npm run deploy:test
```

## 📊 API Documentation

### Project Management
- `GET /api/v1/projects` - List all projects
- `POST /api/v1/projects` - Create new project
- `GET /api/v1/projects/{id}` - Get project details
- `PUT /api/v1/projects/{id}` - Update project
- `DELETE /api/v1/projects/{id}` - Delete project

### Agent Runs
- `POST /api/v1/agent-runs` - Start new agent run
- `GET /api/v1/agent-runs` - List agent runs
- `GET /api/v1/agent-runs/{id}` - Get agent run details
- `POST /api/v1/agent-runs/{id}/continue` - Continue agent run
- `POST /api/v1/agent-runs/{id}/plan-response` - Handle plan response

### Validation Pipelines
- `GET /api/v1/validations` - List validation pipelines
- `GET /api/v1/validations/{id}` - Get validation details
- `POST /api/v1/validations/{id}/retry` - Retry validation

### WebSocket Events
- `agent_run_started` - Agent run initiated
- `agent_run_progress` - Progress updates
- `agent_run_completed` - Agent run finished
- `validation_started` - Validation pipeline started
- `validation_progress` - Validation progress updates
- `validation_completed` - Validation finished

## 🔧 Configuration

### Project Settings
```json
{
  "deployment_settings": {
    "build_command": "npm run build",
    "deploy_command": "npm run deploy",
    "health_check_url": "/health",
    "environment_variables": {}
  },
  "validation_settings": {
    "auto_merge": true,
    "required_checks": ["build", "test", "security"],
    "timeout_minutes": 30,
    "max_retries": 3
  },
  "notification_settings": {
    "slack_webhook": "",
    "email_notifications": true,
    "github_status_updates": true
  }
}
```

### Validation Pipeline Steps
1. **Snapshot Creation** - Isolated Docker/K8s environment
2. **Codebase Clone** - Git clone of PR branch
3. **Deployment** - Execute build and deploy commands
4. **Health Check** - Verify deployment success
5. **Web Evaluation** - Comprehensive browser testing
6. **Cleanup** - Resource cleanup and reporting

## 🔍 Monitoring & Logging

### Audit Logging
- All system actions are logged with full context
- User actions tracked with timestamps and metadata
- Error tracking with stack traces and recovery attempts
- Performance metrics and resource usage monitoring

### Real-time Monitoring
- WebSocket connections for live updates
- Progress tracking for all operations
- Resource usage monitoring
- Health check status reporting

## 🛡️ Security

### Authentication & Authorization
- API key-based authentication for Codegen integration
- GitHub App authentication for repository access
- Webhook signature verification
- Role-based access control (planned)

### Environment Isolation
- Docker/Kubernetes sandboxing for validation
- Network isolation for security
- Resource limits and quotas
- Automatic cleanup of sensitive data

## 🚀 Deployment

### Production Deployment
```bash
# Docker Compose
docker-compose up -d

# Kubernetes
kubectl apply -f k8s/
```

### Environment Variables
```bash
# Production settings
NODE_ENV=production
DATABASE_URL=postgresql://prod_user:pass@db:5432/codegenapp
REDIS_URL=redis://redis:6379
CODEGEN_API_URL=https://api.codegen.com
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation wiki

## 🗺️ Roadmap

### Phase 1 (Current)
- ✅ Basic project management
- ✅ Agent run orchestration
- ✅ Validation pipeline foundation
- ✅ Real-time dashboard updates

### Phase 2 (In Progress)
- 🔄 Complete validation pipeline implementation
- 🔄 GitHub integration and webhooks
- 🔄 Auto-merge functionality
- 🔄 Enhanced error handling

### Phase 3 (Planned)
- 📋 Advanced monitoring and analytics
- 📋 Multi-environment support
- 📋 Role-based access control
- 📋 Plugin system for extensibility

---

**CodegenApp** - Empowering developers with AI-driven CI/CD workflows 🚀
