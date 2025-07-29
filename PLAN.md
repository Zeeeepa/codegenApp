# CodeGen App UI Dashboard - Implementation Plan

## Project Overview
Comprehensive UI dashboard for managing GitHub projects with CodeGen agent integration, featuring real-time webhook notifications, validation pipelines, and automated CI/CD workflows.

## Feature Checklist

### 1. Core Infrastructure
- [x] **Create PLAN.md with Feature Checklist**
  - Description: Comprehensive project plan with feature checklist and dependencies
  - Dependencies: None
  - Status: ✅ Complete

- [ ] **Restructure Project Architecture** 
  - Description: Reorganize codebase into modular, cohesive structure removing redundant files
  - Dependencies: PLAN.md
  - Components: Frontend modules, backend services, shared utilities
  - Files: `frontend/src/`, `backend/`, `services/`, `utils/`

- [ ] **Implement Data Persistence & State Management**
  - Description: Robust data persistence for all project configurations and settings
  - Dependencies: Project Architecture
  - Components: Local storage, state management, data models
  - Files: `frontend/src/store/`, `frontend/src/utils/dataStorage.ts`

### 2. GitHub Integration
- [ ] **GitHub Project Selection & Dashboard**
  - Description: UI for selecting GitHub projects and displaying them as dashboard cards
  - Dependencies: Project Architecture, Data Persistence
  - Components: Project dropdown, dashboard cards, GitHub API integration
  - Files: `frontend/src/components/ProjectDashboard.tsx`, `frontend/src/services/githubService.ts`

- [ ] **Webhook System with Cloudflare Workers**
  - Description: Webhook integration for PR notifications using Cloudflare Workers
  - Dependencies: GitHub Integration
  - Components: Webhook handler, notification system, Cloudflare integration
  - Files: `cloudflare-worker/webhook-handler.js`, `frontend/src/services/webhookService.ts`

### 3. Agent Management
- [ ] **Agent Run Management System**
  - Description: Agent run functionality with target/goal input and progress tracking
  - Dependencies: GitHub Integration, Data Persistence
  - Components: Agent run dialog, progress tracking, CodeGen API integration
  - Files: `frontend/src/components/AgentRunDialog.tsx`, `frontend/src/services/codegenService.ts`

- [ ] **Project Settings & Configuration**
  - Description: Comprehensive project settings including repository rules, setup commands, and secrets
  - Dependencies: Agent Management, Data Persistence
  - Components: Settings dialog, secrets manager, configuration storage
  - Files: `frontend/src/components/ProjectSettingsDialog.tsx`, `frontend/src/components/SecretsManager.tsx`

### 4. Validation Pipeline
- [ ] **Validation Flow with Graph-Sitter & Web-Eval-Agent**
  - Description: Comprehensive validation pipeline with snapshot creation and testing
  - Dependencies: Agent Management, Project Settings
  - Components: Validation service, Grainchain integration, Web-Eval-Agent testing
  - Files: `services/validationService.ts`, `services/grainchainService.ts`, `services/webEvalService.ts`

### 5. Testing & Documentation
- [ ] **Web-Eval-Agent Testing Integration**
  - Description: Comprehensive testing with Web-Eval-Agent for full CI/CD cycle validation
  - Dependencies: All core features
  - Components: Integration tests, automated test suites, validation scripts
  - Files: `tests/integration/fullCycleTest.ts`, `web-eval-agent/config/testSuites.json`

- [ ] **Comprehensive Documentation**
  - Description: Updated README.md with complete usage guide and architecture documentation
  - Dependencies: All features implemented
  - Components: README update, architecture docs, API documentation
  - Files: `README.md`, `docs/ARCHITECTURE.md`, `docs/API.md`

## Technology Stack

### Core Services
1. **Codegen SDK** - Agent coordination & code generation
   - API: https://docs.codegen.com/api-reference/agents/create-agent-run
   - Environment: `CODEGEN_ORG_ID`, `CODEGEN_API_TOKEN`

2. **Graph-Sitter** - Static analysis & code quality metrics
   - Repository: zeeeepa/graph-sitter
   - Integration: Code analysis and quality validation

3. **Grainchain** - Sandboxing + snapshot creation + PR validation deployments
   - Repository: zeeeepa/grainchain
   - Integration: Deployment validation and testing

4. **Web-Eval-Agent** - UI testing & browser automation
   - Repository: zeeeepa/web-eval-agent
   - Environment: `GEMINI_API_KEY`

### External Services
1. **GitHub API** - Repository management and webhook setup
   - Environment: `GITHUB_TOKEN`
   - Features: Project listing, webhook configuration, PR management

2. **Cloudflare Workers** - Webhook handling and online accessibility
   - Environment: `CLOUDFLARE_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_WORKER_NAME`, `CLOUDFLARE_WORKER_URL`
   - Features: Webhook processing, real-time notifications

## Implementation Phases

### Phase 1: Foundation (Steps 1-3)
- Clean up and restructure codebase
- Implement data persistence and state management
- Set up modular architecture

### Phase 2: Core Features (Steps 4-6)
- GitHub project integration
- Agent run management
- Project settings and configuration

### Phase 3: Advanced Features (Steps 7-8)
- Webhook system integration
- Validation pipeline with external tools

### Phase 4: Testing & Documentation (Steps 9-10)
- Comprehensive testing with Web-Eval-Agent
- Documentation and deployment guides

## Success Criteria
- ✅ GitHub projects can be selected and added to dashboard
- ✅ Webhook URLs automatically set on selected repositories
- ✅ Agent runs can be initiated with target/goal input
- ✅ Project settings persist across sessions
- ✅ Validation flow works with Graph-Sitter and Web-Eval-Agent
- ✅ Full CI/CD cycle tested and validated
- ✅ Auto-merge functionality for validated PRs
- ✅ Comprehensive documentation and usage guides

## Environment Variables Required
```bash
# CodeGen API
CODEGEN_ORG_ID=323
CODEGEN_API_TOKEN=sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99

# GitHub Integration
GITHUB_TOKEN=[REDACTED]

# Cloudflare Workers
CLOUDFLARE_API_KEY=eae82cf159577a8838cc83612104c09c5a0d6
CLOUDFLARE_ACCOUNT_ID=2b2a1d3effa7f7fe4fe2a8c4e48681e3
CLOUDFLARE_WORKER_NAME=webhook-gateway
CLOUDFLARE_WORKER_URL=https://webhook-gateway.pixeliumperfecto.workers.dev

# Web-Eval-Agent
GEMINI_API_KEY=AIzaSyBXmhlHudrD4zXiv-5fjxi1gGG-_kdtaZ0
```

---
*Last Updated: $(date)*
*Status: In Progress*
