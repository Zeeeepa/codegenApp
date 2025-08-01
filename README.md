# 🚀 CodegenApp - GitHub Project Dashboard with AI-Powered CI/CD

CodegenApp is a comprehensive GitHub project dashboard that automates the complete development workflow from requirements to deployed code using AI agents and advanced validation pipelines.

## ✨ Features

### 🎯 **Core Functionality**
- **GitHub Project Dashboard** - Visual management of multiple GitHub repositories
- **AI Agent Orchestration** - Natural language to code generation via Codegen SDK
- **Automated PR Validation** - Complete testing pipeline with snapshots and web evaluation
- **Real-time Notifications** - Live updates via WebSocket connections
- **Auto-merge System** - Automatic PR merging after successful validation

### 🔧 **Project Management**
- **Repository Rules** - Custom AI agent instructions per project
- **Setup Commands** - Automated deployment command sequences
- **Secrets Management** - Secure environment variable storage
- **Planning Statements** - Configurable AI agent prompts
- **Webhook Integration** - Real-time GitHub event processing

### 🤖 **AI-Powered Automation**
- **Continuous Execution** - Agent runs until requirements are fully met
- **Plan Generation** - AI creates implementation plans for review
- **Error Resolution** - Automatic error context forwarding for fixes
- **Context Awareness** - Project-specific knowledge and constraints

### 🧪 **Validation Pipeline**
- **Grainchain Snapshots** - Isolated testing environments
- **Graph-sitter Analysis** - Static code analysis and quality metrics
- **Web-eval Testing** - Automated UI/UX validation
- **Deployment Verification** - Automated setup command execution

## 🏗️ Architecture

### **Frontend (React)**
```
Dashboard → ProjectCard → AgentRunDialog
    ↓           ↓            ↓
WebSocket ← API Client → Settings Panel
```

### **Backend (FastAPI)**
```
Projects API → GitHub Client → Validation Orchestrator
     ↓              ↓                ↓
Database ← Codegen Service → Snapshot Manager
     ↓              ↓                ↓
WebSocket ← Web-eval Agent → Deployment Runner
```

### **External Services**
```
GitHub API ← Cloudflare Worker → CodegenApp
     ↓              ↓                ↓
Grainchain ← Graph-sitter → Web-eval-agent
     ↓              ↓                ↓
Gemini API ← Codegen SDK → Project Repos
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- Docker (for Grainchain)
- GitHub Personal Access Token
- Codegen API Token
- Gemini API Key

### 1. Clone Repository
```bash
git clone https://github.com/Zeeeepa/codegenApp.git
cd codegenApp
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Configure your API keys in .env
CODEGEN_ORG_ID=your_org_id
CODEGEN_API_TOKEN=sk-your-codegen-api-token
GITHUB_TOKEN=github_pat_your_github_token
GEMINI_API_KEY=your_gemini_api_key
CLOUDFLARE_API_KEY=your_cloudflare_api_key
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_WORKER_URL=https://your-worker.your-domain.workers.dev
```

### 3. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Initialize database
python -c "from app.database.database import init_database; init_database()"

# Start backend server
uvicorn app.main:app --host 0.0.0.0 --port 3001 --reload
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm start
```

### 5. Cloudflare Worker Deployment
```bash
cd cloudflare-worker
npm install -g wrangler
wrangler login
wrangler secret put CODEGENAPP_API_URL
wrangler secret put WEBHOOK_SECRET
wrangler secret put API_TOKEN
wrangler deploy
```

## 📋 Usage Guide

### 1. **Add GitHub Project**
1. Click the "+" button in the dashboard
2. Select a GitHub repository from the dropdown
3. Configure project settings:
   - **Planning Statement**: Custom AI instructions
   - **Repository Rules**: Project-specific guidelines
   - **Auto-confirm Plans**: Skip manual plan approval
   - **Auto-merge PRs**: Automatic merging after validation

### 2. **Start Agent Run**
1. Click "Agent Run" on any project card
2. Enter your target/goal in natural language
3. The AI agent will:
   - Generate implementation plan (if needed)
   - Create pull request with changes
   - Trigger validation pipeline

### 3. **Validation Flow**
When a PR is created:
1. **Webhook Notification** → Cloudflare worker receives GitHub event
2. **Snapshot Creation** → Grainchain creates isolated environment
3. **Code Deployment** → Setup commands execute automatically
4. **Web Evaluation** → UI/UX testing with web-eval-agent
5. **Auto-merge** → PR merges if all validations pass

## 🛠️ Technology Stack

### **Core Services**
- **[Codegen SDK](https://docs.codegen.com)** - AI agent coordination & code generation
- **[Graph-sitter](https://github.com/Zeeeepa/graph-sitter)** - Static analysis & code quality metrics
- **[Grainchain](https://github.com/Zeeeepa/grainchain)** - Sandboxing & snapshot creation
- **[Web-eval-agent](https://github.com/Zeeeepa/web-eval-agent)** - UI testing & browser automation

### **Infrastructure**
- **FastAPI** - Backend API framework
- **React** - Frontend dashboard
- **SQLAlchemy** - Database ORM
- **WebSocket** - Real-time communication
- **Cloudflare Workers** - Webhook handling
- **GitHub API** - Repository management

### **AI & Analysis**
- **Gemini API** - AI-powered validation
- **Tree-sitter** - Code parsing and analysis
- **Playwright** - Browser automation
- **Docker** - Containerized environments

## 📊 Dashboard Features

### **Project Cards**
- **Status Indicators** - Real-time project health
- **PR Notifications** - Active pull request badges
- **Configuration Badges** - Visual rule/setup indicators
- **Activity Timeline** - Last activity timestamps

### **Real-time Updates**
- **WebSocket Connection** - Live status updates
- **Notification System** - Success/error alerts
- **Progress Tracking** - Validation pipeline status
- **Auto-refresh** - Automatic data synchronization

## 🔐 Security Features

### **Webhook Security**
- **Signature Validation** - GitHub webhook verification
- **Rate Limiting** - Abuse protection
- **IP Whitelisting** - Restricted webhook sources
- **Payload Validation** - Strict schema enforcement

### **Data Protection**
- **Encrypted Secrets** - Secure environment variable storage
- **JWT Authentication** - Secure API access
- **HTTPS/WSS** - Encrypted communication
- **Access Control** - Role-based permissions

### **Sandbox Security**
- **Isolated Environments** - Grainchain containerization
- **Resource Limits** - CPU/memory constraints
- **Network Isolation** - Restricted external access
- **Temporary Storage** - Automatic cleanup

## 🤝 Contributing

### **Development Setup**
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and test thoroughly
4. Commit changes: `git commit -m 'Add amazing feature'`
5. Push to branch: `git push origin feature/amazing-feature`
6. Open pull request

### **Code Standards**
- **Python**: Follow PEP 8, use type hints
- **JavaScript**: Use ESLint, Prettier formatting
- **Git**: Conventional commit messages
- **Testing**: Comprehensive test coverage

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Codegen Team** - AI agent platform
- **GitHub** - Repository hosting and API
- **Cloudflare** - Edge computing platform
- **Google** - Gemini AI API
- **Open Source Community** - Various tools and libraries

---

**Built with ❤️ by the CodegenApp Team**

*Transforming development workflows with AI-powered automation*

