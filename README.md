# CodegenApp - AI-Powered CI/CD Dashboard

A comprehensive full-stack application that integrates multiple AI and development tools to create an automated CI/CD pipeline with real-time validation and deployment capabilities.

## 🚀 Quick Start

### Prerequisites
- Python 3.8+ 
- Node.js 16+ and npm
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Zeeeepa/codegenApp.git
   cd codegenApp
   ```

2. **Install using the modern installation script:**
   ```bash
   python3 install.py --break-system-packages  # If using system Python
   # OR
   python3 install.py  # If using virtual environment (recommended)
   ```

   This script will:
   - Build the React frontend automatically
   - Install the package in development mode using modern `pyproject.toml`
   - Handle all dependencies

3. **Alternative manual installation:**
   ```bash
   # Build frontend first (optional, but recommended)
   python3 build_frontend.py
   
   # Install package
   pip install -e . --break-system-packages  # If using system Python
   # OR
   pip install -e .  # If using virtual environment
   ```

4. **Start the application:**
   ```bash
   codegen
   ```

That's it! The application will start both backend and frontend servers and automatically open your browser to http://localhost:3002.

## 🎯 Usage

### Basic Usage
```bash
codegen                    # Start with default ports (backend: 8001, frontend: 3002)
```

### Advanced Usage
```bash
codegen --backend-port 8080 --frontend-port 3000  # Custom ports
codegen --no-browser                               # Don't open browser automatically
codegen --help                                     # Show all options
```

### Access Points
- **Frontend UI**: http://localhost:3002
- **Backend API**: http://localhost:8001  
- **API Documentation**: http://localhost:8001/docs
- **Health Check**: http://localhost:8001/health

## 🛑 Stopping the Application
Press `Ctrl+C` in the terminal where you ran `codegen` to stop both servers gracefully.

## 🚀 Features

### Core Functionality
- **Project Management**: GitHub repository integration with real-time project cards
- **AI Agent Runs**: Codegen SDK integration for automated code generation
- **Real-time Validation**: Web-Eval-Agent powered UI testing with Gemini AI
- **Webhook Integration**: Live GitHub event notifications via Cloudflare Workers
- **Automated Deployment**: Grainchain-powered sandboxing and validation
- **Code Analysis**: Graph-Sitter integration for static code analysis

### Real-time Dashboard
- **Project Cards**: Visual project management with live status updates
- **WebSocket Communication**: Real-time notifications and progress tracking
- **Agent Run Interface**: Interactive AI agent execution with progress monitoring
- **Validation Pipeline**: Automated PR validation with visual feedback
- **Settings Management**: Per-project configuration and secrets management

## 🏗️ Architecture

### Backend Stack
- **FastAPI**: High-performance async API framework
- **WebSocket**: Real-time bidirectional communication
- **Service Orchestration**: Modular adapter pattern for external services
- **Background Tasks**: Async processing for long-running operations

### Frontend Stack
- **React**: Modern component-based UI framework
- **Real-time Updates**: WebSocket integration for live data
- **Responsive Design**: Mobile-friendly dashboard interface

### External Services Integration
- **Codegen SDK**: AI-powered code generation and modification
- **GitHub API**: Repository management and webhook handling
- **Web-Eval-Agent**: Browser automation and UI testing
- **Grainchain**: Sandboxing and snapshot creation
- **Graph-Sitter**: Static code analysis and parsing
- **Cloudflare Workers**: Webhook gateway and routing

## 🛠️ Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- Docker (for Grainchain)
- Git

### Environment Configuration

Create a `.env` file in the `backend` directory:

```bash
# Codegen Configuration
CODEGEN_ORG_ID=323
CODEGEN_API_TOKEN=sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99
CODEGEN_API_KEY=sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99

# GitHub Configuration  
GITHUB_TOKEN=your_github_token_here

# Gemini API Configuration
GEMINI_API_KEY=AIzaSyBXmhlHudrD4zXiv-5fjxi1gGG-_kdtaZ0

# Cloudflare Configuration
CLOUDFLARE_API_KEY=eae82cf159577a8838cc83612104c09c5a0d6
CLOUDFLARE_ACCOUNT_ID=2b2a1d3effa7f7fe4fe2a8c4e48681e3
CLOUDFLARE_WORKER_NAME=webhook-gateway
CLOUDFLARE_WORKER_URL=https://webhook-gateway.pixeliumperfecto.workers.dev
```

## 🚀 Deployment Commands

### Quick Start (Development)
```bash
# Clone and setup
git clone <repository-url>
cd codegenApp

# Setup environment
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys

