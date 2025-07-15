# CodegenApp - AI-Powered CI/CD Flow Management System

A comprehensive, enterprise-grade CI/CD flow management system that integrates AI-powered development workflows with automated validation, deployment, and intelligent error resolution.

## 🔄 The Complete Development Flow

CodegenApp follows a single, comprehensive flow from project selection to validated implementation with automatic PR management and deployment validation.

### Flow Overview
```
UI Dashboard → Project Selection → Target Goal Input → Codegen Processing → Response Handling → Validation Flow → Auto-Merge/Manual Review
```

## 🎯 Core System Components & Responsibilities

### 1. 🖥️ Frontend Dashboard (React/TypeScript)
**Location**: `src/`
**Responsibilities**:
- **Project Dropdown**: Dynamic project selection with GitHub integration
- **Project Cards**: Real-time status display with webhook URL configuration
- **Target Goal Input**: Natural language task specification interface
- **Progress Monitoring**: Live Codegen API response tracking
- **Validation Status**: Real-time deployment and testing feedback
- **Auto-Merge Controls**: User preference management for PR handling

**Key Components**:
- `src/components/ProjectDashboard.tsx` - Main dashboard interface
- `src/components/ProjectCard.tsx` - Individual project management
- `src/components/CreateRunDialog.tsx` - Target goal input interface
- `src/components/ValidationFlow.tsx` - Validation progress display
- `src/storage/projectCache.ts` - Project state management

### 2. 🔧 Backend Services (FastAPI/Python)
**Location**: `backend/`
**Responsibilities**:
- **Integration Manager**: Orchestrates all system components
- **Webhook Service**: Processes GitHub PR notifications
- **Validation Engine**: Manages deployment and testing workflows
- **Error Resolution**: Automated error context handling and retry logic
- **Snapshot Management**: Creates isolated validation environments

**Key Services**:
- `backend/app/core/integration/integration_manager.py` - System orchestration
- `backend/app/services/grainchain_webhook_service.py` - Webhook processing
- `backend/app/core/workflow/engine.py` - Validation workflow execution
- `backend/app/services/adapters/codegen_adapter.py` - Codegen API integration
- `backend/app/core/validation/snapshot_manager.py` - Environment isolation

### 3. 🤖 AI Integration Layer
**Responsibilities**:
- **Codegen Adapter**: Direct API integration for code generation
- **Graph-Sitter Integration**: Advanced code parsing and manipulation
- **Gemini Integration**: AI-powered validation and error analysis
- **Context Management**: Maintains conversation state across workflows

**Key Integrations**:
- **Codegen API**: Primary AI agent for code generation and problem solving
- **Graph-Sitter**: Code analysis, AST manipulation, and codemods
- **Gemini API**: Validation analysis and error context understanding
- **Web-Eval-Agent**: Comprehensive UI/UX and functionality testing

### 4. 🔄 Validation & Deployment Pipeline
**Responsibilities**:
- **Snapshot Creation**: Isolated validation environments with pre-deployed tools
- **Code Deployment**: Project-specific build and deploy command execution
- **Validation Testing**: Comprehensive flow and component testing
- **Error Resolution**: Intelligent error handling with context preservation
- **Auto-Merge Logic**: Intelligent PR merge decisions based on validation results

## 📋 Detailed System Flow

### Phase 1: Project Selection & Setup
1. **UI Dashboard Launch**: `src/App.tsx` initializes the main application
2. **Project Dropdown Population**: 
   - `getCachedProjects()` retrieves cached project list
   - `getGitHubClient()` initializes GitHub API client
   - Projects displayed with webhook URLs from Cloudflare domain (`.env` configured)
3. **Project Card Display**: Selected project appears as card with:
   - **Run Button**: Triggers target goal input dialog
   - **Settings Tab**: Deployment commands configuration
   - **GitHub Integration**: PR status and webhook configuration
   - **Auto-Merge Checkbox**: User preference for automatic PR merging

### Phase 2: AI-Powered Development
1. **Target Goal Input**: User clicks "Run" → Opens dialog for natural language task specification
2. **Codegen API Request**: 
   - Context: `<Project='selectedprojectname'>` + user's target text
   - Sent to Codegen API via `backend/app/services/adapters/codegen_adapter.py`
3. **Progress Monitoring**: Project card shows real-time Codegen API logging and status
4. **Response Processing**: Three response types handled:

#### Response Type 1: Regular Response
- **Display**: Response content shown in project card
- **Action**: "Continue" button enables follow-up input
- **Function**: `sendFollowUpMessage()` continues conversation

