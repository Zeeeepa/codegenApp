# CodegenApp - AI-Powered Development Platform

A comprehensive, enterprise-grade web application for managing AI-powered software development workflows with integrated code analysis, web evaluation, and automated CI/CD orchestration. This platform provides a unified interface for modern software development teams leveraging AI agents, automated testing, and intelligent code analysis.

## 🚀 Platform Overview

CodegenApp is a full-stack platform that orchestrates multiple AI-powered tools and services to create a seamless development experience. It combines agent-based development, automated testing, code analysis, and deployment workflows into a single, cohesive platform.

### 🎯 Core Value Propositions

- **AI-First Development**: Leverage Codegen AI agents for automated code generation and problem-solving
- **Intelligent Testing**: Automated web evaluation with AI-powered browser testing
- **Code Intelligence**: Deep code analysis and visualization using graph-sitter
- **Workflow Orchestration**: Automated CI/CD pipelines with intelligent decision-making
- **Multi-Service Integration**: Seamless integration with GitHub, deployment platforms, and development tools

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              CODEGENAPP PLATFORM                                   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────────────────┐ │
│  │   Frontend      │    │   Proxy Server   │    │      Backend Services          │ │
│  │   (React/TS)    │◄──►│   (Node.js)      │◄──►│      (FastAPI/Python)           │ │
│  │                 │    │                  │    │                                 │ │
│  │ • Agent UI      │    │ • API Gateway    │    │ • Workflow Engine               │ │
│  │ • Web Eval      │    │ • Authentication │    │ • Service Orchestration         │ │
│  │ • Code Viz      │    │ • Rate Limiting  │    │ • State Management              │ │
│  │ • Project Mgmt  │    │ • Request Proxy  │    │ • Event Handling                │ │
│  └─────────────────┘    └──────────────────┘    └─────────────────────────────────┘ │
│                                │                                │                   │
│                                ▼                                ▼                   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                           EXTERNAL INTEGRATIONS                                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Codegen API    │  │  Web-Eval-Agent │  │  Graph-Sitter   │  │  Grainchain     │ │
│  │  (AI Agents)    │  │  (MCP Server)   │  │  (Code Analysis)│  │  (Sandboxing)   │ │
│  │                 │  │                 │  │                 │  │                 │ │
│  │ • Agent Runs    │  │ • Browser Auto  │  │ • AST Analysis  │  │ • Isolated Exec │ │
│  │ • Code Gen      │  │ • GitHub Integ  │  │ • Dependency    │  │ • Safe Testing  │ │
│  │ • Problem Solve │  │ • AI Evaluation │  │ • Symbol Index  │  │ • Environment   │ │
│  │ • Multi-Org     │  │ • Screenshots   │  │ • Visualization │  │ • Resource Mgmt │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                            DEPLOYMENT & INFRASTRUCTURE                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  GitHub Actions │  │  Netlify/Vercel │  │  Docker/K8s     │  │  Monitoring     │ │
│  │  (CI/CD)        │  │  (Hosting)      │  │  (Containers)   │  │  (Observability)│ │
│  │                 │  │                 │  │                 │  │                 │ │
│  │ • PR Testing    │  │ • Preview Deps  │  │ • Service Mesh  │  │ • Metrics       │ │
│  │ • Deployment    │  │ • CDN           │  │ • Scaling       │  │ • Logging       │ │
│  │ • Quality Gates │  │ • SSL/Security  │  │ • Health Checks │  │ • Alerting      │ │
│  │ • Automation    │  │ • Performance   │  │ • Load Balancing│  │ • Dashboards    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 🛠️ Technology Stack

### Frontend Layer
- **Framework**: React 18 with TypeScript
- **State Management**: React Context + Custom Hooks
- **UI Components**: Tailwind CSS + Lucide Icons
- **Build Tool**: Create React App with custom webpack config
- **Testing**: Jest + React Testing Library
- **Code Quality**: ESLint + Prettier + TypeScript strict mode