# Install dependencies and start services
./deploy.sh
```

### Manual Deployment Steps

#### 1. Environment Setup
```bash
# Create backend environment file
cat > backend/.env << EOF
CODEGEN_ORG_ID=323
CODEGEN_API_TOKEN=sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99
CODEGEN_API_KEY=sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99
GITHUB_TOKEN=your_github_token_here
GEMINI_API_KEY=AIzaSyBXmhlHudrD4zXiv-5fjxi1gGG-_kdtaZ0
CLOUDFLARE_API_KEY=eae82cf159577a8838cc83612104c09c5a0d6
CLOUDFLARE_ACCOUNT_ID=2b2a1d3effa7f7fe4fe2a8c4e48681e3
CLOUDFLARE_WORKER_NAME=webhook-gateway
CLOUDFLARE_WORKER_URL=https://webhook-gateway.pixeliumperfecto.workers.dev
HOST=0.0.0.0
PORT=8001
DEBUG=true
LOG_LEVEL=INFO
EOF
```

#### 2. Backend Deployment
```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Install additional dependencies for comprehensive SDK
pip install aiohttp google-generativeai

# Start backend server
python main.py
```

#### 3. Frontend Deployment
```bash
# Navigate to frontend directory (in new terminal)
cd frontend

# Install Node.js dependencies
npm install

# Build for production
npm run build

# Start production server
npm start
```

#### 4. Verification Commands
```bash
# Check backend health
curl http://localhost:8001/health

# Check frontend accessibility
curl http://localhost:3002

# Test API endpoints
curl -H "Content-Type: application/json" http://localhost:8001/api/v1/workflow/status

# Test WebSocket connection
curl --include \
     --no-buffer \
     --header "Connection: Upgrade" \
     --header "Upgrade: websocket" \
     --header "Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==" \
     --header "Sec-WebSocket-Version: 13" \
     http://localhost:8001/ws
```

### Production Deployment

#### Using Docker (Recommended)
```bash
# Build and run with Docker Compose
docker-compose up --build -d

# Check container status
docker-compose ps

# View logs
docker-compose logs -f
```

#### Manual Production Setup
```bash
# Backend production setup
cd backend
pip install -r requirements.txt
pip install gunicorn
gunicorn main:app --host 0.0.0.0 --port 8001 --workers 4

# Frontend production build
cd frontend
npm run build
npm install -g serve
serve -s build -l 3002
```

### Automated Deployment & Testing
```bash
# Run comprehensive deployment and testing
python deploy_and_test.py

# Run specific deployment test
python -m pytest tests/ -v

# Run web evaluation tests
python test_ui_foundation.py
```

### Service-Specific Commands

#### Grainchain (Local Sandboxing)
```bash
# Start Docker daemon (if not running)
sudo systemctl start docker

# Verify Docker access
docker ps

# Test grainchain functionality
python -c "from backend.app.services.adapters.grainchain_adapter import GrainchainAdapter; print('Grainchain ready')"
```

#### Web-Eval-Agent Testing
```bash
# Test Gemini API connection
python -c "import google.generativeai as genai; genai.configure(api_key='AIzaSyBXmhlHudrD4zXiv-5fjxi1gGG-_kdtaZ0'); print('Gemini API ready')"

# Run web evaluation
python -c "from backend.app.services.adapters.web_eval_adapter import WebEvalAdapter; adapter = WebEvalAdapter(); print('Web-Eval-Agent ready')"
```

#### GitHub Integration
```bash
# Test GitHub token
curl -H "Authorization: token your_github_token_here" https://api.github.com/user

# Test repository access
curl -H "Authorization: token your_github_token_here" https://api.github.com/user/repos
```

#### Codegen API Testing
```bash
# Test Codegen API connection
curl -H "Authorization: Bearer sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99" \
     -H "Content-Type: application/json" \
     https://api.codegen.com/v1/users/me

# Test organization access
curl -H "Authorization: Bearer sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99" \
     -H "Content-Type: application/json" \
     https://api.codegen.com/v1/organizations
```

### Troubleshooting Commands

#### Port Conflicts
```bash
# Check what's running on ports
lsof -i :8001  # Backend port
lsof -i :3002  # Frontend port

# Kill processes if needed
kill -9 $(lsof -t -i:8001)
kill -9 $(lsof -t -i:3002)
```

#### Service Health Checks
```bash
# Backend health check with detailed output
curl -v http://localhost:8001/health

# Frontend accessibility check
curl -I http://localhost:3002

# WebSocket connection test
wscat -c ws://localhost:8001/ws
```

#### Log Monitoring
```bash
# Monitor backend logs
tail -f backend/app.log

# Monitor deployment logs
tail -f deployment_test.log

# Monitor system resources
htop
```

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python main.py
```

The backend will start on `http://localhost:8001`

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

The frontend will start on `http://localhost:3002`

## 📡 API Endpoints

### Projects Management
- `GET /api/v1/projects/repositories` - List available GitHub repositories
- `POST /api/v1/projects/create` - Create new project with webhook setup
- `POST /api/v1/projects/{project_id}/agent-run` - Start AI agent run
- `POST /api/v1/projects/{project_id}/validate` - Trigger validation pipeline
- `GET /api/v1/projects/{project_id}/branches` - Get repository branches
- `POST /api/v1/projects/{project_id}/webhook` - Configure webhook

