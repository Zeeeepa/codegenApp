# GitHub App Setup Guide for github.gg

## 📋 Overview

This guide explains how to properly configure your GitHub App for the github.gg project, including installation and environment setup.

## 🔑 GitHub App Credentials

You have the following credentials (replace with your actual values):

- **Client ID**: `Iv23li9PqHMExi84gaq1`
- **App ID**: `1484403`
- **Client Secret**: `d1fbd80a53d530773b3361f23efab3732c436a7b`
- **Private Key**: `zeeeepa.2025-06-30.private-key.pem`

## 🏗️ GitHub App Configuration

### Basic Information
- **GitHub App name**: `zeeeepa` (as shown in your installation screen)
- **Description**: "GitHub repository analyzer and webhook processor for github.gg"
- **Homepage URL**: `http://localhost:3000` (for development)

### Identifying and Authorizing Users
- **Callback URL**: `http://localhost:3001/auth/github/callback`
- ✅ **Expire user authorization tokens**: Checked
- ✅ **Request user authorization (OAuth) during installation**: Checked
- ✅ **Enable Device Flow**: Checked

### Webhook Configuration
- ✅ **Active**: Checked
- **Webhook URL**: `https://webhook-gateway.pixeliumperfecto.workers.dev/api/webhooks/github`
- **Webhook Secret**: Generate a secure secret and add to your `.env`

### Required Permissions

Based on the github.gg project structure, you'll need these permissions:

**Repository permissions:**
- **Contents**: Read (to analyze repository files and structure)
- **Metadata**: Read (to access basic repository information)
- **Pull requests**: Read (to analyze PR data)
- **Issues**: Read (to analyze issue data)
- **Commit statuses**: Read (to check build/CI status)

**Account permissions:**
- **Email addresses**: Read (for user identification in OAuth)

### Subscribe to Events

For webhook functionality:
- `repository`
- `push`
- `pull_request`
- `issues`
- `release`

## 📦 Installation Instructions

### 1. Install the GitHub App

**Yes, install it on your account (Zeeeepa)** as shown in the screenshot. This will:
- Give the app access to your repositories
- Enable OAuth authentication for the github.gg application
- Allow webhook processing for repository events

### 2. Environment Setup

The project uses these environment variables (configured in `.env`):

```bash
# Codegen Configuration (existing)
REACT_APP_API_TOKEN=sk-ce027fa7-3c8d-4beb-8c86-ed8ae982ac99
REACT_APP_DEFAULT_ORGANIZATION=323
REACT_APP_API_BASE_URL=http://localhost:3001/api

# GitHub App Configuration - ACTUAL CREDENTIALS
GITHUB_CLIENT_ID=Iv23li9PqHMExi84gaq1
GITHUB_CLIENT_SECRET=d1fbd80a53d530773b3361f23efab3732c436a7b
GITHUB_APP_ID=1484403
GITHUB_PRIVATE_KEY_PATH=./zeeeepa.2025-06-30.private-key.pem
GITHUB_WEBHOOK_SECRET=pEo2ieuILHMm7lI5ziMu+j3CxUg6dR8uXNz4IZJ5xi8=

# GitHub OAuth Configuration
GITHUB_CALLBACK_URL=http://localhost:3001/auth/github/callback

# Session Configuration
SESSION_SECRET=qIf5TqCnnEvw+FfhxqpC66eU3Ih79fvgR5HNQTLogwM=

# API Server Configuration
PORT=3001
CODEGEN_API_BASE=https://api.codegen.com
FRONTEND_URL=http://localhost:8080
NODE_ENV=development
```

### 3. Private Key Setup

1. Place your `zeeeepa.2025-06-30.private-key.pem` file in the project root directory
2. Ensure the file permissions are secure:
   ```bash
   chmod 600 zeeeepa.2025-06-30.private-key.pem
   ```
3. The path is already configured in `.env` as `GITHUB_PRIVATE_KEY_PATH=./zeeeepa.2025-06-30.private-key.pem`

### 4. Install Dependencies

The project now includes GitHub App specific dependencies:

```bash
npm install
# or
bun install
```

**New dependencies added:**
- `@octokit/app` - GitHub App authentication
- `@octokit/rest` - GitHub API client
- `passport` - Authentication middleware
- `passport-github2` - GitHub OAuth strategy
- `express-session` - Session management
- `jsonwebtoken` - JWT token handling

