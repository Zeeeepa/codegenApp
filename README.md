# CodegenApp - AI-Powered CI/CD Flow Management System

A comprehensive, enterprise-grade CI/CD orchestration platform that combines AI-powered development agents with automated testing, validation, and deployment workflows. This system provides a unified dashboard for managing complex software development lifecycles with intelligent automation and validation.

## 🚀 System Overview

CodegenApp is a sophisticated CI/CD flow management system that orchestrates AI agents, automated testing, and deployment workflows through an intuitive dashboard interface. It bridges the gap between AI-powered development and production-ready deployments with comprehensive validation and quality assurance.

### 🎯 Core Features

- **🎛️ Project Dashboard**: Centralized management of multiple projects with real-time status tracking
- **🤖 AI Agent Integration**: Seamless integration with Codegen API for intelligent code generation and problem-solving
- **🔄 Webhook Automation**: Cloudflare-powered webhook system for automated PR notifications and triggers
- **✅ Validation Pipeline**: Comprehensive testing flow with snapshot creation and automated validation
- **🚀 Auto-Deployment**: Intelligent deployment orchestration with rollback capabilities
- **🔀 Auto-Merge**: Automated PR merging after successful validation and testing
- **📊 Real-time Monitoring**: Live progress tracking and detailed logging for all operations

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           CODEGENAPP CI/CD PLATFORM                               │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────────────────┐ │
│  │   Dashboard UI  │    │   Webhook Gateway│    │    Orchestration Engine         │ │
│  │   (React/TS)    │◄──►│   (Cloudflare)   │◄──►│    (FastAPI/Python)             │ │
│  │                 │    │                  │    │                                 │ │
│  │ • Project Cards │    │ • PR Events      │    │ • Workflow Management           │ │
│  │ • Run Controls  │    │ • Auto Triggers  │    │ • State Orchestration           │ │
│  │ • Progress View │    │ • Event Routing  │    │ • Service Coordination          │ │
│  │ • Validation UI │    │ • Security Layer │    │ • Error Handling                │ │
│  └─────────────────┘    └──────────────────┘    └─────────────────────────────────┘ │
│                                │                                │                   │
│                                ▼                                ▼                   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                              VALIDATION PIPELINE                                   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Snapshot Mgmt  │  │  Code Analysis  │  │  Deployment     │  │  Web Evaluation │ │
│  │  (Docker/K8s)   │  │  (Graph-Sitter) │  │  (Auto Deploy) │  │  (Web-Eval-Agent)│ │
│  │                 │  │                 │  │                 │  │                 │ │
│  │ • Environment   │  │ • AST Analysis  │  │ • Build Process │  │ • Browser Tests │ │
│  │ • Isolation     │  │ • Dependency    │  │ • Health Checks │  │ • Flow Testing  │ │
│  │ • Resource Mgmt │  │ • Code Quality  │  │ • Rollback      │  │ • Component Val │ │
│  │ • Cleanup       │  │ • Security Scan │  │ • Monitoring    │  │ • Performance   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                              AI AGENT INTEGRATION                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Codegen API    │  │  Response Types │  │  Continuation   │  │  Error Recovery │ │
│  │  (AI Agents)    │  │  (Reg/Plan/PR)  │  │  (Resume Flow)  │  │  (Auto Retry)   │ │
│  │                 │  │                 │  │                 │  │                 │ │
│  │ • Agent Runs    │  │ • Regular Resp  │  │ • Context Mgmt  │  │ • Error Context │ │
│  │ • Multi-Org     │  │ • Plan Confirm  │  │ • Session State │  │ • Retry Logic   │ │
│  │ • Context Mgmt  │  │ • PR Creation   │  │ • User Input    │  │ • Failure Logs  │ │
│  │ • Progress Log  │  │ • Auto Actions  │  │ • Flow Resume   │  │ • Recovery Flow │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 🔄 CI/CD Workflow Process

### 1. Project Management Flow

```mermaid
graph TD
    A[Dashboard Load] --> B[Project Dropdown]
    B --> C[Select Project]
    C --> D[Project Card Display]
    D --> E[Webhook URL Config]
    E --> F[PR Notification Setup]
    F --> G[Ready for Operations]
```

### 2. Agent Run Workflow