### Proxy Server Layer
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Middleware**: CORS, Rate Limiting, Request Validation
- **Authentication**: JWT + API Key validation
- **Logging**: Winston with structured logging
- **Testing**: Jest + Supertest

### Backend Services Layer
- **Framework**: FastAPI (Python 3.11+)
- **Architecture**: Clean Architecture with Domain-Driven Design
- **API**: RESTful APIs with OpenAPI/Swagger documentation
- **Validation**: Pydantic models with strict type checking
- **Testing**: Pytest + AsyncIO testing
- **Documentation**: Auto-generated API docs

### External Integrations

#### 1. Codegen API Integration
- **Purpose**: AI agent orchestration and code generation
- **Technology**: Python SDK + REST API
- **Features**:
  - Multi-organization support
  - Agent run management
  - Real-time status tracking
  - Credential management
  - Usage analytics

#### 2. Web-Eval-Agent (MCP Server)
- **Purpose**: Automated web application testing
- **Technology**: Python + Playwright + Gemini AI
- **Features**:
  - Browser automation
  - GitHub PR testing
  - AI-powered evaluation
  - Screenshot capture
  - Report generation

#### 3. Graph-Sitter Integration
- **Purpose**: Code analysis and visualization
- **Technology**: Tree-sitter + Python bindings
- **Features**:
  - Multi-language AST parsing
  - Symbol indexing
  - Dependency graph generation
  - Interactive visualization
  - Performance optimization

#### 4. Grainchain Sandboxing
- **Purpose**: Secure code execution environment
- **Technology**: Docker + Kubernetes + Python
- **Features**:
  - Isolated execution
  - Resource management
  - Security boundaries
  - Environment provisioning
  - Cleanup automation

### Infrastructure & DevOps

#### CI/CD Pipeline
- **Platform**: GitHub Actions
- **Stages**: Build → Test → Security Scan → Deploy
- **Features**:
  - Automated testing
  - Security scanning (TruffleHog)
  - Preview deployments
  - Production deployment
  - Rollback capabilities

#### Hosting & Deployment
- **Frontend**: Netlify/Vercel with CDN
- **Backend**: Docker containers on cloud platforms
- **Database**: PostgreSQL with connection pooling
- **Caching**: Redis for session and API caching
- **Monitoring**: Application and infrastructure monitoring

## 🔄 CI/CD Workflow Structure

### 1. Development Workflow

```mermaid
graph TD
    A[Developer Push] --> B[GitHub Actions Trigger]
    B --> C[Code Quality Checks]
    C --> D[Unit Tests]
    D --> E[Integration Tests]
    E --> F[Security Scan]
    F --> G[Build Application]
    G --> H[Deploy Preview]
    H --> I[Web-Eval-Agent Testing]
    I --> J[Quality Gate Decision]
    J -->|Pass| K[Merge to Main]
    J -->|Fail| L[Block Merge]
    K --> M[Production Deployment]
    M --> N[Post-Deploy Validation]
```

### 2. Automated Testing Pipeline

#### Stage 1: Code Quality & Security
```yaml
# .github/workflows/quality-checks.yml
- ESLint + Prettier (Frontend)
- Pylint + Black (Backend)
- TypeScript type checking
- TruffleHog secret scanning
- Dependency vulnerability scanning
```

#### Stage 2: Unit & Integration Testing
```yaml
# .github/workflows/testing.yml
- Jest tests (Frontend components)
- Pytest tests (Backend services)
- API integration tests
- Database migration tests
- Mock service testing
```

#### Stage 3: Web Evaluation Testing
```yaml
# .github/workflows/web-eval-pr.yml
- Deploy preview environment
- Run web-eval-agent tests
- Generate evaluation reports
- Screenshot comparison
- Performance benchmarking
```

