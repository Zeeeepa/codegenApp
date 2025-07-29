# Environment Setup Guide

This document explains how to configure the environment variables for the CodegenApp.

## 🔧 Configuration Methods

### Method 1: Settings UI (Recommended)
1. Start the application
2. Click the Settings icon in the top-right corner
3. Configure your API keys in the respective tabs:
   - **API Settings**: Codegen API token and organization ID
   - **GitHub**: GitHub personal access token
   - **AI Services**: Gemini API key for web evaluation
   - **Cloudflare**: API key, account ID, and worker configuration

### Method 2: Environment File
Copy the `.env` file and replace the placeholder values with your actual credentials.

## 🔑 Required API Keys

### Codegen API
- **Organization ID**: Configure via Settings UI
- **API Token**: Configure via Settings UI

### GitHub Integration
- **Token**: Configure via Settings UI (requires repo and read:user permissions)
- **Repositories**: grainchain, codegenApp

### AI Services (Web Evaluation)
- **Gemini API Key**: Configure via Settings UI

### Cloudflare Configuration
- **API Key**: Configure via Settings UI
- **Account ID**: Configure via Settings UI
- **Worker Name**: `webhook-gateway`
- **Worker URL**: `https://webhook-gateway.pixeliumperfecto.workers.dev`

## 🚀 Quick Start

1. **Configure via Settings UI**:
   ```bash
   npm start
   # Open http://localhost:3000
   # Click Settings → Configure your API keys
   ```

2. **Test Connections**:
   - Each API key field has a "Test" button
   - Green checkmark = successful connection
   - Red X = connection failed

3. **Save Settings**:
   - Settings are stored locally in your browser
   - They persist between sessions
   - Export to .env format available

## 🔒 Security Notes

- API keys are stored locally in browser localStorage
- Keys are never sent to external servers except for connection testing
- Use the Settings UI for secure credential management
- The .env file contains only placeholder values for security

## 🧪 Testing Components

All new components are automatically tested with web-eval-agent using the configured Gemini API key. The testing includes:

- Functionality verification
- UI component interaction
- API integration testing
- Accessibility compliance
- Performance metrics

## 📝 Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `CODEGEN_API_KEY` | Codegen API token | Yes | - |
| `CODEGEN_ORG_ID` | Codegen organization ID | Yes | - |
| `GITHUB_TOKEN` | GitHub personal access token | Yes | - |
| `GEMINI_API_KEY` | Google Gemini API key | Yes | - |
| `CLOUDFLARE_API_KEY` | Cloudflare API token | Yes | - |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID | Yes | - |
| `CLOUDFLARE_WORKER_NAME` | Webhook worker name | No | `webhook-gateway` |
| `CLOUDFLARE_WORKER_URL` | Webhook worker URL | No | `https://webhook-gateway.pixeliumperfecto.workers.dev` |

## 🔧 Troubleshooting

### Connection Test Failures
1. **GitHub 401 Error**: Check token permissions (repo, read:user)
2. **Gemini API Error**: Verify API key is valid and has quota
3. **Cloudflare Error**: Ensure account ID matches the API key

### Settings Not Persisting
1. Check browser localStorage is enabled
2. Clear browser cache and reconfigure
3. Verify no browser extensions are blocking storage

### API Integration Issues
1. Check network connectivity
2. Verify API endpoints are accessible
3. Review browser console for detailed error messages
