# CI/CD Pipeline with Codegen API Integration

This document describes the comprehensive CI/CD pipeline setup for the CodegenApp, featuring full integration with the Codegen API for automated code analysis, deployment monitoring, and intelligent feedback.

## 🚀 Overview

The CI/CD pipeline provides:
- **Automated Build & Test** - Continuous integration with quality checks
- **Security Scanning** - Vulnerability detection and code analysis
- **Codegen AI Integration** - Intelligent code review and recommendations
- **Multi-Environment Deployment** - Staging and production deployments
- **Post-Deployment Monitoring** - Automated health checks and performance monitoring

## 📋 Pipeline Stages

### 1. Build and Test
- **Node.js Setup** - Installs dependencies and sets up environment
- **Code Linting** - ESLint checks for code quality
- **Application Build** - Creates production-ready build artifacts
- **Unit Testing** - Runs test suite with coverage reporting
- **Artifact Upload** - Stores build artifacts for deployment

### 2. Security Scanning
- **NPM Audit** - Checks for known vulnerabilities in dependencies
- **CodeQL Analysis** - GitHub's semantic code analysis
- **Security Report** - Generates security assessment

### 3. Codegen AI Analysis
- **Automated Code Review** - AI-powered code quality assessment
- **Security Analysis** - Intelligent vulnerability detection
- **Performance Optimization** - Suggestions for improvements
- **Best Practices** - Compliance checking
- **PR Comments** - Automated feedback on pull requests

### 4. Deployment
- **Staging Deployment** - Automatic deployment to staging environment
- **Production Approval** - Manual approval gate for production
- **Blue-Green Deployment** - Zero-downtime production deployment
- **Health Checks** - Automated validation of deployed services

### 5. Post-Deployment Monitoring
- **Performance Monitoring** - 24-hour automated monitoring
- **Error Detection** - Real-time error tracking
- **User Experience** - UX monitoring and feedback
- **Optimization Recommendations** - AI-powered suggestions

## 🔧 Setup Instructions

### Prerequisites