```mermaid
graph TD
    A[Click Run Button] --> B[Target Text Input]
    B --> C[Confirm & Send Request]
    C --> D[Codegen API Call]
    D --> E[Progress Tracking]
    E --> F{Response Type?}
    F -->|Regular| G[Continue Button]
    F -->|Plan| H[Confirm/Modify Options]
    F -->|PR| I[PR Notification]
    G --> J[Resume Endpoint]
    H --> K{User Choice?}
    K -->|Confirm| L[Proceed with Plan]
    K -->|Modify| M[Text Input + Confirm]
    I --> N[Validation Flow Trigger]
```

### 3. Validation Pipeline

```mermaid
graph TD
    A[PR Created] --> B[Webhook Trigger]
    B --> C[Create Snapshot Instance]
    C --> D[Deploy Graph-Sitter + Web-Eval-Agent]
    D --> E[Clone PR Codebase]
    E --> F[Run Deployment Commands]
    F --> G{Deployment Success?}
    G -->|No| H[Send Error Context to Agent]
    G -->|Yes| I[Run Web-Eval-Agent Tests]
    H --> J[Auto-Continue with Error Context]
    I --> K{Tests Pass?}
    K -->|No| L[Send Test Errors to Agent]
    K -->|Yes| M[Validation Complete]
    L --> N[Update PR with Fixes]
    N --> O[Re-trigger Deployment]
    M --> P[Merge Notification]
    P --> Q{Auto-Merge Enabled?}
    Q -->|Yes| R[Auto-Merge to Main]
    Q -->|No| S[Manual Merge Option]
```

## 🛠️ Technology Stack

### Frontend Dashboard
- **Framework**: React 18 with TypeScript
- **UI Library**: Tailwind CSS + Lucide Icons
- **State Management**: React Context + Custom Hooks
- **Real-time Updates**: WebSocket integration
- **Testing**: Jest + React Testing Library

### Backend Orchestration
- **Framework**: FastAPI (Python 3.11+)
- **Architecture**: Event-driven microservices
- **Database**: PostgreSQL with async ORM
- **Queue System**: Redis for job processing
- **WebSocket**: Real-time dashboard updates

### Webhook Infrastructure
- **Platform**: Cloudflare Workers
- **Security**: JWT token validation
- **Event Processing**: Async event handling
- **Rate Limiting**: Built-in DDoS protection
- **Monitoring**: Real-time webhook analytics

### Validation Services

#### Snapshot Management
- **Containerization**: Docker + Kubernetes
- **Isolation**: Secure sandbox environments
- **Resource Management**: Auto-scaling and cleanup
- **Networking**: Private container networks

#### Code Analysis
- **Parser**: Graph-Sitter multi-language support
- **Analysis**: AST parsing and dependency graphs
- **Quality Gates**: Automated code quality checks
- **Security**: Vulnerability scanning

#### Web Evaluation
- **Testing Framework**: Web-Eval-Agent with Playwright
- **AI Evaluation**: Gemini API integration
- **Browser Automation**: Headless Chrome testing
- **Reporting**: Comprehensive test reports

## 📋 Project Configuration

### Project Card Structure
Each project in the dashboard contains:

```json
{
  "id": "project-uuid",
  "name": "Project Name",
  "description": "Project description",
  "webhook_url": "https://webhook.domain.com/project-webhook",
  "github_repo": "owner/repository",
  "deployment_settings": {
    "build_command": "npm run build",
    "deploy_command": "npm run deploy",
    "health_check_url": "https://app.domain.com/health",
    "environment_variables": {
      "NODE_ENV": "production"
    }
  },
  "validation_settings": {
    "auto_merge": true,
    "required_checks": ["build", "test", "security"],
    "timeout_minutes": 30
  },
  "status": "active",
  "last_run": "2024-07-16T10:30:00Z"
}
```

### Webhook Configuration
Cloudflare webhook endpoint configuration:

```javascript
// webhook-gateway.js (Cloudflare Worker)
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const projectId = url.pathname.split('/')[2];
    
    if (request.method === 'POST') {
      const payload = await request.json();
      
      // Validate webhook signature
      const isValid = await validateWebhookSignature(
        payload, 
        request.headers.get('X-Hub-Signature-256')
      );
      
      if (isValid && payload.action === 'opened') {
        // Trigger validation pipeline
        await triggerValidationPipeline(projectId, payload.pull_request);
      }
      
      return new Response('OK', { status: 200 });
    }
    
    return new Response('Method not allowed', { status: 405 });
  }
};
```

