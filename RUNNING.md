# Running CodegenApp - Complete Setup Guide

This guide will help you get the CodegenApp platform up and running with all its components including the Cloudflare Workers webhook integration.

## 🚀 Quick Start

### Option 1: Full Production Setup
```bash
# Complete setup with all services
./run.sh
```

### Option 2: Development Mode
```bash
# Quick development setup with hot reloading
npm run dev
```

### Option 3: Manual Step-by-Step Setup
```bash
# 1. Install all dependencies
npm run setup

# 2. Start individual services
npm run backend:dev    # Backend API (port 8080)
npm run server:dev     # Proxy server (port 8001)  
npm start              # Frontend (port 8000)
```

## 📋 Prerequisites

Before running the application, ensure you have:

- **Node.js** (v18 or higher)
- **npm** (v8 or higher)
- **Python 3.11+**
- **pip3**
- **Git**

### Optional (for Cloudflare Workers):
- **wrangler CLI** - `npm install -g wrangler`
- **uv** - Python package manager for Cloudflare Workers

## 🔧 Configuration

### 1. Environment Setup

Copy the example environment file:
```bash
cp .env.example .env
```

The `.env.example` file contains placeholder values. You'll need to replace them with actual API keys:

```bash
# Codegen API Configuration
REACT_APP_API_TOKEN=your_api_token_here
REACT_APP_DEFAULT_ORGANIZATION=your_org_id_here
CODEGEN_API_TOKEN=your_api_token_here
CODEGEN_ORG_ID=your_org_id_here

# GitHub Integration  
# Get your token from: https://github.com/settings/tokens
GITHUB_TOKEN=your_github_token_here

# AI/ML Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Cloudflare Workers (update with your values)
CLOUDFLARE_API_KEY=your_cloudflare_api_key_here
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id_here
CLOUDFLARE_WORKER_URL=https://webhook-gateway.your-subdomain.workers.dev

# Webhook Configuration
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret_here
```

### 2. Cloudflare Workers Setup (Optional)

If you want to deploy the webhook handler to Cloudflare Workers:

```bash
# 1. Install wrangler CLI
npm install -g wrangler

# 2. Authenticate with Cloudflare
wrangler auth login

# 3. Update your Cloudflare credentials in .env
# CLOUDFLARE_API_KEY=your_actual_api_key
# CLOUDFLARE_ACCOUNT_ID=your_actual_account_id

# 4. Build and deploy the worker
npm run cloudflare:build
npm run cloudflare:deploy
```

## 🏃‍♂️ Running the Application

### Method 1: Full Production Setup (Recommended)

The `run.sh` script provides a complete production-like setup:

```bash
./run.sh
```

This script will:
- ✅ Check all prerequisites
- ✅ Install dependencies for all services
- ✅ Create Python virtual environment for backend
- ✅ Start all services in the correct order
- ✅ Wait for each service to be ready
- ✅ Provide health monitoring
- ✅ Handle graceful shutdown

**Services started:**
- 🖥️ **Frontend (React)**: http://localhost:8000
- 🔗 **Proxy Server (Node.js)**: http://localhost:8001  
- ⚡ **Backend API (FastAPI)**: http://localhost:8080
- 📚 **API Documentation**: http://localhost:8080/docs

### Method 2: Development Mode

For development with hot reloading:

```bash
npm run dev
```

This uses `concurrently` to start all services simultaneously with hot reloading enabled.

### Method 3: Individual Services

Start services individually for debugging:

```bash
# Terminal 1: Backend API
npm run backend:dev

# Terminal 2: Proxy Server  
npm run server:dev

# Terminal 3: Frontend
npm start
```

## 🧪 Testing

### Run All Tests
```bash
npm run test:all
```

### Individual Test Suites
```bash
npm test                    # Frontend tests
npm run server:test         # Proxy server tests
npm run backend:test        # Backend API tests
npm run test:web-eval       # Web evaluation agent tests
```

### Test Coverage
```bash
npm run test:web-eval:coverage
```

## 🌐 Cloudflare Workers Development

### Local Development
```bash
npm run cloudflare:dev
```

### Build and Deploy
```bash
# Build the worker
npm run cloudflare:build

# Deploy to Cloudflare
npm run cloudflare:deploy
```

### Configure GitHub Webhooks

After deploying your Cloudflare Worker:

1. Go to your GitHub repository settings
2. Navigate to **Webhooks** → **Add webhook**
3. Set payload URL: `https://your-worker-url.workers.dev/webhook/github`
4. Set content type: `application/json`
5. Set secret: Your `GITHUB_WEBHOOK_SECRET`
6. Select events: **Pull requests** and **Push**

## 📊 Service Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              CODEGENAPP PLATFORM                               │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    ┌──────────────────┐    ┌──────────────────────────────┐ │
│  │   Frontend      │    │   Proxy Server   │    │      Backend Services      │ │
│  │   (React/TS)    │◄──►│   (Node.js)      │◄──►│      (FastAPI/Python)       │ │
│  │   Port: 8000    │    │   Port: 8001     │    │      Port: 8080             │ │
│  └─────────────────┘    └──────────────────┘    └──────────────────────────────┘ │
│                                │                                │               │
│                                ▼                                ▼               │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                           EXTERNAL INTEGRATIONS                                 │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │  Codegen API    │  │  GitHub API     │  │  Gemini AI      │                │
│  │  (AI Agents)    │  │  (Repositories) │  │  (Intelligence) │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    Cloudflare Workers (Edge Layer)                       │ │
│  │                                                                           │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │ │
│  │  │  Webhook Handler│  │  Event Router   │  │  Validation     │          │ │
│  │  │  (FastAPI/uv)   │  │  (PR Events)    │  │  Trigger        │          │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘          │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 🔍 Troubleshooting

### Common Issues

1. **Port conflicts**
   ```bash
   # Kill processes on conflicting ports
   lsof -ti :8000 | xargs kill -9
   lsof -ti :8001 | xargs kill -9
   lsof -ti :8080 | xargs kill -9
   ```

2. **Python virtual environment issues**
   ```bash
   cd backend
   rm -rf venv
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Node.js dependency issues**
   ```bash
   rm -rf node_modules server/node_modules
   npm install
   cd server && npm install
   ```

4. **Backend service not starting**
   ```bash
   cd backend
   source venv/bin/activate
   python -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload
   ```

### Logs

When using `./run.sh`, logs are available in:
- `logs/frontend.log` - React frontend logs
- `logs/proxy.log` - Node.js proxy server logs  
- `logs/backend.log` - FastAPI backend logs

### Health Checks

- Frontend: http://localhost:8000
- Proxy Server: http://localhost:8001
- Backend API: http://localhost:8080/health
- API Documentation: http://localhost:8080/docs

## 🛠️ Development Workflow

### Making Changes

1. **Frontend changes**: Edit files in `src/`, hot reloading enabled
2. **Backend changes**: Edit files in `backend/`, auto-reload with `--reload` flag
3. **Proxy server changes**: Edit `server/index.js`, nodemon handles restarts

### Adding New Features

1. **API endpoints**: Add to `backend/app/api/v1/routes/`
2. **Services**: Add to `backend/app/services/`
3. **Frontend components**: Add to `src/components/`
4. **Webhook handlers**: Edit `cloudflare/src/worker.py`

### Database Migrations (if using)

```bash
cd backend
source venv/bin/activate
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

## 📚 Additional Resources

- [Frontend Documentation](src/README.md)
- [Backend API Documentation](backend/ARCHITECTURE.md)
- [Cloudflare Workers Guide](cloudflare/README.md)
- [Testing Guide](tests/README.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test:all`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