### Webhooks
- `POST /api/webhooks/github` - GitHub webhook endpoint
- `POST /api/webhooks/cloudflare` - Cloudflare worker webhook endpoint
- `GET /api/webhooks/health` - Webhook service health check

### WebSocket
- `WS /ws` - General WebSocket connection
- `WS /ws/{project_name}` - Project-specific WebSocket connection

### Health & Status
- `GET /health` - Application health check
- `GET /api/v1/workflow/status` - Workflow engine status

## 🔄 Workflow Process

### 1. Project Setup
1. **Repository Selection**: Choose from available GitHub repositories
2. **Project Creation**: Configure project settings and webhook URL
3. **Webhook Configuration**: Automatic GitHub webhook setup for PR notifications

### 2. Agent Run Execution
1. **Target Definition**: Specify development goals and requirements
2. **AI Processing**: Codegen SDK processes requirements and generates code
3. **PR Creation**: Automated pull request creation with generated changes

### 3. Validation Pipeline
1. **PR Detection**: Webhook notification triggers validation pipeline
2. **Snapshot Creation**: Grainchain creates isolated deployment environment
3. **Code Analysis**: Graph-Sitter performs static code analysis
4. **UI Testing**: Web-Eval-Agent validates all UI components and flows
5. **Auto-merge**: Successful validation triggers automatic PR merge

### 4. Real-time Monitoring
- **Live Updates**: WebSocket notifications for all pipeline stages
- **Progress Tracking**: Visual progress indicators for long-running tasks
- **Error Handling**: Automatic error detection and recovery workflows

## 🧩 Service Components

### Web-Eval-Agent Integration
```python
# Validation request example
validation_request = WebEvalValidationRequest(
    project_url="https://github.com/user/repo",
    test_scenarios=[
        "Test project selection and pinning",
        "Validate agent run interface",
        "Verify webhook notifications",
        "Test validation pipeline"
    ],
    deployment_url="http://localhost:3002",
    environment_vars={"GEMINI_API_KEY": "..."}
)

result = await web_eval_adapter.validate_deployment(validation_request)
```

### GitHub Service Integration
```python
# Repository management example
repositories = await github_service.get_repositories()
webhook_success = await github_service.set_webhook(
    owner="user",
    repo="repository", 
    webhook_url="https://webhook-gateway.workers.dev"
)
```

### WebSocket Communication
```javascript
// Frontend WebSocket connection
const ws = new WebSocket('ws://localhost:8001/ws/project-name');
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // Handle real-time updates
    updateProjectCard(data);
};
```

## 🔧 Configuration Options

### Project Settings
- **Repository Rules**: Custom rules for AI agent behavior
- **Setup Commands**: Deployment and build commands
- **Secrets Management**: Environment variables and API keys
- **Auto-merge**: Automatic PR merging after successful validation

### Validation Settings
- **Test Scenarios**: Custom UI testing scenarios
- **Timeout Configuration**: Maximum validation time limits
- **Retry Logic**: Automatic retry on transient failures
- **Notification Preferences**: Real-time update settings

## 📊 Monitoring & Logging

### Real-time Metrics
- Active WebSocket connections
- Running validation pipelines
- Agent run status and progress
- GitHub webhook event processing

### Logging Levels
- **INFO**: General application flow
- **DEBUG**: Detailed service interactions
- **ERROR**: Error conditions and exceptions
- **WARNING**: Potential issues and recoveries

## 🚦 Current Implementation Status

### ✅ Completed Features
- [x] Backend API with FastAPI
- [x] WebSocket real-time communication
- [x] GitHub API integration
- [x] Web-Eval-Agent service adapter
- [x] Webhook processing system
- [x] Projects management API
- [x] Service orchestration framework

### 🔄 In Progress
- [ ] Frontend dashboard completion
- [ ] WebSocket client integration
- [ ] UI component implementation

### ⏳ Planned Features
- [ ] Grainchain snapshot integration
- [ ] Graph-Sitter code analysis
- [ ] Cloudflare Worker deployment
- [ ] Complete validation pipeline
- [ ] Comprehensive UI testing
- [ ] Performance optimization

## 🧪 Testing

### Running Tests
```bash
# Backend tests
cd backend
pytest tests/

# Frontend tests  
cd frontend
npm test
```

### Test Coverage
- Unit tests for all service adapters
- Integration tests for API endpoints
- WebSocket communication tests
- End-to-end workflow validation

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
- Check the [PLAN.md](PLAN.md) for detailed implementation roadmap
- Review API documentation in the `/docs` endpoint when running

## 🔮 Future Enhancements

- **Multi-language Support**: Expand beyond current language support
- **Advanced Analytics**: Detailed metrics and reporting dashboard
- **Team Collaboration**: Multi-user project management
- **Custom Integrations**: Plugin system for additional services
- **Mobile App**: Native mobile application for monitoring
- **Enterprise Features**: Advanced security and compliance features

---

**Built with ❤️ using modern AI and development tools**