## 🚀 Quick Start Guide

### 1. Environment Setup

```bash
# Clone the repository
git clone https://github.com/Zeeeepa/codegenApp.git
cd codegenApp

# Install dependencies
npm install
cd server && npm install && cd ..
pip install -r deploy-requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your configuration
```

### 2. Required Environment Variables

```bash
# Codegen API Configuration
CODEGEN_API_KEY=your_codegen_api_key_here
CODEGEN_API_URL=https://api.codegen.com
CODEGEN_ORG_ID=your_organization_id_here
CODEGEN_USER_ID=your_user_id_here

# Cloudflare Webhook Configuration
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id_here
CLOUDFLARE_WORKER_NAME=webhook-gateway
CLOUDFLARE_WORKER_URL=https://webhook-gateway.yourdomain.workers.dev
CLOUDFLARE_API_KEY=your_cloudflare_api_key_here

# GitHub Integration
GITHUB_TOKEN=your_github_token_here
GITHUB_APP_ID=your_github_app_id_here
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here

# Web-Eval-Agent Configuration
GEMINI_API_KEY=your_gemini_api_key_here
WEB_EVAL_TIMEOUT=300000
WEB_EVAL_MAX_CONCURRENT=3

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost/codegenapp
REDIS_URL=redis://localhost:6379

# Deployment Configuration
DOCKER_REGISTRY=your_registry_url
KUBERNETES_NAMESPACE=codegenapp
```

### 3. Start the Development Environment

```bash
# Start all services
npm run dev:all

# Or start individually:
npm run backend:dev     # Backend API (port 8000)
npm run server:dev      # Proxy server (port 3001)  
npm start              # Frontend dashboard (port 8000)
```

### 4. Access the Application

- **Dashboard**: `http://localhost:8000`
- **API Documentation**: `http://localhost:8000/docs`
- **Webhook Endpoint**: `https://webhook-gateway.yourdomain.workers.dev`

## 📊 Dashboard Usage Guide

### Project Management

1. **Select Project**: Use the dropdown to select your active project
2. **Project Card**: View project status, last run, and configuration
3. **Run Button**: Click to start a new agent run with target text/goal
4. **Progress Tracking**: Monitor real-time progress and logs
5. **Response Handling**: Interact with different response types (Regular/Plan/PR)

### Response Types

#### Regular Response
- **Continue Button**: Add additional context and resume the agent run
- **Session Management**: Maintains conversation context across interactions
- **Error Handling**: Automatic retry with error context

#### Plan Response  
- **Confirm Button**: Proceed with the proposed plan (default: "Proceed")
- **Modify Button**: Open text input to modify the plan before execution
- **Plan Validation**: Review and approve changes before implementation

#### PR Response
- **GitHub Integration**: Automatic PR creation and linking
- **Validation Trigger**: Initiates comprehensive testing pipeline
- **Status Tracking**: Real-time validation progress and results
- **Auto-Merge**: Optional automatic merging after successful validation

### Validation Flow

1. **Snapshot Creation**: Isolated environment with required dependencies
2. **Codebase Cloning**: Fresh clone of PR branch for testing
3. **Deployment Execution**: Run configured deployment commands
4. **Health Validation**: Verify deployment success with AI analysis
5. **Web Testing**: Comprehensive browser-based testing with web-eval-agent
6. **Error Recovery**: Automatic retry with error context if issues found
7. **Merge Decision**: Auto-merge or manual approval based on settings

## 🔧 API Reference

### Project Management Endpoints

```http
GET    /api/v1/projects                    # List all projects
POST   /api/v1/projects                    # Create new project
GET    /api/v1/projects/{id}               # Get project details
PUT    /api/v1/projects/{id}               # Update project settings
DELETE /api/v1/projects/{id}               # Delete project
```

### Agent Run Endpoints