## 🚀 Running the Application

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

   This will start:
   - API server on `http://localhost:3001`
   - React frontend on `http://localhost:8080`

3. **Open `http://localhost:8080`** and test the GitHub OAuth flow

## 🔧 How the App Uses These Credentials

### GitHub OAuth Authentication
- Uses `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` for OAuth authentication
- Users sign in with their GitHub accounts to access the repository analyzer
- Passport.js handles the OAuth flow with session management

### GitHub API Access
- Uses `GITHUB_APP_ID` and private key for GitHub App API access
- Enables repository analysis and statistics gathering
- Provides installation-based repository access

### Webhook Processing
- Receives webhooks at `/webhooks/github` endpoint
- Processes repository events (pushes, PRs, issues) for real-time updates
- Uses webhook secret for payload verification

## 🌐 API Endpoints

The GitHub App integration adds these new endpoints:

### Authentication
- `GET /auth/github` - Start GitHub OAuth flow
- `GET /auth/github/callback` - OAuth callback handler
- `GET /auth/user` - Get current authenticated user
- `POST /auth/logout` - Logout user
- `GET /auth/status` - Check authentication status

### GitHub App
- `GET /github/status` - GitHub App status and configuration
- `GET /github/installations` - User's GitHub App installations
- `GET /github/installations/:id/repositories` - Repositories for installation
- `GET /github/repositories/:owner/:repo` - Repository information
- `GET /github/repositories/:owner/:repo/analyze` - Analyze repository
- `POST /github/repositories/:owner/:repo/agent-run` - Create agent run for repo
- `GET /github/install` - Get installation URL
- `GET /github/health` - GitHub integration health check

### Webhooks
- `POST /webhooks/github` - GitHub webhook processor

## 🔒 Security Notes

- ✅ **Secrets are properly configured** with secure random values
- ✅ **Private key permissions** are set to 600 (read-only for owner)
- ✅ **Webhook signature verification** is implemented
- ✅ **Session security** with httpOnly cookies
- ✅ **CORS configuration** restricts origins
- ✅ **Environment-based configuration** keeps secrets out of code

## 🐛 Troubleshooting

### Common Issues:

1. **"GitHub App not initialized"**
   - Check that `zeeeepa.2025-06-30.private-key.pem` exists in project root
   - Verify file permissions: `ls -la zeeeepa.2025-06-30.private-key.pem`
   - Check server logs for initialization errors

2. **OAuth callback mismatch**
   - Ensure callback URL in GitHub App settings matches: `http://localhost:3001/auth/github/callback`
   - Check that the server is running on port 3001

3. **"Authentication required" errors**
   - Visit `/auth/github` to start OAuth flow
   - Check session configuration and secrets

4. **Webhook failures**
   - Verify webhook URL is accessible from GitHub
   - Check webhook secret matches environment variable
   - Review webhook delivery logs in GitHub App settings

### Testing:

1. **Test OAuth flow:**
   ```bash
   curl http://localhost:3001/auth/status
   ```

2. **Test GitHub App status:**
   ```bash
   curl http://localhost:3001/github/status
   ```

3. **Test health check:**
   ```bash
   curl http://localhost:3001/github/health
   ```

4. **View all endpoints:**
   ```bash
   curl http://localhost:3001/
   ```

## 📊 Monitoring and Logs

The GitHub App integration includes comprehensive logging:

- **Authentication events** (OAuth success/failure)
- **GitHub API calls** (rate limiting, errors)
- **Webhook processing** (events, signatures, errors)
- **Repository analysis** (performance, errors)

Check the server logs for detailed information:
```bash
tail -f api/logs/combined.log
```

## 🎯 Next Steps

1. **Install the GitHub App** on your account
2. **Test the OAuth flow** by visiting the frontend
3. **Analyze a repository** using the new endpoints
4. **Set up webhook URL** for real-time events
5. **Integrate with Codegen agent runs** for repository-based automation

## 🔗 Useful Links

- [GitHub App Settings](https://github.com/settings/apps/zeeeepa)
- [Installation Management](https://github.com/apps/zeeeepa/installations)
- [Webhook Deliveries](https://github.com/settings/apps/zeeeepa/advanced)
- [GitHub App Documentation](https://docs.github.com/en/developers/apps)