#### Response Type 2: Plan Response
- **Display**: Structured plan with step-by-step breakdown
- **Actions**: 
  - **Confirm**: Sends default "Proceed" prompt
  - **Modify**: Opens text input for plan refinement
- **Function**: `enablePlanContinuation()` handles user choice

#### Response Type 3: PR Response
- **Display**: GitHub PR notification with PR number badge
- **Trigger**: Automatically initiates Validation Flow
- **Function**: `initializeValidationFlow()` starts validation pipeline

### Phase 3: Automated Validation Pipeline

#### Step 1: Snapshot Creation
**Function**: `backend/app/core/validation/snapshot_manager.py`
- Creates isolated validation environment
- Pre-deploys Graph-Sitter with language support
- Pre-deploys Web-Eval-Agent with Gemini API configuration
- Loads all required environment variables

#### Step 2: Code Deployment
**Function**: `backend/app/core/workflow/deployment_executor.py`
- Git clones PR codebase to validation environment
- Executes deployment commands from project's settings tab
- Monitors deployment process with real-time logging

#### Step 3: Deployment Validation
**Function**: `backend/app/services/adapters/gemini_adapter.py`
- Analyzes deployment logs and context using Gemini API
- **Success Path**: Proceeds to Step 4 (Web Evaluation)
- **Failure Path**: 
  - Captures error logs and context
  - Sends to Codegen API as continuation message
  - Prompts for PR updates to resolve errors
  - Implements retry logic with context preservation
  - **Failure Limit**: After multiple failures, saves all error contexts and creates new session

#### Step 4: Web Evaluation Testing
**Function**: `backend/app/services/web_eval_service.py`
- Runs Web-Eval-Agent comprehensive testing:
  - All user flows validation
  - Component functionality testing
  - UI/UX validation
  - Performance benchmarking
- **Success Path**: Proceeds to Step 5 (Final Validation)
- **Failure Path**: 
  - Sends error context to Codegen API as continuation
  - Requests PR updates for issue resolution
  - Re-triggers deployment commands after PR updates

#### Step 5: Final Validation & Auto-Merge
**Function**: `backend/app/core/workflow/merge_manager.py`
- **Validation Success**: 
  - Displays completion notification
  - Offers user choices: [Merge to Main] or [Open GitHub]
  - **Auto-Merge Enabled**: Automatically merges if checkbox selected
- **Context Preservation**: All validation steps and results saved for audit

### Phase 4: Webhook Integration & Continuous Monitoring
**Function**: `backend/app/services/grainchain_webhook_service.py`
- **PR Updates**: Webhook notifications trigger re-deployment
- **Continuous Validation**: Updated PRs automatically re-enter validation pipeline
- **Status Updates**: Real-time project card status updates
- **Error Tracking**: Comprehensive error logging and context management

## 🛠️ Technology Stack & Dependencies

### Frontend Stack
- **React 18** with TypeScript for type safety
- **Tailwind CSS** for responsive UI design
- **Lucide Icons** for consistent iconography
- **Custom Hooks** for state management and API integration

### Backend Stack
- **FastAPI** for high-performance API development
- **Pydantic** for data validation and serialization
- **AsyncIO** for concurrent processing
- **SQLAlchemy** for database operations (optional)

### AI & Integration Services
- **Codegen API**: Primary AI agent for code generation
- **Graph-Sitter**: Multi-language code parsing and manipulation
- **Gemini API**: AI-powered validation and error analysis
- **Web-Eval-Agent**: Automated web application testing

### Infrastructure & DevOps
- **Cloudflare Workers**: Webhook gateway and domain management
- **GitHub API**: Repository management and PR operations
- **Docker**: Containerized validation environments
- **Environment Isolation**: Secure sandbox execution

## 🔧 Configuration & Environment Variables

### Core API Configuration
```bash
# Codegen Agent API
CODEGEN_ORG_ID=your_org_id
CODEGEN_API_TOKEN=your_codegen_api_token

# GitHub Integration
GITHUB_TOKEN=your_github_token

# AI Services
GEMINI_API_KEY=your_gemini_api_key

# Cloudflare Workers (Webhook Gateway)
CLOUDFLARE_API_KEY=your_cloudflare_api_key
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_WORKER_NAME=webhook-gateway
CLOUDFLARE_WORKER_URL=https://your-webhook-gateway.workers.dev
```

