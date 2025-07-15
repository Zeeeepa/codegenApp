# CodegenApp - AI-Powered CI/CD Flow Management System

A streamlined CI/CD flow management system that integrates AI-powered development workflows with automated validation and deployment.

## System Flow

### 1. Project Selection & Management
- **UI Dashboard**: Clean interface with project dropdown and project cards
- **Project Cards**: Display selected projects with webhook URLs auto-configured from Cloudflare domain
- **Webhook Integration**: Automatic PR notifications trigger system workflows

### 2. AI-Powered Development Flow
```
Project Selection → Target Goal Input → Codegen API Request → Response Processing
```

**Response Types:**
- **Regular Response**: Continue button for iterative development
- **Plan Response**: Confirm/Modify options for structured execution  
- **PR Response**: Automatic GitHub PR creation with validation trigger

### 3. Automated Validation Pipeline
```
PR Creation → Snapshot Creation → Code Deployment → Validation Testing → Auto-Merge/Manual Review
```

**Validation Components:**
- **Graph-Sitter**: Advanced code analysis and manipulation
- **Web-Eval-Agent**: Comprehensive flow and component testing
- **Gemini API**: AI-powered validation and error analysis
- **Auto-Retry Logic**: Intelligent error resolution with context preservation

## Core Components

### Frontend (React/Next.js)
- **Project Dashboard**: Central project management interface
- **Target Goal Input**: Natural language task specification
- **Progress Monitoring**: Real-time Codegen API response tracking
- **Validation Status**: Live deployment and testing feedback

### Backend Services (FastAPI)
- **Integration Manager**: Orchestrates all system components
- **Webhook Service**: Processes GitHub PR notifications
- **Validation Engine**: Manages deployment and testing workflows
- **Error Resolution**: Automated error context handling

### AI Integration Layer
- **Codegen Adapter**: Direct API integration for code generation
- **Graph-Sitter Adapter**: Code parsing and manipulation
- **Gemini Integration**: Validation and error analysis
- **Context Management**: Maintains conversation state across workflows

### Deployment & Validation
- **Snapshot System**: Isolated validation environments
- **Deployment Commands**: Project-specific build and deploy scripts
- **Web-Eval-Agent**: Automated UI/UX and functionality testing
- **Auto-Merge Logic**: Intelligent PR merge decisions

## Environment Configuration

```bash
# Codegen Agent API
CODEGEN_ORG_ID=323
CODEGEN_API_TOKEN=sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99

# GitHub Integration
GITHUB_TOKEN=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

# Gemini API
GEMINI_API_KEY=AIzaSyBXmhlHudrD4zXiv-5fjxi1gGG-_kdtaZ0

# Cloudflare Workers
CLOUDFLARE_API_KEY=eae82cf159577a8838cc83612104c09c5a0d6
CLOUDFLARE_ACCOUNT_ID=2b2a1d3effa7f7fe4fe2a8c4e48681e3
CLOUDFLARE_WORKER_NAME=webhook-gateway
CLOUDFLARE_WORKER_URL=https://webhook-gateway.pixeliumperfecto.workers.dev
```

## Quick Start

### 1. Installation
```bash
git clone https://github.com/Zeeeepa/codegenApp.git
cd codegenApp
```

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
./run.sh
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Access Dashboard
Open `http://localhost:3000` and select your project from the dropdown.

## Usage Workflow

### Step 1: Project Selection
1. Open the dashboard UI
2. Select project from dropdown list
3. Project card appears with webhook URL configured
4. Click "Run" button to start development flow

### Step 2: Goal Specification
1. Enter target text/goal in the input field
2. System sends request: `<Project='selectedprojectname'> + target goal`
3. Monitor progress through Codegen API logging
4. Receive one of three response types

### Step 3: Response Handling
- **Regular**: Click "Continue" to add more context
- **Plan**: Choose "Confirm" or "Modify" with additional input
- **PR**: Automatic GitHub PR creation triggers validation

### Step 4: Validation Flow
1. **Snapshot Creation**: Isolated environment with Graph-Sitter + Web-Eval-Agent
2. **Code Deployment**: Git clone PR + run deployment commands
3. **Deployment Validation**: Gemini API validates successful deployment
4. **Functionality Testing**: Web-Eval-Agent tests all flows and components
5. **Error Resolution**: Automatic error context feedback to Codegen API
6. **Auto-Retry**: Continues until success or maximum attempts reached

### Step 5: Completion
- **Success**: Notification with [Merge to Main] or [Open GitHub] options
- **Auto-Merge**: Optional checkbox for automatic validated PR merging
- **GitHub Integration**: Direct PR management from dashboard

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Dashboard UI                             │
│  Project Dropdown → Project Cards → Run Button             │
├─────────────────────────────────────────────────────────────┤
│                  Codegen API Integration                    │
│  Target Goal → Context Prompt → Response Processing        │
├─────────────────────────────────────────────────────────────┤
│                  Validation Pipeline                       │
│  PR Creation → Snapshot → Deploy → Test → Validate         │
├─────────────────────────────────────────────────────────────┤
│                  External Services                         │
│  GitHub API → Gemini API → Cloudflare Workers             │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

- **Single Flow Design**: Streamlined user experience with minimal complexity
- **AI-Powered Development**: Natural language to code generation
- **Automated Validation**: Complete CI/CD pipeline with intelligent testing
- **Error Resolution**: Self-healing workflows with context preservation
- **Auto-Merge Capability**: Intelligent PR management with validation
- **Real-Time Monitoring**: Live progress tracking and status updates

## Project Responsibilities

### Core Functions
- **Integration Manager** (`app/core/integration/`): System orchestration
- **Webhook Service** (`app/services/grainchain_webhook_service.py`): PR processing
- **Codegen Adapter** (`app/services/adapters/codegen_adapter.py`): AI integration
- **Graph-Sitter Adapter** (`app/services/adapters/graph_sitter_adapter.py`): Code analysis
- **Validation Engine** (`app/core/validation/`): Deployment and testing workflows

### Supporting Components
- **Event Bus** (`app/core/integration/event_bus.py`): Inter-service communication
- **Configuration Manager** (`app/core/integration/config_manager.py`): Environment management
- **Plugin System** (`app/core/integration/plugin_system.py`): Extensible architecture
- **API Routes** (`app/api/v1/routes/`): REST API endpoints

## Development

### Running in Development Mode
```bash
# Backend with hot reload
cd backend && ./dev.sh

# Frontend with hot reload  
cd frontend && npm run dev
```

### Testing
```bash
# Backend tests
cd backend && python -m pytest

# Frontend tests
cd frontend && npm test
```

This system provides a complete AI-powered CI/CD flow management solution with automated validation, intelligent error resolution, and seamless GitHub integration.