```http
POST   /api/v1/projects/{id}/runs          # Start new agent run
GET    /api/v1/projects/{id}/runs          # List project runs
GET    /api/v1/runs/{id}                   # Get run details
POST   /api/v1/runs/{id}/continue          # Continue existing run
POST   /api/v1/runs/{id}/cancel            # Cancel running agent
```

### Validation Pipeline Endpoints

```http
POST   /api/v1/validation/trigger          # Trigger validation pipeline
GET    /api/v1/validation/{id}/status      # Get validation status
GET    /api/v1/validation/{id}/logs        # Get validation logs
POST   /api/v1/validation/{id}/retry       # Retry failed validation
```

### Webhook Endpoints

```http
POST   /webhook/{project_id}               # GitHub webhook receiver
GET    /webhook/{project_id}/status        # Webhook status check
POST   /webhook/{project_id}/test          # Test webhook configuration
```

## 🧪 Testing Strategy

### Frontend Testing
```bash
# Component tests
npm test

# Integration tests  
npm run test:integration

# E2E dashboard tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Backend Testing
```bash
# API tests
cd backend && pytest tests/api/

# Integration tests
pytest tests/integration/

# Validation pipeline tests
pytest tests/validation/

# Coverage report
pytest --cov=app tests/
```

### Validation Testing
```bash
# Web-eval-agent tests
npm run test:web-eval

# Deployment tests
npm run test:deployment

# End-to-end validation
npm run test:validation-e2e
```

## 🚀 Deployment Guide

### Production Deployment

#### Frontend (Netlify/Vercel)
```bash
# Build production bundle
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=build

# Deploy to Vercel
vercel --prod
```

#### Backend (Docker + Kubernetes)
```bash
# Build Docker images
docker build -t codegenapp-backend ./backend
docker build -t codegenapp-frontend .

# Deploy to Kubernetes
kubectl apply -f k8s/

# Scale services
kubectl scale deployment backend --replicas=3
```

#### Cloudflare Worker Deployment
```bash
# Deploy webhook gateway
wrangler deploy webhook-gateway.js

# Configure environment variables
wrangler secret put GITHUB_WEBHOOK_SECRET
wrangler secret put CODEGEN_API_KEY
```

### Environment Configuration

#### Development
- Hot reloading enabled
- Debug logging
- Mock external services
- Local database

#### Staging  
- Production build
- Integration testing
- Real external services
- Staging database

#### Production
- Optimized build
- Error logging only
- Production services
- Production database
- CDN enabled
- Auto-scaling

## 📊 Monitoring & Analytics

### Key Metrics
- **Agent Runs**: Success rate, duration, error types
- **Validation Pipeline**: Pass rate, failure reasons, performance
- **Deployment Success**: Build times, deployment frequency
- **User Engagement**: Dashboard usage, feature adoption

### Alerting Rules
- **High Error Rate**: >5% agent run failures
- **Validation Failures**: >3 consecutive validation failures
- **Deployment Issues**: Failed deployments or health checks
- **Resource Usage**: >80% CPU/memory usage

### Logging Strategy
- **Structured Logging**: JSON format with correlation IDs
- **Log Levels**: DEBUG, INFO, WARN, ERROR, CRITICAL
- **Sensitive Data**: Automatic PII redaction
- **Retention**: 30 days for debug, 1 year for audit logs

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature/description`
3. Make changes with tests
4. Run validation: `npm run validate`
5. Submit pull request
6. Automated validation pipeline runs
7. Code review and merge

### Code Standards
- **TypeScript**: Strict mode, no `any` types
- **Python**: Type hints, PEP 8 compliance
- **Testing**: Minimum 80% coverage
- **Documentation**: Comprehensive API docs

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- **API Docs**: `http://localhost:8000/docs`
- **Architecture Guide**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Deployment Guide**: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

### Support Channels
- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Community support and questions
- **Documentation**: Comprehensive guides and examples

### Troubleshooting
- **Common Issues**: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- **Logs**: Check application and service logs
- **Health Checks**: Verify service status endpoints
- **Configuration**: Validate environment variables

---

**🚀 Built for modern CI/CD workflows with AI-powered intelligence**

[🔗 Live Demo](https://codegenapp.netlify.app) • [📖 Documentation](https://docs.codegenapp.com) • [🐛 Report Issues](https://github.com/Zeeeepa/codegenApp/issues)