### Validation Environment Configuration
```bash
# Web-Eval-Agent Configuration
WEB_EVAL_MCP_PATH=web-eval-agent
WEB_EVAL_TIMEOUT=300000
WEB_EVAL_MAX_CONCURRENT=3

# Graph-Sitter Configuration
GRAPH_SITTER_CACHE_SIZE=1000
GRAPH_SITTER_MAX_FILE_SIZE=1048576
GRAPH_SITTER_SUPPORTED_LANGUAGES=python,javascript,typescript,go,rust

# Grainchain Integration
GRAINCHAIN_API_URL=http://localhost:8080
GRAINCHAIN_TIMEOUT=60000
GRAINCHAIN_MAX_MEMORY=512MB
```

## 🚀 Key Features & Capabilities

### 🎯 Intelligent Development Flow
- **Natural Language Processing**: Convert user goals into actionable development tasks
- **Context Preservation**: Maintain conversation state across multiple interactions
- **Multi-Response Handling**: Support for regular, plan, and PR response types
- **Iterative Development**: Continue button for ongoing development conversations

### 🔄 Automated Validation Pipeline
- **Isolated Environments**: Secure sandbox validation with pre-deployed tools
- **Comprehensive Testing**: Full flow, component, and performance validation
- **Error Resolution**: Intelligent error handling with context-aware retry logic
- **Auto-Merge Capability**: User-configurable automatic PR merging

### 🛡️ Enterprise-Grade Security
- **Environment Isolation**: Secure validation environments with resource limits
- **Webhook Security**: Secure GitHub webhook processing with validation
- **API Token Management**: Secure storage and rotation of API credentials
- **Audit Logging**: Comprehensive activity logging for compliance

### 📊 Real-Time Monitoring
- **Live Status Updates**: Real-time project card status and progress tracking
- **Webhook Integration**: Automatic PR notification and processing
- **Error Tracking**: Comprehensive error logging and context management
- **Performance Metrics**: Validation pipeline performance monitoring

## 🎯 Usage Examples

### Basic Development Flow
1. **Select Project**: Choose from dropdown → Project card appears
2. **Set Target**: Click "Run" → Enter natural language goal
3. **Monitor Progress**: Watch real-time Codegen API responses
4. **Handle Response**: Continue, confirm plan, or validate PR
5. **Auto-Validation**: PR automatically enters validation pipeline
6. **Review Results**: Choose to merge or review manually

### Advanced Configuration
1. **Deployment Settings**: Configure project-specific build commands
2. **Auto-Merge Setup**: Enable automatic PR merging after validation
3. **Webhook Configuration**: Set up GitHub webhook notifications
4. **Environment Customization**: Configure validation environment parameters

## 🔄 API Endpoints

### Project Management
```http
GET    /api/v1/projects                    # List all projects
POST   /api/v1/projects                    # Create new project
GET    /api/v1/projects/{id}               # Get project details
PUT    /api/v1/projects/{id}               # Update project settings
DELETE /api/v1/projects/{id}               # Delete project
```

### Agent Runs
```http
POST   /api/v1/runs                        # Create new agent run
GET    /api/v1/runs/{id}                   # Get run status
POST   /api/v1/runs/{id}/continue          # Continue conversation
POST   /api/v1/runs/{id}/confirm           # Confirm plan
POST   /api/v1/runs/{id}/modify            # Modify plan
```

### Validation Pipeline
```http
POST   /api/v1/validation/start            # Start validation flow
GET    /api/v1/validation/{id}/status      # Get validation status
POST   /api/v1/validation/{id}/retry       # Retry failed validation
POST   /api/v1/validation/{id}/merge       # Merge validated PR
```

### Webhook Integration
```http
POST   /api/v1/webhooks/github             # GitHub webhook endpoint
GET    /api/v1/webhooks/status             # Webhook status
POST   /api/v1/webhooks/configure          # Configure webhooks
```

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+** and npm
- **Python 3.11+** with pip
- **Docker** (for validation environments)
- **Git** for version control

### Installation
```bash
# Clone repository
git clone https://github.com/Zeeeepa/codegenApp.git
cd codegenApp

# Install dependencies
npm install
cd backend && pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys and configuration

# Start development servers
npm run dev:all
```

### Application URLs
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:8001`
- **API Documentation**: `http://localhost:8001/docs`

This system provides a complete, enterprise-ready CI/CD flow management solution that combines AI-powered development with automated validation and intelligent error resolution.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

**Built with ❤️ by the CodegenApp team**

[🔗 Live Demo](https://codegenapp.netlify.app) • [📖 Documentation](https://docs.codegenapp.com) • [🐛 Report Issues](https://github.com/Zeeeepa/codegenApp/issues)