#### Stage 4: Deployment & Validation
```yaml
# .github/workflows/deployment.yml
- Build production artifacts
- Deploy to staging environment
- Run smoke tests
- Deploy to production
- Post-deployment validation
```

### 3. Quality Gates & Decision Points

#### Automated Quality Gates
1. **Code Quality**: ESLint/Pylint scores above threshold
2. **Test Coverage**: Minimum 80% coverage required
3. **Security**: No high/critical vulnerabilities
4. **Performance**: Web-eval-agent performance benchmarks
5. **Functionality**: All integration tests passing

#### Manual Review Gates
1. **Architecture Review**: For significant changes
2. **Security Review**: For authentication/authorization changes
3. **Performance Review**: For database/API changes
4. **UX Review**: For user interface changes

## 📋 Key Features & Capabilities

### 🤖 AI Agent Management
- **Multi-Organization Support**: Manage agents across different organizations
- **Real-time Monitoring**: Live status updates and progress tracking
- **Credential Management**: Secure API token and authentication handling
- **Usage Analytics**: Track agent performance and resource utilization
- **Error Handling**: Comprehensive error reporting and recovery

### 🌐 Web Evaluation System
- **Automated UI Testing**: AI-powered browser automation for comprehensive testing
- **GitHub Integration**: Automatic PR and branch deployment testing
- **Multi-Environment Testing**: Support for development, staging, and production
- **Visual Regression**: Screenshot comparison and visual diff detection
- **Performance Monitoring**: Page load times, Core Web Vitals, and performance metrics

### 🔍 Code Analysis & Visualization
- **Multi-Language Support**: Python, JavaScript, TypeScript, Go, Rust, Java, C++, C
- **Interactive Visualization**: AST trees, dependency graphs, call graphs
- **Symbol Navigation**: Function, class, and variable cross-referencing
- **Code Metrics**: Complexity analysis, maintainability scores
- **Real-time Updates**: Live analysis as code changes

### 🔧 Workflow Orchestration
- **Template-Based Workflows**: Pre-built CI/CD, code review, and deployment workflows
- **Custom Workflow Builder**: Visual workflow designer with drag-and-drop
- **Event-Driven Automation**: Trigger workflows based on GitHub events
- **State Management**: Persistent workflow state with recovery capabilities
- **Parallel Execution**: Concurrent workflow steps for improved performance

### 🛡️ Security & Compliance
- **Secret Management**: Secure storage and rotation of API keys and tokens
- **Access Control**: Role-based permissions and organization isolation
- **Audit Logging**: Comprehensive activity logging and compliance reporting
- **Security Scanning**: Automated vulnerability detection and remediation
- **Data Privacy**: GDPR-compliant data handling and user privacy controls

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+** and npm
- **Python 3.11+** with pip
- **Docker** (for local development)
- **Git** for version control