1. **GitHub Repository** with admin access
2. **Codegen API Key** - Obtain from [Codegen Dashboard](https://app.codegen.com)
3. **Server Infrastructure** - Staging and production servers
4. **Environment Variables** - Required secrets and configurations

### Required GitHub Secrets

Add these secrets to your GitHub repository:

```bash
# Codegen Integration
CODEGEN_API_KEY=your_codegen_api_key_here

# Deployment Servers
STAGING_SERVER=staging.yourdomain.com
STAGING_SSH_KEY=your_staging_ssh_private_key
PRODUCTION_SERVER=production.yourdomain.com
PRODUCTION_SSH_KEY=your_production_ssh_private_key

# Additional API Keys (if needed)
GEMINI_API_KEY=your_gemini_api_key
GITHUB_TOKEN=your_github_token (usually auto-provided)
```

### Environment Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Zeeeepa/codegenApp.git
   cd codegenApp
   ```

2. **Install dependencies**:
   ```bash
   npm install
   cd server && npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Test local deployment**:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh start
   ```

## 🔄 Workflow Triggers

### Automatic Triggers
- **Push to `main`** - Triggers production deployment pipeline
- **Push to `develop`** - Triggers staging deployment pipeline
- **Pull Request** - Triggers build, test, and Codegen analysis

### Manual Triggers
- **Workflow Dispatch** - Manual deployment to specific environment
- **Production Approval** - Manual approval gate for production deployments

## 🤖 Codegen API Integration

### Agent Runs Created

1. **Code Analysis Agent** (`code-analyzer`)
   - Analyzes code quality and security
   - Provides improvement recommendations
   - Comments on pull requests

2. **Deployment Monitor Agent** (`deployment-monitor`)
   - Monitors deployment process
   - Validates deployment success
   - Tracks deployment metrics

3. **Production Monitor Agent** (`production-monitor`)
   - 24-hour production monitoring
   - Performance tracking
   - User experience monitoring

4. **Post-Deployment Monitor Agent** (`post-deployment-monitor`)
   - Long-term monitoring setup
   - Alert configuration
   - Optimization recommendations

### API Endpoints Used

- `POST /api/v1/agent-runs` - Create new agent runs
- `GET /api/v1/agent-runs/{id}` - Check run status
- `POST /api/v1/agent-runs/{id}/resume` - Resume paused runs

### Context Data Provided

Each agent run receives comprehensive context:
```json
{
  "repository": "Zeeeepa/codegenApp",
  "branch": "main",
  "commit_sha": "abc123...",
  "pr_number": 42,
  "build_status": "success",
  "test_results": "passed",
  "environment": "production",
  "deployment_time": "2024-01-15T10:30:00Z"
}
```

## 📊 Monitoring and Alerts

### Health Checks
- **UI Service** - `http://localhost:3002`
- **Server Service** - `http://localhost:3001/health`
- **Backend Service** - `http://localhost:8000/health`

### Monitoring Metrics
- **Response Time** - API and UI response times
- **Error Rate** - Application error frequency
- **Resource Usage** - CPU, memory, disk usage
- **User Activity** - Active users and engagement

### Alert Conditions
- **Service Down** - Any service becomes unavailable
- **High Error Rate** - Error rate exceeds 5%
- **Performance Degradation** - Response time > 2 seconds
- **Resource Exhaustion** - CPU/Memory > 80%

## 🔒 Security Features

### Code Security
- **Dependency Scanning** - NPM audit for vulnerabilities
- **Static Analysis** - CodeQL semantic analysis
- **Secret Detection** - Prevents credential leaks
- **License Compliance** - Open source license checking

### Deployment Security
- **SSH Key Authentication** - Secure server access
- **Environment Isolation** - Separate staging/production
- **Backup Creation** - Automatic backups before deployment
- **Rollback Capability** - Quick rollback on failure

## 🚀 Deployment Strategies

### Staging Deployment
- **Automatic** - Triggered on `develop` branch push
- **Fast Deployment** - Direct replacement strategy
- **Quick Validation** - Basic health checks
- **Development Testing** - Safe environment for testing

### Production Deployment
- **Manual Approval** - Requires explicit approval
- **Blue-Green Strategy** - Zero-downtime deployment
- **Comprehensive Testing** - Full health check suite
- **Gradual Rollout** - Traffic switching capability

## 📈 Performance Optimization

### Build Optimization
- **Dependency Caching** - NPM cache for faster builds
- **Parallel Jobs** - Concurrent pipeline execution
- **Artifact Reuse** - Shared build artifacts
- **Incremental Builds** - Only rebuild changed components

### Deployment Optimization
- **Asset Compression** - Gzipped static assets
- **CDN Integration** - Content delivery network
- **Database Optimization** - Connection pooling
- **Caching Strategy** - Redis/Memcached integration

## 🛠️ Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check build logs
   npm run build
   
   # Fix dependency issues
   npm ci
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Deployment Failures**
   ```bash
   # Check deployment status
   ./deploy.sh status
   
   # Restart services
   ./deploy.sh restart
   
   # View logs
   ./deploy.sh logs
   ```

3. **Codegen API Issues**
   ```bash
   # Test API connectivity
   curl -H "Authorization: Bearer $CODEGEN_API_KEY" \
        https://api.codegen.com/api/v1/agent-runs
   
   # Check API key validity
   echo $CODEGEN_API_KEY | base64 -d
   ```

### Debug Commands

```bash
# Check service status
./deploy.sh status

# View application logs
./deploy.sh logs

# Test API endpoints
curl http://localhost:3001/health
curl http://localhost:3002

# Monitor resource usage
htop
df -h
```

## 📚 Additional Resources

- [Codegen API Documentation](https://docs.codegen.com/api-reference)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Node.js Deployment Guide](https://nodejs.org/en/docs/guides/deployment/)
- [React Production Build](https://create-react-app.dev/docs/production-build/)

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch** - `git checkout -b feature/amazing-feature`
3. **Commit changes** - `git commit -m 'Add amazing feature'`
4. **Push to branch** - `git push origin feature/amazing-feature`
5. **Open Pull Request** - Codegen AI will automatically review

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Note**: This CI/CD pipeline is designed to work with the Codegen API for intelligent automation. Make sure to configure your Codegen API key and review the agent configurations to match your specific needs.