### Required API Keys
- **Codegen API Token**: Get from [Codegen Dashboard](https://app.codegen.com/settings)
- **Google Gemini API Key**: For web evaluation features
- **GitHub Token**: For GitHub integration features
- **Netlify/Vercel Token**: For deployment features (optional)

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/Zeeeepa/codegenApp.git
cd codegenApp
```

#### 2. Install Dependencies
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend
pip install -r requirements.txt
cd ..

# Proxy server dependencies
cd server
npm install
cd ..
```

#### 3. Environment Configuration
Create a `.env` file in the project root:

```bash
# Core Configuration
REACT_APP_API_TOKEN=your_codegen_api_token_here
REACT_APP_DEFAULT_ORGANIZATION=your_org_id_here
REACT_APP_API_BASE_URL=https://api.codegen.com
REACT_APP_USER_ID=your_user_id_here

# Web-Eval-Agent Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GITHUB_TOKEN=your_github_token_here
WEB_EVAL_MCP_PATH=web-eval-agent
WEB_EVAL_TIMEOUT=300000
WEB_EVAL_MAX_CONCURRENT=3

# Graph-Sitter Configuration
GRAPH_SITTER_CACHE_SIZE=1000
GRAPH_SITTER_MAX_FILE_SIZE=1048576
GRAPH_SITTER_SUPPORTED_LANGUAGES=python,javascript,typescript,go,rust

# Grainchain Configuration
GRAINCHAIN_API_URL=http://localhost:8080
GRAINCHAIN_TIMEOUT=60000
GRAINCHAIN_MAX_MEMORY=512MB

# Backend Configuration
BACKEND_HOST=localhost
BACKEND_PORT=8000
DATABASE_URL=postgresql://user:pass@localhost/codegenapp
REDIS_URL=redis://localhost:6379

# Deployment Configuration (Optional)
NETLIFY_AUTH_TOKEN=your_netlify_token_here
NETLIFY_SITE_ID=your_netlify_site_id_here
VERCEL_TOKEN=your_vercel_token_here
```

#### 4. Install External Dependencies
```bash
# Install web-eval-agent
pip install playwright python-dotenv
playwright install chromium

# Install graph-sitter languages
pip install tree-sitter tree-sitter-python tree-sitter-javascript tree-sitter-typescript

# Clone external repositories (if needed)
git clone https://github.com/Zeeeepa/web-eval-agent.git ../web-eval-agent
git clone https://github.com/Zeeeepa/grainchain.git ../grainchain
```

#### 5. Start the Development Environment
```bash
# Start all services concurrently
npm run dev:all

# Or start individually:
npm run backend:dev     # Backend API server (port 8000)
npm run server:dev      # Proxy server (port 3001)
npm start              # Frontend (port 3000)
```

### Application URLs
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`
- **Proxy Server**: `http://localhost:3001`
- **API Documentation**: `http://localhost:8000/docs`

## 📚 API Documentation

### Core API Endpoints

#### Agent Management
```http
GET    /api/v1/agents                    # List all agents
POST   /api/v1/agents                    # Create new agent run
GET    /api/v1/agents/{id}               # Get agent details
PUT    /api/v1/agents/{id}               # Update agent
DELETE /api/v1/agents/{id}               # Cancel agent run
```

#### Web Evaluation
```http
POST   /api/v1/evaluation/url           # Evaluate URL
POST   /api/v1/evaluation/github-pr     # Test GitHub PR
POST   /api/v1/evaluation/github-branch # Test GitHub branch
GET    /api/v1/evaluation/{id}/status   # Get evaluation status
GET    /api/v1/evaluation/{id}/results  # Get evaluation results
```

#### Code Analysis
```http
POST   /api/v1/analysis/codebase        # Analyze repository
POST   /api/v1/analysis/file            # Analyze single file
GET    /api/v1/analysis/{id}/graph      # Get dependency graph
GET    /api/v1/analysis/{id}/symbols    # Get symbol index
GET    /api/v1/analysis/{id}/metrics    # Get code metrics
```

#### Workflow Management
```http
GET    /api/v1/workflows                # List workflows
POST   /api/v1/workflows                # Create workflow
GET    /api/v1/workflows/{id}           # Get workflow details
PUT    /api/v1/workflows/{id}           # Update workflow
POST   /api/v1/workflows/{id}/execute   # Execute workflow
```

### Response Format
All API endpoints return JSON responses with the following structure:

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "metadata": {
    "timestamp": "2024-07-14T16:09:17.000Z",
    "request_id": "req_1234567890",
    "version": "1.0.0"
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "has_next": true
  }
}
```

## 🧪 Testing Strategy

### Frontend Testing
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Backend Testing
```bash
# Unit tests
cd backend && pytest tests/unit/

# Integration tests
pytest tests/integration/

# API tests
pytest tests/api/

# Coverage report
pytest --cov=app tests/
```

### Web Evaluation Testing
```bash
# Web-eval-agent tests
npm run test:web-eval

# Browser automation tests
npm run test:browser

# Performance tests
npm run test:performance
```

## 🚀 Deployment

### Production Deployment

#### Frontend Deployment (Netlify)
```bash
# Build production bundle
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=build
```

#### Backend Deployment (Docker)
```bash
# Build Docker image
docker build -t codegenapp-backend ./backend

# Run container
docker run -p 8000:8000 codegenapp-backend
```

#### Full Stack Deployment (Docker Compose)
```bash
# Deploy entire stack
docker-compose up -d

# Scale services
docker-compose up -d --scale backend=3
```

### Environment-Specific Configurations

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

## 📊 Monitoring & Observability

### Application Metrics
- **Performance**: Response times, throughput, error rates
- **Usage**: Active users, feature adoption, API usage
- **Business**: Agent runs, evaluations completed, code analyzed
- **Infrastructure**: CPU, memory, disk, network usage

### Logging Strategy
- **Structured Logging**: JSON format with consistent fields
- **Log Levels**: DEBUG, INFO, WARN, ERROR, CRITICAL
- **Correlation IDs**: Track requests across services
- **Sensitive Data**: Automatic PII redaction

### Alerting Rules
- **High Error Rate**: >5% error rate for 5 minutes
- **Slow Response**: >2s average response time
- **Service Down**: Health check failures
- **Resource Usage**: >80% CPU/memory usage

## 🔧 Development Guidelines

### Code Standards
- **TypeScript**: Strict mode enabled, no `any` types
- **Python**: Type hints required, PEP 8 compliance
- **Testing**: Minimum 80% code coverage
- **Documentation**: JSDoc/docstring for all public APIs

### Git Workflow
- **Branch Naming**: `feature/description`, `bugfix/description`
- **Commit Messages**: Conventional commits format
- **Pull Requests**: Required for all changes
- **Code Review**: Minimum one approval required

### Performance Guidelines
- **Frontend**: Bundle size <500KB, First Paint <2s
- **Backend**: API response <500ms, Database queries <100ms
- **Testing**: Test execution <5 minutes
- **Deployment**: Zero-downtime deployments

## 🤝 Contributing

### Getting Started
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Development Setup
```bash
# Install development dependencies
npm run install:dev

# Set up pre-commit hooks
npm run setup:hooks

# Run development environment
npm run dev:full
```

### Contribution Guidelines
- Follow the established code style
- Write comprehensive tests
- Update documentation
- Add changelog entries
- Ensure CI/CD passes

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support & Documentation

### Documentation
- **API Docs**: `http://localhost:8000/docs`
- **Architecture**: [backend/ARCHITECTURE.md](backend/ARCHITECTURE.md)
- **Graph-Sitter**: [docs/graph_sitter_integration.md](docs/graph_sitter_integration.md)

### Support Channels
- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Community support and questions
- **Documentation**: Comprehensive guides and examples

### Troubleshooting
- **Common Issues**: Check the troubleshooting guide
- **Logs**: Check application and service logs
- **Health Checks**: Verify service status endpoints
- **Configuration**: Validate environment variables

## 🔄 Roadmap

### Current Version (v1.0)
- ✅ Core agent management
- ✅ Web evaluation integration
- ✅ Basic code analysis
- ✅ CI/CD workflows

### Next Release (v1.1)
- 🔄 Advanced graph-sitter visualization
- 🔄 Enhanced workflow templates
- 🔄 Performance optimizations
- 🔄 Mobile responsive design

### Future Releases
- 📋 Multi-tenant architecture
- 📋 Advanced analytics dashboard
- 📋 Plugin system
- 📋 Enterprise features

---

**Built with ❤️ by the CodegenApp team**

[🔗 Live Demo](https://codegenapp.netlify.app) • [📖 Documentation](https://docs.codegenapp.com) • [🐛 Report Issues](https://github.com/Zeeeepa/codegenApp/issues)

